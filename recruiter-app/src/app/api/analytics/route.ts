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

    // Debug: check how many creators have instagram-related data in their fields
    const [websiteHasIg] = await db
      .select({ count: count() })
      .from(creators)
      .where(sql`${creators.website} ILIKE '%instagram%'`);
    const [bioHasIg] = await db
      .select({ count: count() })
      .from(creators)
      .where(sql`${creators.bio} ILIKE '%instagram%' OR ${creators.bio} ILIKE '%ig:%' OR ${creators.bio} ILIKE '%ig @%' OR ${creators.bio} ILIKE '%insta:%' OR ${creators.bio} ILIKE '%insta @%'`);
    const [rawHasIg] = await db
      .select({ count: count() })
      .from(creators)
      .where(sql`${creators.rawJson} LIKE '%"instagram"%'`);
    const [hasWebsite] = await db
      .select({ count: count() })
      .from(creators)
      .where(sql`${creators.website} IS NOT NULL AND ${creators.website} != ''`);

    // Sample 5 raw websites for debugging
    const sampleWebsites = await db
      .select({ id: creators.id, website: creators.website, bio: creators.bio })
      .from(creators)
      .where(sql`${creators.website} IS NOT NULL AND ${creators.website} != ''`)
      .limit(10);

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
      debug_instagram: {
        websiteContainsInstagram: websiteHasIg?.count || 0,
        bioContainsInstagram: bioHasIg?.count || 0,
        rawJsonContainsInstagram: rawHasIg?.count || 0,
        creatorsWithWebsite: hasWebsite?.count || 0,
        sampleWebsites: sampleWebsites.map(s => ({ id: s.id, website: s.website, bioSnippet: s.bio?.slice(0, 200) })),
      },
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
