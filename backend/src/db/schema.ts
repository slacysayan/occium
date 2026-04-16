import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const platformEnum = pgEnum("platform", ["youtube", "linkedin"]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "scheduled",
  "uploading",
  "published",
  "failed",
]);

export const privacyEnum = pgEnum("privacy_status", [
  "public",
  "unlisted",
  "private",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  picture: text("picture"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Sessions (express-session via connect-pg-simple) ─────────────────────────

export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// ─── Connected Accounts ───────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  accountName: text("account_name").notNull(),
  profilePicture: text("profile_picture"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  // YouTube specific
  channelId: text("channel_id"),
  // LinkedIn specific
  linkedinUrn: text("linkedin_urn"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Posts ────────────────────────────────────────────────────────────────────

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  platform: platformEnum("platform").notNull(),
  sourceUrl: text("source_url"),
  title: text("title"),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  tags: text("tags").array(),
  privacyStatus: privacyEnum("privacy_status").default("private"),
  status: postStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  platformPostId: text("platform_post_id"),
  uploadProgress: integer("upload_progress").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
