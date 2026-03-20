import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outreachLog, favorites } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { creatorId, action, details } = await req.json();
    const now = new Date().toISOString();

    const [result] = await db
      .insert(outreachLog)
      .values({ creatorId, action, details, createdAt: now })
      .returning();

    if (["dm_sent", "email_sent", "ig_messaged", "call"].includes(action)) {
      await db
        .update(favorites)
        .set({ lastContactedAt: now, updatedAt: now })
        .where(eq(favorites.creatorId, creatorId));
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const creatorId = req.nextUrl.searchParams.get("creatorId");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    const conditions = creatorId
      ? eq(outreachLog.creatorId, creatorId)
      : undefined;

    const results = await db
      .select()
      .from(outreachLog)
      .where(conditions)
      .orderBy(desc(outreachLog.createdAt))
      .limit(limit);

    return NextResponse.json({ data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
