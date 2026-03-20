import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { favorites, creators, creatorTags, outreachLog } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

// List all favorites, optionally filtered by status
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const conditions = status ? eq(favorites.status, status as any) : undefined;

    const results = db
      .select()
      .from(favorites)
      .innerJoin(creators, eq(favorites.creatorId, creators.id))
      .where(conditions)
      .orderBy(desc(favorites.updatedAt))
      .all();

    const enriched = results.map((r) => {
      const ctags = db
        .select()
        .from(creatorTags)
        .where(eq(creatorTags.creatorId, r.creators.id))
        .all();
      return {
        ...r.creators,
        favorite: r.favorites,
        tagIds: ctags.map((t) => t.tagId),
      };
    });

    return NextResponse.json({ data: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Add a creator to favorites
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorId, status = "discovered", notes = "" } = body;

    // Check if already favorited
    const existing = db
      .select()
      .from(favorites)
      .where(eq(favorites.creatorId, creatorId))
      .get();

    if (existing) {
      return NextResponse.json(
        { error: "Already favorited", favorite: existing },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const result = db
      .insert(favorites)
      .values({
        creatorId,
        status,
        notes,
        addedAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    // Log the action
    db.insert(outreachLog)
      .values({
        creatorId,
        action: "status_change",
        details: `Added to pipeline as "${status}"`,
        createdAt: now,
      })
      .run();

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update favorite status/notes
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorId, status, notes } = body;

    const now = new Date().toISOString();
    const updates: any = { updatedAt: now };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (status === "contacted") updates.lastContactedAt = now;

    const result = db
      .update(favorites)
      .set(updates)
      .where(eq(favorites.creatorId, creatorId))
      .returning()
      .get();

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Log status change
    if (status) {
      db.insert(outreachLog)
        .values({
          creatorId,
          action: "status_change",
          details: `Status changed to "${status}"`,
          createdAt: now,
        })
        .run();
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Remove from favorites
export async function DELETE(req: NextRequest) {
  try {
    const { creatorId } = await req.json();
    db.delete(favorites).where(eq(favorites.creatorId, creatorId)).run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
