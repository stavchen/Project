import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    await sql`
      CREATE TABLE IF NOT EXISTS creators (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        cover_url TEXT,
        bio TEXT,
        location TEXT,
        website TEXT,
        subscriber_count INTEGER DEFAULT 0,
        post_count INTEGER DEFAULT 0,
        photo_count INTEGER DEFAULT 0,
        video_count INTEGER DEFAULT 0,
        media_count INTEGER DEFAULT 0,
        has_instagram BOOLEAN DEFAULT FALSE,
        instagram_handle TEXT,
        is_free BOOLEAN DEFAULT FALSE,
        subscription_price DOUBLE PRECISION,
        is_verified BOOLEAN DEFAULT FALSE,
        is_performer BOOLEAN DEFAULT FALSE,
        joined_at TEXT,
        fetched_at TEXT NOT NULL,
        raw_json TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        creator_id TEXT NOT NULL REFERENCES creators(id),
        status TEXT DEFAULT 'discovered',
        notes TEXT,
        added_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_contacted_at TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#6366f1',
        created_at TEXT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS creator_tags (
        id SERIAL PRIMARY KEY,
        creator_id TEXT NOT NULL REFERENCES creators(id),
        tag_id INTEGER NOT NULL REFERENCES tags(id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS outreach_log (
        id SERIAL PRIMARY KEY,
        creator_id TEXT NOT NULL REFERENCES creators(id),
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        filters TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;

    // Migrations for existing tables
    await sql`ALTER TABLE creators ADD COLUMN IF NOT EXISTS is_performer BOOLEAN DEFAULT FALSE`;

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_creators_joined ON creators(joined_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_creators_subscribers ON creators(subscriber_count)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_creators_instagram ON creators(has_instagram)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_status ON favorites(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_creator ON favorites(creator_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_creator_tags_creator ON creator_tags(creator_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_creator_tags_tag ON creator_tags(tag_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_outreach_creator ON outreach_log(creator_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_outreach_created ON outreach_log(created_at)`;

    return NextResponse.json({
      success: true,
      message: "All tables and indexes created successfully!",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
