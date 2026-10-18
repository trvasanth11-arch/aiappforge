import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  User,
  users,
  projects,
  projectEvents,
  templates,
  domains,
  builds,
  bugReports,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listProjects(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.ownerId, ownerId)).orderBy(desc(projects.updatedAt));
}

export async function getProject(projectId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result[0]?.ownerId === ownerId ? result[0] : undefined;
}

export async function insertProject(input: typeof projects.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(projects).values(input);
  return Number(result[0].insertId);
}

export async function updateProject(projectId: number, ownerId: number, values: Partial<typeof projects.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(projects).set(values).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  return getProject(projectId, ownerId);
}

export async function insertEvent(input: typeof projectEvents.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(projectEvents).values(input);
}

export async function listEvents(projectId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const project = await getProject(projectId, ownerId);
  if (!project) return [];
  return db.select().from(projectEvents).where(eq(projectEvents.projectId, projectId)).orderBy(desc(projectEvents.createdAt));
}

export async function listTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templates).orderBy(desc(templates.popularity));
}

export async function insertDomain(input: typeof domains.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(domains).values(input);
  return Number(result[0].insertId);
}

export async function insertBuild(input: typeof builds.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(builds).values(input);
  return Number(result[0].insertId);
}

export async function insertBugReport(input: typeof bugReports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(bugReports).values(input);
  return Number(result[0].insertId);
}

export async function updateBugReport(id: number, ownerId: number, values: Partial<typeof bugReports.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(bugReports).set(values).where(and(eq(bugReports.id, id), eq(bugReports.ownerId, ownerId)));
}
