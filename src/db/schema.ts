import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Define the 'users' table.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define the 'assistant_logs' table (for user prompt & response history)
export const assistantLogs = pgTable("assistant_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  mode: text("mode").default("text"), // 'text' or 'voice'
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relationships for the 'users' table.
export const usersRelations = relations(users, ({ many }) => ({
  assistantLogs: many(assistantLogs),
}));

// Define relationships for the 'assistant_logs' table.
export const assistantLogsRelations = relations(assistantLogs, ({ one }) => ({
  user: one(users, {
    fields: [assistantLogs.userId],
    references: [users.id],
  }),
}));
