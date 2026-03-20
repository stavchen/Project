import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  serial,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const creators = pgTable("creators", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  bio: text("bio"),
  location: text("location"),
  website: text("website"),
  subscriberCount: integer("subscriber_count").default(0),
  postCount: integer("post_count").default(0),
  photoCount: integer("photo_count").default(0),
  videoCount: integer("video_count").default(0),
  mediaCount: integer("media_count").default(0),
  hasInstagram: boolean("has_instagram").default(false),
  instagramHandle: text("instagram_handle"),
  isFree: boolean("is_free").default(false),
  subscriptionPrice: doublePrecision("subscription_price"),
  isVerified: boolean("is_verified").default(false),
  isPerformer: boolean("is_performer").default(false),
  joinedAt: text("joined_at"),
  fetchedAt: text("fetched_at").notNull(),
  rawJson: text("raw_json"),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id),
  status: text("status").default("discovered"),
  notes: text("notes"),
  addedAt: text("added_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastContactedAt: text("last_contacted_at"),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("#6366f1"),
  createdAt: text("created_at").notNull(),
});

export const creatorTags = pgTable("creator_tags", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id),
});

export const outreachLog = pgTable("outreach_log", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: text("created_at").notNull(),
});

export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  filters: text("filters").notNull(),
  createdAt: text("created_at").notNull(),
});

export type Creator = typeof creators.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type CreatorTag = typeof creatorTags.$inferSelect;
export type OutreachEntry = typeof outreachLog.$inferSelect;
export type SavedSearch = typeof savedSearches.$inferSelect;
