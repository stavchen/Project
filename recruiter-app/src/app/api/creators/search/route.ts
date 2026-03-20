import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creators, favorites, creatorTags } from "@/lib/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Enrich creators with favorite status and tags */
async function enrichCreators(results: any[]) {
  return Promise.all(
    results.map(async (p) => {
      try {
        const [fav] = await db
          .select()
          .from(favorites)
          .where(eq(favorites.creatorId, p.id))
          .limit(1);
        const ctags = await db
          .select()
          .from(creatorTags)
          .where(eq(creatorTags.creatorId, p.id));
        return {
          ...p,
          favorite: fav || null,
          tagIds: ctags.map((t) => t.tagId),
        };
      } catch {
        return { ...p, favorite: null, tagIds: [] };
      }
    })
  );
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const query = params.get("query") || "";
    const limit = parseInt(params.get("limit") || "20");
    const sort = params.get("sort") || "newest";
    const hasInstagram = params.get("hasInstagram") === "true";
    const isFree = params.get("isFree");
    const minSubscribers = params.get("minSubscribers");
    const maxSubscribers = params.get("maxSubscribers");
    const creatorsOnly = params.get("creatorsOnly") === "true";
    const hasProfilePic = params.get("hasProfilePic") === "true";

    // Parse page token
    const pageToken = params.get("page") || "";
    let offset = 0;
    if (pageToken.startsWith("offset:")) {
      offset = parseInt(pageToken.slice(7));
    } else if (pageToken) {
      offset = parseInt(pageToken) || 0;
    }

    // Build WHERE conditions
    const conditions = [];
    if (query) {
      conditions.push(
        sql`(${creators.username} ILIKE ${"%" + query + "%"} OR ${creators.displayName} ILIKE ${"%" + query + "%"} OR ${creators.bio} ILIKE ${"%" + query + "%"} OR ${creators.location} ILIKE ${"%" + query + "%"})`
      );
    }
    if (hasInstagram) conditions.push(eq(creators.hasInstagram, true));
    if (isFree === "true") conditions.push(eq(creators.isFree, true));
    else if (isFree === "false") conditions.push(eq(creators.isFree, false));
    if (minSubscribers)
      conditions.push(sql`${creators.subscriberCount} >= ${parseInt(minSubscribers)}`);
    if (maxSubscribers)
      conditions.push(sql`${creators.subscriberCount} <= ${parseInt(maxSubscribers)}`);
    if (creatorsOnly) conditions.push(eq(creators.isPerformer, true));
    if (hasProfilePic) conditions.push(sql`${creators.avatarUrl} IS NOT NULL`);

    const orderBy =
      sort === "newest"
        ? desc(creators.joinedAt)
        : sort === "oldest"
          ? asc(creators.joinedAt)
          : sort === "subscribers"
            ? desc(creators.subscriberCount)
            : desc(creators.joinedAt);

    const results = await db
      .select()
      .from(creators)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const enriched = await enrichCreators(results);
    const nextOffset = offset + limit;

    return NextResponse.json({
      data: enriched,
      nextPage: results.length === limit ? `offset:${nextOffset}` : null,
      hasMore: results.length === limit,
    });
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
