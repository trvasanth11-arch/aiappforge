import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  idea: text("idea").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "building", "ready", "blocked"]).default("draft").notNull(),
  blueprint: text("blueprint"),
  previewPath: varchar("previewPath", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectEvents = mysqlTable("projectEvents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  ownerId: int("ownerId").notNull(),
  kind: varchar("kind", { length: 48 }).notNull(),
  message: text("message").notNull(),
  meta: text("meta"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  description: text("description").notNull(),
  accent: varchar("accent", { length: 24 }).notNull(),
  icon: varchar("icon", { length: 32 }).notNull(),
  popularity: int("popularity").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const domains = mysqlTable("domains", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  ownerId: int("ownerId").notNull(),
  hostname: varchar("hostname", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "verifying", "connected", "blocked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const builds = mysqlTable("builds", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  ownerId: int("ownerId").notNull(),
  kind: mysqlEnum("kind", ["web", "apk", "aab"]).notNull(),
  status: mysqlEnum("status", ["queued", "building", "ready", "blocked"]).default("queued").notNull(),
  packageName: varchar("packageName", { length: 180 }),
  version: varchar("version", { length: 32 }),
  artifactUrl: varchar("artifactUrl", { length: 512 }),
  blocker: text("blocker"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const bugReports = mysqlTable("bugReports", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  ownerId: int("ownerId").notNull(),
  errorLog: text("errorLog").notNull(),
  diagnosis: text("diagnosis"),
  status: mysqlEnum("status", ["open", "analyzing", "fixed", "blocked"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Domain = typeof domains.$inferSelect;
export type Build = typeof builds.$inferSelect;
export type BugReport = typeof bugReports.$inferSelect;
