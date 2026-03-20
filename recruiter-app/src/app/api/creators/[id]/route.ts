import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  creators,
  favorites,
  creatorTags,
  outreachLog,
  tags,
} from "@/lib/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [creator] = await db
      .select()
      .from(creators)
      .where(eq(creators.id, params.id))
      .limit(1);

    if (!creator) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [fav] = await db
      .select()
      .from(favorites)
      .where(eq(favorites.creatorId, params.id))
      .limit(1);

    const ctags = await db
      .select()
      .from(creatorTags)
      .where(eq(creatorTags.creatorId, params.id));

    const tagIds = ctags.map((ct) => ct.tagId);
    const tagDetails =
      tagIds.length > 0
        ? await db
            .select()
            .from(tags)
            .where(inArray(tags.id, tagIds))
        : [];

    const history = await db
      .select()
      .from(outreachLog)
      .where(eq(outreachLog.creatorId, params.id))
      .orderBy(desc(outreachLog.createdAt));

    return NextResponse.json({
      ...creator,
      favorite: fav || null,
      tags: tagDetails,
      tagIds,
      outreachHistory: history,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
