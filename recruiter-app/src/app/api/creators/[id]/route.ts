import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creators, favorites, creatorTags, outreachLog, tags } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const creator = db
      .select()
      .from(creators)
      .where(eq(creators.id, params.id))
      .get();

    if (!creator) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fav = db
      .select()
      .from(favorites)
      .where(eq(favorites.creatorId, params.id))
      .get();

    const ctags = db
      .select()
      .from(creatorTags)
      .where(eq(creatorTags.creatorId, params.id))
      .all();

    const tagDetails = ctags.length > 0
      ? db
          .select()
          .from(tags)
          .where(eq(tags.id, ctags[0].tagId)) // simplified
          .all()
      : [];

    const history = db
      .select()
      .from(outreachLog)
      .where(eq(outreachLog.creatorId, params.id))
      .all();

    return NextResponse.json({
      ...creator,
      favorite: fav || null,
      tags: tagDetails,
      outreachHistory: history,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
