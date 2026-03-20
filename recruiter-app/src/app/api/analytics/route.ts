import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  creators,
  favorites,
  outreachLog,
} from "@/lib/schema";
import { sql, eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalCreatorsRow] = await db
      .select({ count: count() })
      .from(creators);
    const totalCreators = totalCreatorsRow?.count || 0;

    const [totalFavoritesRow] = await db
      .select({ count: count() })
      .from(favorites);
    const totalFavorites = totalFavoritesRow?.count || 0;

    const pipelineStats = await db
      .select({
        status: favorites.status,
        count: count(),
      })
      .from(favorites)
      .groupBy(favorites.status);

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const recentOutreach = await db
      .select({
        action: outreachLog.action,
        count: count(),
      })
      .from(outreachLog)
      .where(sql`${outreachLog.createdAt} >= ${sevenDaysAgo}`)
      .groupBy(outreachLog.action);

    const [withInstagramRow] = await db
      .select({ count: count() })
      .from(creators)
      .where(eq(creators.hasInstagram, true));
    const withInstagram = withInstagramRow?.count || 0;

    const pipelineMap = Object.fromEntries(
      pipelineStats.map((s) => [s.status, s.count])
    );
    const contacted = pipelineMap.contacted || 0;
    const responded = pipelineMap.responded || 0;
    const signed = pipelineMap.signed || 0;

    return NextResponse.json({
      totalCreators,
      totalFavorites,
      withInstagram,
      pipelineStats: pipelineMap,
      recentOutreach: Object.fromEntries(
        recentOutreach.map((s) => [s.action, s.count])
      ),
      conversionRates: {
        contactToResponse:
          contacted > 0 ? (responded / contacted) * 100 : 0,
        responseToSigned:
          responded > 0 ? (signed / responded) * 100 : 0,
        overallConversion:
          totalFavorites > 0 ? (signed / totalFavorites) * 100 : 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
