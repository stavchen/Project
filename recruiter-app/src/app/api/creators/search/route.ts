import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creators, favorites, creatorTags } from "@/lib/schema";
import { searchCreators, transformProfile } from "@/lib/onlyfans-api";
import { eq, like, desc, asc, and, sql, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const query = params.get("query") || "";
    const offset = parseInt(params.get("offset") || "0");
    const limit = parseInt(params.get("limit") || "20");
    const sort = params.get("sort") || "newest";
    const hasInstagram = params.get("hasInstagram") === "true";
    const isFree = params.get("isFree");
    const minSubscribers = params.get("minSubscribers");
    const maxSubscribers = params.get("maxSubscribers");
    const source = params.get("source") || "api"; // api | cache

    if (source === "api") {
      // Fetch from external API
      const result = await searchCreators({
        query,
        offset,
        limit,
        sort: sort === "newest" ? "joinDate" : sort === "subscribers" ? "subscribersCount" : undefined,
      });

      // Cache results in local DB (upsert)
      for (const profile of result.profiles) {
        const existing = db
          .select()
          .from(creators)
          .where(eq(creators.id, profile.id))
          .get();
        if (existing) {
          db.update(creators)
            .set({ ...profile, fetchedAt: new Date().toISOString() })
            .where(eq(creators.id, profile.id))
            .run();
        } else {
          db.insert(creators).values(profile).run();
        }
      }

      // Enrich with favorite status
      const enriched = result.profiles.map((p) => {
        const fav = db
          .select()
          .from(favorites)
          .where(eq(favorites.creatorId, p.id))
          .get();
        const ctags = db
          .select()
          .from(creatorTags)
          .where(eq(creatorTags.creatorId, p.id))
          .all();
        return {
          ...p,
          favorite: fav || null,
          tagIds: ctags.map((t) => t.tagId),
        };
      });

      return NextResponse.json({
        data: enriched,
        nextOffset: offset + limit,
        hasMore: result.profiles.length === limit,
      });
    }

    // Source = cache: query local DB
    const conditions = [];
    if (query) {
      conditions.push(
        sql`(${creators.username} LIKE ${"%" + query + "%"} OR ${creators.displayName} LIKE ${"%" + query + "%"} OR ${creators.bio} LIKE ${"%" + query + "%"} OR ${creators.location} LIKE ${"%" + query + "%"})`
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

    const orderBy =
      sort === "newest"
        ? desc(creators.joinedAt)
        : sort === "oldest"
          ? asc(creators.joinedAt)
          : sort === "subscribers"
            ? desc(creators.subscriberCount)
            : desc(creators.joinedAt);

    const results = db
      .select()
      .from(creators)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)
      .all();

    const enriched = results.map((p) => {
      const fav = db
        .select()
        .from(favorites)
        .where(eq(favorites.creatorId, p.id))
        .get();
      const ctags = db
        .select()
        .from(creatorTags)
        .where(eq(creatorTags.creatorId, p.id))
        .all();
      return { ...p, favorite: fav || null, tagIds: ctags.map((t) => t.tagId) };
    });

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
