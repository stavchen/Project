import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creators, favorites, creatorTags } from "@/lib/schema";
import { searchCreators } from "@/lib/onlyfans-api";
import { eq, desc, asc, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const query = params.get("query") || "";
    const cursor = params.get("cursor") || undefined;
    const offset = parseInt(params.get("offset") || "0");
    const limit = parseInt(params.get("limit") || "20");
    const sort = params.get("sort") || "newest";
    const hasInstagram = params.get("hasInstagram") === "true";
    const isFree = params.get("isFree");
    const minSubscribers = params.get("minSubscribers");
    const maxSubscribers = params.get("maxSubscribers");
    const source = params.get("source") || "api";
    const creatorsOnly = params.get("creatorsOnly") === "true";
    const hasProfilePic = params.get("hasProfilePic") === "true";

    if (source === "api") {
      const needsFiltering =
        creatorsOnly || hasProfilePic || hasInstagram || isFree === "true" || isFree === "false";

      // Keep fetching pages until we have enough filtered results
      const collected: any[] = [];
      let currentCursor = cursor;
      let lastNextCursor: string | null = null;
      let totalResults = 0;
      let credits: any = null;
      const maxPages = needsFiltering ? 10 : 1; // fetch up to 10 pages when filtering

      for (let page = 0; page < maxPages; page++) {
        const result = await searchCreators({
          query: query || undefined,
          cursor: currentCursor,
          limit: 50, // fetch larger batches when filtering
          sort:
            sort === "newest"
              ? "join_date"
              : sort === "subscribers"
                ? "favorited_count"
                : undefined,
        });

        totalResults = result.totalResults;
        credits = result.credits;
        lastNextCursor = result.nextCursor;

        // Cache all results in local DB
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
            }
          } catch (dbErr) {
            console.error("DB upsert error:", dbErr);
          }
        }

        // Apply all filters
        let batch = result.profiles;
        if (creatorsOnly) {
          batch = batch.filter((p) => p.isPerformer);
        }
        if (hasProfilePic) {
          batch = batch.filter((p) => !!p.avatarUrl);
        }
        if (hasInstagram) {
          batch = batch.filter((p) => p.hasInstagram);
        }
        if (isFree === "true") {
          batch = batch.filter((p) => p.isFree);
        } else if (isFree === "false") {
          batch = batch.filter((p) => !p.isFree);
        }

        collected.push(...batch);

        // Stop if we have enough or no more pages
        if (collected.length >= limit || !result.nextCursor) break;
        currentCursor = result.nextCursor;
      }

      // Trim to requested limit
      const pageResults = collected.slice(0, limit);

      // Enrich with favorite status and tags
      const enriched = await Promise.all(
        pageResults.map(async (p) => {
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

      return NextResponse.json({
        data: enriched,
        nextCursor: lastNextCursor,
        hasMore: !!lastNextCursor,
        totalResults,
        credits,
      });
    }

    // Source = cache: query local DB
    const conditions = [];
    if (query) {
      conditions.push(
        sql`(${creators.username} ILIKE ${"%" + query + "%"} OR ${creators.displayName} ILIKE ${"%" + query + "%"} OR ${creators.bio} ILIKE ${"%" + query + "%"} OR ${creators.location} ILIKE ${"%" + query + "%"})`
      );
    }
    if (hasInstagram) {
      conditions.push(eq(creators.hasInstagram, true));
    }
    if (isFree === "true") {
      conditions.push(eq(creators.isFree, true));
    } else if (isFree === "false") {
      conditions.push(eq(creators.isFree, false));
    }
    if (minSubscribers) {
      conditions.push(
        sql`${creators.subscriberCount} >= ${parseInt(minSubscribers)}`
      );
    }
    if (maxSubscribers) {
      conditions.push(
        sql`${creators.subscriberCount} <= ${parseInt(maxSubscribers)}`
      );
    }
    if (creatorsOnly) {
      conditions.push(eq(creators.isPerformer, true));
    }
    if (hasProfilePic) {
      conditions.push(sql`${creators.avatarUrl} IS NOT NULL`);
    }

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

    const enriched = await Promise.all(
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

    return NextResponse.json({
      data: enriched,
      nextOffset: offset + limit,
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
