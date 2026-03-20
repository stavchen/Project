import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outreachLog, creators } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    const results = await db
      .select()
      .from(outreachLog)
      .innerJoin(creators, eq(outreachLog.creatorId, creators.id))
      .orderBy(desc(outreachLog.createdAt))
      .limit(limit);

    const feed = results.map((r) => ({
      id: r.outreach_log.id,
      action: r.outreach_log.action,
      details: r.outreach_log.details,
      createdAt: r.outreach_log.createdAt,
      creator: {
        id: r.creators.id,
        username: r.creators.username,
        displayName: r.creators.displayName,
        avatarUrl: r.creators.avatarUrl,
      },
    }));

    return NextResponse.json({ data: feed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
