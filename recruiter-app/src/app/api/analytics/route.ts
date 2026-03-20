import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creators, favorites, outreachLog, tags, creatorTags } from "@/lib/schema";
import { sql, eq, count } from "drizzle-orm";

export async function GET() {
  try {
    // Total creators cached
    const totalCreators = db
      .select({ count: count() })
      .from(creators)
      .get()?.count || 0;

    // Total favorites
    const totalFavorites = db
      .select({ count: count() })
      .from(favorites)
      .get()?.count || 0;

    // Pipeline breakdown
    const pipelineStats = db
      .select({
        status: favorites.status,
        count: count(),
      })
      .from(favorites)
      .groupBy(favorites.status)
      .all();

    // Outreach stats (last 7 days)
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const recentOutreach = db
      .select({
        action: outreachLog.action,
        count: count(),
      })
      .from(outreachLog)
      .where(sql`${outreachLog.createdAt} >= ${sevenDaysAgo}`)
      .groupBy(outreachLog.action)
      .all();

    // Creators with Instagram
    const withInstagram = db
      .select({ count: count() })
      .from(creators)
      .where(eq(creators.hasInstagram, true))
      .get()?.count || 0;

    // Conversion rates
    const contacted = pipelineStats.find((s) => s.status === "contacted")?.count || 0;
    const responded = pipelineStats.find((s) => s.status === "responded")?.count || 0;
    const signed = pipelineStats.find((s) => s.status === "signed")?.count || 0;

    return NextResponse.json({
      totalCreators,
      totalFavorites,
      withInstagram,
      pipelineStats: Object.fromEntries(
        pipelineStats.map((s) => [s.status, s.count])
      ),
      recentOutreach: Object.fromEntries(
        recentOutreach.map((s) => [s.action, s.count])
      ),
      conversionRates: {
        contactToResponse: contacted > 0 ? (responded / contacted) * 100 : 0,
        responseToSigned: responded > 0 ? (signed / responded) * 100 : 0,
        overallConversion: totalFavorites > 0 ? (signed / totalFavorites) * 100 : 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
