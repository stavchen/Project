import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { savedSearches } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const results = db.select().from(savedSearches).all();
    return NextResponse.json({ data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, filters } = await req.json();
    const result = db
      .insert(savedSearches)
      .values({
        name,
        filters: JSON.stringify(filters),
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    db.delete(savedSearches).where(eq(savedSearches.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
