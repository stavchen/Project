import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "recruiter.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Auto-create tables on first import
sqlite.exec(`
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
    has_instagram INTEGER DEFAULT 0,
    instagram_handle TEXT,
    is_free INTEGER DEFAULT 0,
    subscription_price REAL,
    is_verified INTEGER DEFAULT 0,
    joined_at TEXT,
    fetched_at TEXT NOT NULL,
    raw_json TEXT
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT NOT NULL REFERENCES creators(id),
    status TEXT DEFAULT 'discovered',
    notes TEXT,
    added_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_contacted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS creator_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT NOT NULL REFERENCES creators(id),
    tag_id INTEGER NOT NULL REFERENCES tags(id)
  );

  CREATE TABLE IF NOT EXISTS outreach_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT NOT NULL REFERENCES creators(id),
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saved_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filters TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_creators_joined ON creators(joined_at);
  CREATE INDEX IF NOT EXISTS idx_creators_subscribers ON creators(subscriber_count);
  CREATE INDEX IF NOT EXISTS idx_creators_instagram ON creators(has_instagram);
  CREATE INDEX IF NOT EXISTS idx_favorites_status ON favorites(status);
  CREATE INDEX IF NOT EXISTS idx_favorites_creator ON favorites(creator_id);
  CREATE INDEX IF NOT EXISTS idx_creator_tags_creator ON creator_tags(creator_id);
  CREATE INDEX IF NOT EXISTS idx_creator_tags_tag ON creator_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_outreach_creator ON outreach_log(creator_id);
  CREATE INDEX IF NOT EXISTS idx_outreach_created ON outreach_log(created_at);
`);
