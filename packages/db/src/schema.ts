import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Better Auth core tables plus SpeakGround learner fields.
 * JS properties are camelCase; Postgres columns are snake_case (CLAUDE.md).
 */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Public name shown in the group view when the learner opts in. */
  displayName: text("display_name"),
  /** When the learner accepted the beta consent screen. Null until onboarding. */
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  showKorean: boolean("show_korean").notNull().default(true),
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  /** Invite code consumed at sign-up. Server-owned. */
  inviteCodeUsed: text("invite_code_used"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/** Group invite codes. Owner creates these via CLI; there is no admin UI. */
export const invites = pgTable("invites", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  maxUses: integer("max_uses").notNull().default(50),
  useCount: integer("use_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One placement attempt. `state` is the core placement document. */
export const placementSessions = pgTable(
  "placement_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    state: jsonb("state").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("placement_sessions_user_id_idx").on(table.userId)],
);

/** Latest rating per skill. Written when a placement test is finished. */
export const skillEstimates = pgTable(
  "skill_estimates",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
    rating: doublePrecision("rating").notNull(),
    attempts: integer("attempts").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.skill] })],
);

/**
 * One shared practice set per level per Korea calendar day.
 * `items` includes the answer key and is not sent to the browser until scoring.
 */
export const dailySets = pgTable(
  "daily_sets",
  {
    id: text("id").primaryKey(),
    level: text("level").notNull(),
    topic: text("topic").notNull(),
    practiceDate: text("practice_date").notNull(),
    items: jsonb("items").notNull(),
    writing: jsonb("writing").notNull(),
    promptId: text("prompt_id").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("daily_sets_level_date_uidx").on(table.level, table.practiceDate)],
);

/** A learner's answers for one daily set. One attempt. */
export const practiceResponses = pgTable(
  "practice_responses",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dailySetId: text("daily_set_id")
      .notNull()
      .references(() => dailySets.id, { onDelete: "cascade" }),
    answers: jsonb("answers").notNull(),
    score: integer("score").notNull(),
    writing: text("writing"),
    writingFeedback: jsonb("writing_feedback"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.dailySetId] })],
);

/** One flag per learner per question: wrong, too hard, or too easy. */
export const itemFeedback = pgTable(
  "item_feedback",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dailySetId: text("daily_set_id")
      .notNull()
      .references(() => dailySets.id, { onDelete: "cascade" }),
    itemIndex: integer("item_index").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.dailySetId, table.itemIndex] })],
);

/** A phrase the learner missed or corrected. Reviewed on a widening schedule. */
export const notebookEntries = pgTable(
  "notebook_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    termKey: text("term_key").notNull(),
    meaningKo: text("meaning_ko").notNull(),
    example: text("example").notNull(),
    intervalDays: integer("interval_days").notNull(),
    dueOn: text("due_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notebook_entries_user_term_uidx").on(table.userId, table.termKey),
    index("notebook_entries_user_due_idx").on(table.userId, table.dueOn),
  ],
);

/** Shared syllabus. Not learner data. Seeded from the core curriculum catalog. */
export const curriculumNodes = pgTable("curriculum_nodes", {
  id: text("id").primaryKey(),
  level: text("level").notNull(),
  skill: text("skill").notNull(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  korean: text("korean").notNull(),
  summary: text("summary").notNull(),
  headwords: jsonb("headwords").notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  invites,
  placementSessions,
  skillEstimates,
  dailySets,
  practiceResponses,
  notebookEntries,
  itemFeedback,
  curriculumNodes,
  userRelations,
  sessionRelations,
  accountRelations,
};
