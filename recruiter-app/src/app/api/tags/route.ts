import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tags, creatorTags } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// List all tags
export async function GET() {
  try {
    const allTags = db.select().from(tags).all();
    return NextResponse.json({ data: allTags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create a tag
export async function POST(req: NextRequest) {
  try {
    const { name, color = "#6366f1" } = await req.json();
    const result = db
      .insert(tags)
      .values({ name, color, createdAt: new Date().toISOString() })
      .returning()
      .get();
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Assign/remove tag from creator
export async function PATCH(req: NextRequest) {
  try {
    const { creatorId, tagId, action } = await req.json();

    if (action === "add") {
      const existing = db
        .select()
        .from(creatorTags)
        .where(
          and(
            eq(creatorTags.creatorId, creatorId),
            eq(creatorTags.tagId, tagId)
          )
        )
        .get();
      if (!existing) {
        db.insert(creatorTags).values({ creatorId, tagId }).run();
      }
    } else if (action === "remove") {
      db.delete(creatorTags)
        .where(
          and(
            eq(creatorTags.creatorId, creatorId),
            eq(creatorTags.tagId, tagId)
          )
        )
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete a tag
export async function DELETE(req: NextRequest) {
  try {
    const { tagId } = await req.json();
    db.delete(creatorTags).where(eq(creatorTags.tagId, tagId)).run();
    db.delete(tags).where(eq(tags.id, tagId)).run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
