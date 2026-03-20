import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outreachLog, favorites } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

// Log an outreach action
export async function POST(req: NextRequest) {
  try {
    const { creatorId, action, details } = await req.json();
    const now = new Date().toISOString();

    const result = db
      .insert(outreachLog)
      .values({ creatorId, action, details, createdAt: now })
      .returning()
      .get();

    // Update last contacted timestamp on the favorite
    if (["dm_sent", "email_sent", "ig_messaged", "call"].includes(action)) {
      db.update(favorites)
        .set({ lastContactedAt: now, updatedAt: now })
        .where(eq(favorites.creatorId, creatorId))
        .run();
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get outreach history for a creator
export async function GET(req: NextRequest) {
  try {
    const creatorId = req.nextUrl.searchParams.get("creatorId");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    const conditions = creatorId
      ? eq(outreachLog.creatorId, creatorId)
      : undefined;

    const results = db
      .select()
      .from(outreachLog)
      .where(conditions)
      .orderBy(desc(outreachLog.createdAt))
      .limit(limit)
      .all();

    return NextResponse.json({ data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
