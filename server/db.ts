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
  projectFiles,
  projectVersions,
  previewRuns,
  projectMembers,
  auditLogs,
  usageCounters,
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

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
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

export async function getProjectAccess(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project[0]) return undefined;
  if (project[0].ownerId === userId) return { project: project[0], role: "owner" as const };
  const member = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))).limit(1);
  return member[0] ? { project: project[0], role: member[0].role } : undefined;
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

export async function listDomains(projectId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const project = await getProject(projectId, ownerId);
  if (!project) return [];
  return db.select().from(domains).where(and(eq(domains.projectId, projectId), eq(domains.ownerId, ownerId))).orderBy(desc(domains.createdAt));
}

export async function insertBuild(input: typeof builds.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(builds).values(input);
  return Number(result[0].insertId);
}

export async function listBuilds(projectId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const project = await getProject(projectId, ownerId);
  if (!project) return [];
  return db.select().from(builds).where(and(eq(builds.projectId, projectId), eq(builds.ownerId, ownerId))).orderBy(desc(builds.createdAt));
}

export async function insertBugReport(input: typeof bugReports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(bugReports).values(input);
  return Number(result[0].insertId);
}

export async function getBugReport(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bugReports).where(and(eq(bugReports.id, id), eq(bugReports.ownerId, ownerId))).limit(1);
  return result[0];
}

export async function updateBugReport(id: number, ownerId: number, values: Partial<typeof bugReports.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(bugReports).set(values).where(and(eq(bugReports.id, id), eq(bugReports.ownerId, ownerId)));
}

export async function insertProjectVersion(input: typeof projectVersions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(projectVersions).values(input);
  return Number(result[0].insertId);
}

export async function listProjectVersions(projectId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const project = await getProject(projectId, ownerId);
  if (!project) return [];
  return db.select().from(projectVersions).where(and(eq(projectVersions.projectId, projectId), eq(projectVersions.ownerId, ownerId))).orderBy(desc(projectVersions.createdAt));
}

export async function upsertProjectFile(input: typeof projectFiles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(projectFiles).where(and(eq(projectFiles.projectId, input.projectId), eq(projectFiles.ownerId, input.ownerId), eq(projectFiles.path, input.path))).limit(1);
  if (existing[0]) {
    await db.update(projectFiles).set({ content: input.content, kind: input.kind, version: (existing[0].version ?? 0) + 1 }).where(eq(projectFiles.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(projectFiles).values(input);
  return Number(result[0].insertId);
}

export async function listProjectFiles(projectId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const project = await getProject(projectId, ownerId);
  if (!project) return [];
  return db.select().from(projectFiles).where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.ownerId, ownerId))).orderBy(projectFiles.path);
}

export async function insertPreviewRun(input: typeof previewRuns.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(previewRuns).values(input);
  return Number(result[0].insertId);
}

export async function listPreviewRuns(projectId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const project = await getProject(projectId, ownerId);
  if (!project) return [];
  return db.select().from(previewRuns).where(and(eq(previewRuns.projectId, projectId), eq(previewRuns.ownerId, ownerId))).orderBy(desc(previewRuns.createdAt));
}

export async function listMembers(projectId: number, ownerId: number) {
  const access = await getProjectAccess(projectId, ownerId);
  if (!access) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId)).orderBy(desc(projectMembers.createdAt));
}

export async function addMember(input: typeof projectMembers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(projectMembers).values(input);
  return Number(result[0].insertId);
}

export async function insertAudit(input: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(input);
}

export async function listAuditLogs(projectId: number, ownerId: number) {
  const access = await getProjectAccess(projectId, ownerId);
  if (!access) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.projectId, projectId)).orderBy(desc(auditLogs.createdAt));
}

export async function consumeUsage(userId: number, key: string, limit: number) {
  const db = await getDb();
  if (!db) return { allowed: true, remaining: limit };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const existing = await db.select().from(usageCounters).where(and(eq(usageCounters.userId, userId), eq(usageCounters.key, key))).limit(1);
  if (!existing[0] || existing[0].periodStart < start) {
    if (existing[0]) await db.update(usageCounters).set({ count: 1, periodStart: start }).where(eq(usageCounters.id, existing[0].id));
    else await db.insert(usageCounters).values({ userId, key, count: 1, periodStart: start });
    return { allowed: true, remaining: Math.max(0, limit - 1) };
  }
  if (existing[0].count >= limit) return { allowed: false, remaining: 0 };
  await db.update(usageCounters).set({ count: existing[0].count + 1 }).where(eq(usageCounters.id, existing[0].id));
  return { allowed: true, remaining: Math.max(0, limit - existing[0].count - 1) };
}
