import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { favorites, creators, creatorTags, outreachLog } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const conditions = status ? eq(favorites.status, status) : undefined;

    const results = await db
      .select()
      .from(favorites)
      .innerJoin(creators, eq(favorites.creatorId, creators.id))
      .where(conditions)
      .orderBy(desc(favorites.updatedAt));

    const enriched = await Promise.all(
      results.map(async (r) => {
        const ctags = await db
          .select()
          .from(creatorTags)
          .where(eq(creatorTags.creatorId, r.creators.id));
        return {
          ...r.creators,
          favorite: r.favorites,
          tagIds: ctags.map((t) => t.tagId),
        };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorId, status = "discovered", notes = "" } = body;

    const [existing] = await db
      .select()
      .from(favorites)
      .where(eq(favorites.creatorId, creatorId))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Already favorited", favorite: existing },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const [result] = await db
      .insert(favorites)
      .values({ creatorId, status, notes, addedAt: now, updatedAt: now })
      .returning();

    await db.insert(outreachLog).values({
      creatorId,
      action: "status_change",
      details: `Added to pipeline as "${status}"`,
      createdAt: now,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorId, status, notes } = body;

    const now = new Date().toISOString();
    const updates: any = { updatedAt: now };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (status === "contacted") updates.lastContactedAt = now;

    const [result] = await db
      .update(favorites)
      .set(updates)
      .where(eq(favorites.creatorId, creatorId))
      .returning();

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (status) {
      await db.insert(outreachLog).values({
        creatorId,
        action: "status_change",
        details: `Status changed to "${status}"`,
        createdAt: now,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { creatorId } = await req.json();
    await db.delete(favorites).where(eq(favorites.creatorId, creatorId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
