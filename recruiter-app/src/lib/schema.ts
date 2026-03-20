import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const creators = sqliteTable("creators", {
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
  hasInstagram: integer("has_instagram", { mode: "boolean" }).default(false),
  instagramHandle: text("instagram_handle"),
  isFree: integer("is_free", { mode: "boolean" }).default(false),
  subscriptionPrice: real("subscription_price"),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false),
  joinedAt: text("joined_at"),
  fetchedAt: text("fetched_at").notNull(),
  rawJson: text("raw_json"),
});

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id),
  status: text("status", {
    enum: [
      "discovered",
      "contacted",
      "responded",
      "negotiating",
      "signed",
      "passed",
    ],
  }).default("discovered"),
  notes: text("notes"),
  addedAt: text("added_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastContactedAt: text("last_contacted_at"),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").default("#6366f1"),
  createdAt: text("created_at").notNull(),
});

export const creatorTags = sqliteTable("creator_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id),
});

export const outreachLog = sqliteTable("outreach_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id),
  action: text("action", {
    enum: ["dm_sent", "email_sent", "ig_messaged", "call", "note", "status_change"],
  }).notNull(),
  details: text("details"),
  createdAt: text("created_at").notNull(),
});

export const savedSearches = sqliteTable("saved_searches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  filters: text("filters").notNull(), // JSON string of filter params
  createdAt: text("created_at").notNull(),
});

export type Creator = typeof creators.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type CreatorTag = typeof creatorTags.$inferSelect;
export type OutreachEntry = typeof outreachLog.$inferSelect;
export type SavedSearch = typeof savedSearches.$inferSelect;
