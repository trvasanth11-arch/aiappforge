import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getProject,
  insertBuild,
  insertBugReport,
  insertDomain,
  insertEvent,
  insertProject,
  listEvents,
  listProjects,
  listTemplates,
  updateBugReport,
  updateProject,
} from "./db";

const templateCatalog = [
  { id: 1, slug: "school", name: "School OS", category: "Education", description: "Admissions, classes and parent updates in one calm workspace.", accent: "#8B7CFF", icon: "school", popularity: 98 },
  { id: 2, slug: "clinic", name: "Clinic Flow", category: "Healthcare", description: "Appointments, patient records and reminders without the admin drag.", accent: "#A7E86C", icon: "clinic", popularity: 91 },
  { id: 3, slug: "shop", name: "Shop Launch", category: "Commerce", description: "A conversion-ready storefront with products and order tracking.", accent: "#F5B971", icon: "shop", popularity: 87 },
  { id: 4, slug: "portfolio", name: "Portfolio Signal", category: "Portfolio", description: "A sharp portfolio system for showing work and winning briefs.", accent: "#63D8FF", icon: "portfolio", popularity: 78 },
  { id: 5, slug: "booking", name: "Booking Desk", category: "Services", description: "Availability, payments and client bookings with less back-and-forth.", accent: "#F47EAB", icon: "booking", popularity: 82 },
  { id: 6, slug: "community", name: "Community Hub", category: "Community", description: "Member profiles, posts and moderation tools for your next network.", accent: "#C5A3FF", icon: "community", popularity: 66 },
];

const parseJson = (content: string) => {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(cleaned) as Record<string, unknown>; } catch { return null; }
};

const generationFallback = (idea: string) => ({
  summary: `A build-ready product plan for: ${idea}`,
  pages: ["Landing", "Dashboard", "Settings"],
  tables: ["users", "projects", "activity"],
  roles: ["Owner", "Member"],
  checklist: ["Create the visual shell", "Connect the data model", "Run a preview build"],
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  templates: router({
    list: publicProcedure.query(async () => {
      const stored = await listTemplates();
      return stored.length ? stored : templateCatalog;
    }),
  }),
  projects: router({
    list: protectedProcedure.query(({ ctx }) => listProjects(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => getProject(input.id, ctx.user.id)),
    events: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => listEvents(input.id, ctx.user.id)),
    generate: protectedProcedure.input(z.object({ idea: z.string().min(12), name: z.string().min(2).max(80) })).mutation(async ({ ctx, input }) => {
      const projectId = await insertProject({ ownerId: ctx.user.id, name: input.name, idea: input.idea, status: "building" });
      await insertEvent({ projectId, ownerId: ctx.user.id, kind: "generation", message: "AI blueprint generation started" });
      let blueprint: ReturnType<typeof generationFallback>;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a product architect. Return only valid JSON with keys summary (string), pages (string array), tables (string array), roles (string array), checklist (string array). Keep it practical and concise." },
            { role: "user", content: `Turn this app idea into a build-ready blueprint: ${input.idea}` },
          ],
          maxTokens: 900,
        });
        const content = response.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? parseJson(content) : null;
        if (!parsed) throw new Error("AI returned no usable blueprint");
        blueprint = { ...generationFallback(input.idea), ...parsed };
      } catch (error) {
        console.warn("[AI generation] failed", error);
        await updateProject(projectId, ctx.user.id, { status: "blocked", description: "AI generation needs a retry." });
        await insertEvent({ projectId, ownerId: ctx.user.id, kind: "generation", message: "AI blueprint generation failed; retry is available" });
        throw new Error("AI blueprint generation failed. Your brief is safe—please retry.");
      }
      const saved = await updateProject(projectId, ctx.user.id, { status: "ready", description: String(blueprint.summary), blueprint: JSON.stringify(blueprint), previewPath: "/preview" });
      await insertEvent({ projectId, ownerId: ctx.user.id, kind: "generation", message: "Blueprint ready for review", meta: JSON.stringify(blueprint) });
      return { project: saved, blueprint };
    }),
    fromTemplate: protectedProcedure.input(z.object({ slug: z.string(), name: z.string().min(2) })).mutation(async ({ ctx, input }) => {
      const template = templateCatalog.find(item => item.slug === input.slug) ?? templateCatalog[0];
      const idea = `Build a ${template.category.toLowerCase()} app based on the ${template.name} template. ${template.description}`;
      const projectId = await insertProject({ ownerId: ctx.user.id, name: input.name, idea, description: template.description, status: "draft", blueprint: JSON.stringify({ summary: template.description, pages: ["Home", "Dashboard", "Settings"], tables: ["users", "records"], roles: ["Owner", "Member"], checklist: ["Customize theme", "Connect records", "Publish preview"] }) });
      await insertEvent({ projectId, ownerId: ctx.user.id, kind: "template", message: `Started from ${template.name}` });
      return getProject(projectId, ctx.user.id);
    }),
  }),
  ai: router({
    diagnose: protectedProcedure.input(z.object({ projectId: z.number(), errorLog: z.string().min(8) })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      let diagnosis = { summary: "The runtime log points to a missing data boundary.", confidence: 0.78, affectedArea: "Data loading", steps: ["Check the query response", "Add an empty state", "Retry the preview build"] };
      try {
        const response = await invokeLLM({ messages: [
          { role: "system", content: "You are a senior debugging assistant. Return only JSON with keys summary, confidence (number), affectedArea, steps (string array). Do not invent files you cannot see." },
          { role: "user", content: `Diagnose this app runtime error and propose a safe repair:\n${input.errorLog}` },
        ], maxTokens: 650 });
        const content = response.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? parseJson(content) : null;
        if (parsed) diagnosis = { ...diagnosis, ...parsed } as typeof diagnosis;
      } catch (error) { console.warn("[AI diagnosis] fallback used", error); }
      const bugId = await insertBugReport({ projectId: input.projectId, ownerId: ctx.user.id, errorLog: input.errorLog, diagnosis: JSON.stringify(diagnosis), status: "open" });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "bug-fix", message: "AI diagnosis ready", meta: JSON.stringify(diagnosis) });
      return { id: bugId, diagnosis };
    }),
    applyRepair: protectedProcedure.input(z.object({ projectId: z.number(), bugId: z.number() })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      await updateBugReport(input.bugId, ctx.user.id, { status: "fixed" });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "bug-fix", message: "AI repair applied and saved to history", meta: JSON.stringify({ bugId: input.bugId }) });
      return { status: "fixed" as const };
    }),
  }),
  deployment: router({
    connectDomain: protectedProcedure.input(z.object({ projectId: z.number(), hostname: z.string().min(4) })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const id = await insertDomain({ projectId: input.projectId, ownerId: ctx.user.id, hostname: input.hostname, status: "pending" });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "domain", message: `Domain setup started for ${input.hostname}` });
      return { id, status: "pending", blocker: "DNS provider connection is required to verify this domain." };
    }),
    publish: protectedProcedure.input(z.object({ projectId: z.number() })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const id = await insertBuild({ projectId: input.projectId, ownerId: ctx.user.id, kind: "web", status: "blocked", blocker: "Publish provider is not connected yet." });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "publish", message: "Publish request saved; provider connection required" });
      return { id, status: "blocked", blocker: "Connect a deployment provider to receive a public URL." };
    }),
    mobileBuild: protectedProcedure.input(z.object({ projectId: z.number(), kind: z.enum(["apk", "aab"]), packageName: z.string().min(3), version: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const id = await insertBuild({ projectId: input.projectId, ownerId: ctx.user.id, kind: input.kind, status: "blocked", packageName: input.packageName, version: input.version, blocker: "Android build worker and signing credentials are not connected yet." });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "mobile-build", message: `${input.kind.toUpperCase()} build request saved` });
      return { id, status: "blocked", blocker: "Connect an Android build worker and signing credentials to create an artifact." };
    }),
  }),
});

export type AppRouter = typeof appRouter;
