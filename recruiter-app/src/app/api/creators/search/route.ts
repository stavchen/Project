import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creators, favorites, creatorTags } from "@/lib/schema";
import { searchCreators } from "@/lib/onlyfans-api";
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

/** Fetch one API page and cache all results in the local DB. Returns the next cursor. */
async function fetchAndCacheApiPage(
  query: string,
  sort: string,
  cursor?: string
): Promise<{ nextCursor: string | null; count: number }> {
  const result = await searchCreators({
    query: query || undefined,
    cursor,
    limit: 50,
    sort:
      sort === "newest"
        ? "join_date"
        : sort === "subscribers"
          ? "favorited_count"
          : undefined,
  });

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

  return { nextCursor: result.nextCursor, count: result.profiles.length };
}

function buildCacheConditions({
  query,
  hasInstagram,
  isFree,
  minSubscribers,
  maxSubscribers,
  creatorsOnly,
  hasProfilePic,
}: {
  query: string;
  hasInstagram: boolean;
  isFree: string | null;
  minSubscribers: string | null;
  maxSubscribers: string | null;
  creatorsOnly: boolean;
  hasProfilePic: boolean;
}) {
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
  return conditions;
}

function buildOrderBy(sort: string) {
  return sort === "newest"
    ? desc(creators.joinedAt)
    : sort === "oldest"
      ? asc(creators.joinedAt)
      : sort === "subscribers"
        ? desc(creators.subscriberCount)
        : desc(creators.joinedAt);
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
    const rawSource = params.get("source") || "api";
    const creatorsOnly = params.get("creatorsOnly") === "true";
    const hasProfilePic = params.get("hasProfilePic") === "true";

    const pageToken = params.get("page") || "";

    // Instagram data isn't available in API search results — force cache mode
    const source = hasInstagram ? "cache" : rawSource;

    const filterOpts = {
      query,
      hasInstagram,
      isFree,
      minSubscribers,
      maxSubscribers,
      creatorsOnly,
      hasProfilePic,
    };

    // ── Cache mode (for Instagram filter or explicit cache source) ──
    // Uses the local DB as the primary source but backfills from the API
    // when the cache runs out, so scrolling never stops.
    //
    // Page token format: "offset:123" or "offset:123:cursor:ABC"
    // The cursor part tracks where we left off in the API for backfilling.
    if (source === "cache") {
      let offset = 0;
      let backfillCursor: string | undefined;

      if (pageToken.startsWith("offset:")) {
        const parts = pageToken.split(":cursor:");
        offset = parseInt(parts[0].slice(7));
        if (parts[1]) backfillCursor = parts[1];
      } else {
        offset = parseInt(params.get("offset") || "0");
      }

      const conditions = buildCacheConditions(filterOpts);
      const orderBy = buildOrderBy(sort);

      let results = await db
        .select()
        .from(creators)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // If cache didn't return enough results, backfill from the API
      // Fetch up to 5 API pages to grow the cache, then re-query
      if (results.length < limit && backfillCursor !== "exhausted") {
        let cursor = backfillCursor;
        for (let i = 0; i < 5; i++) {
          const page = await fetchAndCacheApiPage(query, sort, cursor);
          cursor = page.nextCursor || undefined;
          if (!cursor) {
            // API fully exhausted, mark it so we don't try again
            backfillCursor = "exhausted";
            break;
          }
          backfillCursor = cursor;
        }

        // Re-query the now-larger cache
        results = await db
          .select()
          .from(creators)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset);
      }

      const enriched = await enrichCreators(results);
      const nextOffset = offset + limit;

      // Build next page token preserving the backfill cursor
      let nextPage: string | null = null;
      if (results.length === limit) {
        nextPage = `offset:${nextOffset}`;
        if (backfillCursor) nextPage += `:cursor:${backfillCursor}`;
      } else if (backfillCursor && backfillCursor !== "exhausted") {
        // Got fewer results but API still has more — keep going
        nextPage = `offset:${nextOffset}:cursor:${backfillCursor}`;
      }

      return NextResponse.json({
        data: enriched,
        nextPage,
        hasMore: !!nextPage,
      });
    }

    // ── API mode ──
    // Fetch exactly ONE API page per request to conserve the cursor.
    // If filters remove all results, we still return the cursor so the
    // frontend auto-fetches the next page — truly infinite scrolling.
    let apiCursor: string | undefined;
    if (pageToken.startsWith("cursor:")) {
      apiCursor = pageToken.slice(7);
    } else {
      apiCursor = params.get("cursor") || undefined;
    }

    const result = await searchCreators({
      query: query || undefined,
      cursor: apiCursor,
      limit: 50,
      sort:
        sort === "newest"
          ? "join_date"
          : sort === "subscribers"
            ? "favorited_count"
            : undefined,
    });

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

    // Apply filters
    let filtered = result.profiles;
    if (creatorsOnly) filtered = filtered.filter((p) => p.isPerformer);
    if (hasProfilePic) filtered = filtered.filter((p) => !!p.avatarUrl);
    if (isFree === "true") filtered = filtered.filter((p) => p.isFree);
    else if (isFree === "false") filtered = filtered.filter((p) => !p.isFree);
    if (minSubscribers) {
      const min = parseInt(minSubscribers);
      filtered = filtered.filter((p) => (p.subscriberCount || 0) >= min);
    }
    if (maxSubscribers) {
      const max = parseInt(maxSubscribers);
      filtered = filtered.filter((p) => (p.subscriberCount || 0) <= max);
    }

    const enriched = await enrichCreators(filtered);

    return NextResponse.json({
      data: enriched,
      nextPage: result.nextCursor ? `cursor:${result.nextCursor}` : null,
      hasMore: !!result.nextCursor,
      totalResults: result.totalResults,
      credits: result.credits,
    });
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
