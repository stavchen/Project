import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creators, syncState } from "@/lib/schema";
import { searchCreators } from "@/lib/onlyfans-api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for serverless

const SYNC_ID = "creators";
const BATCH_SIZE = 50;
// Fetch this many API pages per request to stay within serverless timeout
const PAGES_PER_RUN = 20;

/** GET: return current sync status */
export async function GET() {
  try {
    const [state] = await db
      .select()
      .from(syncState)
      .where(eq(syncState.id, SYNC_ID))
      .limit(1);

    if (!state) {
      return NextResponse.json({
        status: "idle",
        totalSynced: 0,
        cursor: null,
        updatedAt: null,
      });
    }

    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST: start or resume sync. Fetches PAGES_PER_RUN pages then returns. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const reset = body.reset === true;

    // Get or create sync state
    let [state] = await db
      .select()
      .from(syncState)
      .where(eq(syncState.id, SYNC_ID))
      .limit(1);

    if (!state) {
      await db.insert(syncState).values({
        id: SYNC_ID,
        cursor: null,
        totalSynced: 0,
        status: "idle",
        startedAt: null,
        updatedAt: new Date().toISOString(),
        error: null,
      });
      [state] = await db
        .select()
        .from(syncState)
        .where(eq(syncState.id, SYNC_ID))
        .limit(1);
    }

    if (reset) {
      await db
        .update(syncState)
        .set({
          cursor: null,
          totalSynced: 0,
          status: "idle",
          error: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(syncState.id, SYNC_ID));
      state = { ...state, cursor: null, totalSynced: 0, status: "idle" };
    }

    if (state.status === "done" && !reset) {
      return NextResponse.json({
        ...state,
        message: "Sync already complete. Send { reset: true } to re-sync.",
      });
    }

    // Mark running
    const now = new Date().toISOString();
    await db
      .update(syncState)
      .set({
        status: "running",
        startedAt: state.status !== "running" ? now : state.startedAt,
        updatedAt: now,
        error: null,
      })
      .where(eq(syncState.id, SYNC_ID));

    let cursor = state.cursor || undefined;
    let totalSynced = state.totalSynced || 0;
    let pagesThisRun = 0;

    for (let i = 0; i < PAGES_PER_RUN; i++) {
      const result = await searchCreators({
        cursor,
        limit: BATCH_SIZE,
        sort: "join_date",
      });

      // Upsert all profiles
      for (const profile of result.profiles) {
        try {
          const [existing] = await db
            .select({ id: creators.id })
            .from(creators)
            .where(eq(creators.id, profile.id))
            .limit(1);

          if (existing) {
            await db
              .update(creators)
              .set({ ...profile, fetchedAt: new Date().toISOString() })
              .where(eq(creators.id, profile.id));
          } else {
            await db.insert(creators).values(profile);
            totalSynced++;
          }
        } catch (dbErr) {
          console.error("DB upsert error:", dbErr);
        }
      }

      pagesThisRun++;
      cursor = result.nextCursor || undefined;

      // Update progress
      await db
        .update(syncState)
        .set({
          cursor: cursor || null,
          totalSynced,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(syncState.id, SYNC_ID));

      // API exhausted
      if (!cursor) {
        await db
          .update(syncState)
          .set({ status: "done", updatedAt: new Date().toISOString() })
          .where(eq(syncState.id, SYNC_ID));

        return NextResponse.json({
          status: "done",
          totalSynced,
          pagesThisRun,
          message: "Sync complete — all creators loaded.",
        });
      }
    }

    // Paused — more pages to go, call again to continue
    await db
      .update(syncState)
      .set({ status: "paused", updatedAt: new Date().toISOString() })
      .where(eq(syncState.id, SYNC_ID));

    return NextResponse.json({
      status: "paused",
      totalSynced,
      pagesThisRun,
      message: `Synced ${pagesThisRun} pages (${totalSynced} new creators). Call again to continue.`,
    });
  } catch (error: any) {
    // Record the error
    try {
      await db
        .update(syncState)
        .set({
          status: "error",
          error: error.message,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(syncState.id, SYNC_ID));
    } catch {}

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
