import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tags, creatorTags } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allTags = await db.select().from(tags);
    return NextResponse.json({ data: allTags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, color = "#6366f1" } = await req.json();
    const [result] = await db
      .insert(tags)
      .values({ name, color, createdAt: new Date().toISOString() })
      .returning();
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("unique")) {
      return NextResponse.json(
        { error: "Tag already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { creatorId, tagId, action } = await req.json();

    if (action === "add") {
      const [existing] = await db
        .select()
        .from(creatorTags)
        .where(
          and(
            eq(creatorTags.creatorId, creatorId),
            eq(creatorTags.tagId, tagId)
          )
        )
        .limit(1);
      if (!existing) {
        await db.insert(creatorTags).values({ creatorId, tagId });
      }
    } else if (action === "remove") {
      await db
        .delete(creatorTags)
        .where(
          and(
            eq(creatorTags.creatorId, creatorId),
            eq(creatorTags.tagId, tagId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tagId } = await req.json();
    await db.delete(creatorTags).where(eq(creatorTags.tagId, tagId));
    await db.delete(tags).where(eq(tags.id, tagId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
