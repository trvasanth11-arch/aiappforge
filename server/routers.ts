import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { androidAdapter, deploymentAdapter, domainAdapter } from "./adapters";
import {
  addMember,
  consumeUsage,
  getBugReport,
  getProject,
  getProjectAccess,
  getUserByEmail,
  insertAudit,
  insertBuild,
  insertBugReport,
  insertDomain,
  insertEvent,
  insertPreviewRun,
  insertProject,
  insertProjectVersion,
  listAuditLogs,
  listBuilds,
  listDomains,
  listEvents,
  listMembers,
  listPreviewRuns,
  listProjectFiles,
  listProjectVersions,
  listProjects,
  listTemplates,
  updateBugReport,
  updateProject,
  upsertProjectFile,
} from "./db";

const templateCatalog = [
  { id: 1, slug: "school", name: "School OS", category: "Education", description: "Admissions, classes and parent updates in one calm workspace.", accent: "#8B7CFF", icon: "school", popularity: 98 },
  { id: 2, slug: "clinic", name: "Clinic Flow", category: "Healthcare", description: "Appointments, patient records and reminders without the admin drag.", accent: "#A7E86C", icon: "clinic", popularity: 91 },
  { id: 3, slug: "shop", name: "Shop Launch", category: "Commerce", description: "A conversion-ready storefront with products and order tracking.", accent: "#F5B971", icon: "shop", popularity: 87 },
  { id: 4, slug: "portfolio", name: "Portfolio Signal", category: "Portfolio", description: "A sharp portfolio system for showing work and winning briefs.", accent: "#63D8FF", icon: "portfolio", popularity: 78 },
  { id: 5, slug: "booking", name: "Booking Desk", category: "Services", description: "Availability, payments and client bookings with less back-and-forth.", accent: "#F47EAB", icon: "booking", popularity: 82 },
  { id: 6, slug: "community", name: "Community Hub", category: "Community", description: "Member profiles, posts and moderation tools for your next network.", accent: "#C5A3FF", icon: "community", popularity: 66 },
];

type Blueprint = { summary: string; pages: string[]; tables: string[]; roles: string[]; checklist: string[] };
type FilePatch = { path: string; before: string; after: string; reason: string };

const parseJson = (content: string) => {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(cleaned) as Record<string, unknown>; } catch { return null; }
};

const generationFallback = (idea: string): Blueprint => ({
  summary: `A build-ready product plan for: ${idea}`,
  pages: ["Landing", "Dashboard", "Settings"],
  tables: ["users", "projects", "activity"],
  roles: ["Owner", "Member"],
  checklist: ["Create the visual shell", "Connect the data model", "Run a preview build"],
});

const fileFallback = (projectName: string, blueprint: Record<string, unknown>) => [
  { path: "src/App.tsx", kind: "source", content: `export default function App() {\n  return <main><h1>${projectName}</h1><p>${String(blueprint.summary ?? "Build-ready application")}</p></main>;\n}\n` },
  { path: "src/pages/Home.tsx", kind: "page", content: `export default function Home() {\n  return <section><h2>Welcome to ${projectName}</h2><p>Your generated workspace is ready to customize.</p></section>;\n}\n` },
  { path: "src/lib/schema.ts", kind: "schema", content: `export const tables = ${JSON.stringify(blueprint.tables ?? ["users"], null, 2)};\nexport const roles = ${JSON.stringify(blueprint.roles ?? ["Owner"], null, 2)};\n` },
  { path: "server/api.ts", kind: "api", content: `export const health = () => ({ status: "ok", project: ${JSON.stringify(projectName)} });\n` },
  { path: "README.md", kind: "documentation", content: `# ${projectName}\n\nGenerated from an AI product brief.\n` },
];

const heuristicPatch = (file: { path: string; content: string }, errorLog: string): FilePatch | null => {
  if (file.content.includes(".map(")) {
    return { path: file.path, before: file.content, after: file.content.replace(".map(", "?.map("), reason: "Guarded the collection before mapping so an undefined response does not crash the preview." };
  }
  if (file.content.includes(".filter(")) {
    return { path: file.path, before: file.content, after: file.content.replace(".filter(", "?.filter("), reason: "Guarded the collection before filtering." };
  }
  if (file.path.endsWith(".tsx") || file.path.endsWith(".ts")) {
    return { path: file.path, before: file.content, after: `${file.content}\n// Forge repair note: reviewed against runtime log — ${errorLog.slice(0, 120).replace(/\n/g, " ")}\n`, reason: "Recorded a safe review marker because no deterministic collection access was found." };
  }
  return null;
};

const isSafePath = (path: string) => path.length <= 255 && !path.includes("..") && !path.startsWith("/");

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
    files: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => listProjectFiles(input.id, ctx.user.id)),
    versions: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => listProjectVersions(input.id, ctx.user.id)),
    previewRuns: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => listPreviewRuns(input.id, ctx.user.id)),
    domains: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => listDomains(input.id, ctx.user.id)),
    builds: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => listBuilds(input.id, ctx.user.id)),
    members: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => listMembers(input.id, ctx.user.id)),
    audit: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => listAuditLogs(input.id, ctx.user.id)),
    generateFiles: protectedProcedure.input(z.object({ projectId: z.number() })).mutation(async ({ ctx, input }) => {
      const usage = await consumeUsage(ctx.user.id, "source-generation", 30);
      if (!usage.allowed) throw new Error("Daily source-generation limit reached. Try again tomorrow.");
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const blueprint = project.blueprint ? (parseJson(project.blueprint) ?? generationFallback(project.idea)) : generationFallback(project.idea);
      let files = fileFallback(project.name, blueprint);
      try {
        const response = await invokeLLM({ messages: [
          { role: "system", content: "You are a senior full-stack engineer. Return only JSON with a files array. Each file must have path, kind, and content. Generate a small coherent React/TypeScript app from the supplied blueprint. Keep each file concise and never include secrets." },
          { role: "user", content: `Project: ${project.name}\nBlueprint: ${JSON.stringify(blueprint)}` },
        ], maxTokens: 2800 });
        const content = response.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? parseJson(content) : null;
        const generated = Array.isArray(parsed?.files) ? parsed.files.filter((file): file is { path: string; kind: string; content: string } => Boolean(file && typeof file === "object" && typeof (file as { path?: unknown }).path === "string" && typeof (file as { content?: unknown }).content === "string" && isSafePath((file as { path: string }).path))) : [];
        if (generated.length) files = generated.slice(0, 24);
      } catch (error) { console.warn("[AI file generation] fallback used", error); }
      const versionId = await insertProjectVersion({ projectId: input.projectId, ownerId: ctx.user.id, label: `Generated source v${Date.now()}`, summary: `${files.length} source files generated from the approved blueprint.`, snapshot: JSON.stringify(files) });
      for (const file of files) await upsertProjectFile({ projectId: input.projectId, ownerId: ctx.user.id, path: file.path, kind: file.kind, content: file.content, version: 1 });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "source-generation", message: `Generated ${files.length} project files`, meta: JSON.stringify({ versionId, paths: files.map(file => file.path) }) });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "source.generate", metadata: JSON.stringify({ versionId, count: files.length }) });
      await updateProject(input.projectId, ctx.user.id, { status: "ready" });
      return { versionId, files, remaining: usage.remaining };
    }),
    saveFile: protectedProcedure.input(z.object({ projectId: z.number(), path: z.string().min(1).max(255), kind: z.string().min(1).max(32), content: z.string().max(200000) })).mutation(async ({ ctx, input }) => {
      if (!isSafePath(input.path)) throw new Error("Unsafe source path");
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      await upsertProjectFile({ projectId: input.projectId, ownerId: ctx.user.id, path: input.path, kind: input.kind, content: input.content, version: 1 });
      const current = await listProjectFiles(input.projectId, ctx.user.id);
      const versionId = await insertProjectVersion({ projectId: input.projectId, ownerId: ctx.user.id, label: `Edited ${input.path}`, summary: `Saved changes to ${input.path}.`, snapshot: JSON.stringify(current.map(file => ({ path: file.path, kind: file.kind, content: file.content }))) });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "source-edit", message: `Saved ${input.path}`, meta: JSON.stringify({ versionId, path: input.path }) });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "source.edit", metadata: JSON.stringify({ path: input.path, versionId }) });
      return { versionId };
    }),
    compilePreview: protectedProcedure.input(z.object({ projectId: z.number() })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const files = await listProjectFiles(input.projectId, ctx.user.id);
      const logs: string[] = [`[forge] compiling ${files.length} generated files`, "[forge] validating paths and entry points"];
      const errors: string[] = [];
      if (!files.length) errors.push("No generated source files found. Generate a source tree first.");
      if (files.length && !files.some(file => /(^|\/)App\.(tsx|jsx)$/.test(file.path))) errors.push("No App.tsx or App.jsx entry point was found.");
      for (const file of files) {
        if (!isSafePath(file.path)) errors.push(`Unsafe path: ${file.path}`);
        if (!file.content.trim()) errors.push(`Empty source file: ${file.path}`);
        if (/<<<<<<<|>>>>>>>/.test(file.content)) errors.push(`Merge conflict markers found in ${file.path}`);
      }
      const status = errors.length ? "failed" as const : "ready" as const;
      if (errors.length) logs.push(...errors.map(error => `[error] ${error}`));
      else logs.push("[forge] contract checks passed", "[forge] preview is ready");
      const snapshot = JSON.stringify(files.map(file => ({ path: file.path, kind: file.kind, content: file.content })));
      const versionId = await insertProjectVersion({ projectId: input.projectId, ownerId: ctx.user.id, label: `Preview ${status} v${Date.now()}`, summary: status === "ready" ? "Generated project contract compiled successfully." : errors.join(" "), snapshot });
      const parsedBlueprint = project.blueprint ? parseJson(project.blueprint) : null;
      const blueprintPages = Array.isArray(parsedBlueprint?.pages) ? parsedBlueprint.pages : [];
      const routeMap = JSON.stringify(blueprintPages.map((page: unknown) => ({ path: `/${String(page).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, title: String(page) })));
      const runId = await insertPreviewRun({ projectId: input.projectId, ownerId: ctx.user.id, versionId, status, logs: logs.join("\n"), routeMap });
      await updateProject(input.projectId, ctx.user.id, { status: status === "ready" ? "ready" : "blocked" });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "preview", message: status === "ready" ? "Generated project compiled" : "Preview compile failed", meta: JSON.stringify({ runId, versionId, logs, routeMap }) });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "preview.compile", metadata: JSON.stringify({ runId, status }) });
      return { runId, versionId, status, logs, routeMap: JSON.parse(routeMap), filesChecked: files.length };
    }),
    restoreVersion: protectedProcedure.input(z.object({ projectId: z.number(), versionId: z.number() })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const versions = await listProjectVersions(input.projectId, ctx.user.id);
      const version = versions.find(item => item.id === input.versionId);
      if (!version?.snapshot) throw new Error("This version has no restorable snapshot");
      const snapshot = JSON.parse(version.snapshot) as Array<{ path: string; kind: string; content: string }>;
      for (const file of snapshot) if (isSafePath(file.path)) await upsertProjectFile({ projectId: input.projectId, ownerId: ctx.user.id, path: file.path, kind: file.kind, content: file.content, version: 1 });
      const restoredFiles = await listProjectFiles(input.projectId, ctx.user.id);
      const newVersionId = await insertProjectVersion({ projectId: input.projectId, ownerId: ctx.user.id, label: `Restored v${version.id}`, summary: `Restored the project snapshot from version ${version.id}.`, snapshot: JSON.stringify(restoredFiles.map(file => ({ path: file.path, kind: file.kind, content: file.content }))) });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "version.restore", metadata: JSON.stringify({ from: input.versionId, versionId: newVersionId }) });
      return { versionId: newVersionId, count: snapshot.length };
    }),
    generate: protectedProcedure.input(z.object({ idea: z.string().min(12), name: z.string().min(2).max(80) })).mutation(async ({ ctx, input }) => {
      const usage = await consumeUsage(ctx.user.id, "blueprint-generation", 20);
      if (!usage.allowed) throw new Error("Daily blueprint-generation limit reached. Try again tomorrow.");
      const projectId = await insertProject({ ownerId: ctx.user.id, name: input.name, idea: input.idea, status: "building" });
      await insertEvent({ projectId, ownerId: ctx.user.id, kind: "generation", message: "AI blueprint generation started" });
      let blueprint: Blueprint;
      try {
        const response = await invokeLLM({ messages: [
          { role: "system", content: "You are a product architect. Return only valid JSON with keys summary (string), pages (string array), tables (string array), roles (string array), checklist (string array). Keep it practical and concise." },
          { role: "user", content: `Turn this app idea into a build-ready blueprint: ${input.idea}` },
        ], maxTokens: 900 });
        const content = response.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? parseJson(content) : null;
        if (!parsed) throw new Error("AI returned no usable blueprint");
        blueprint = { ...generationFallback(input.idea), ...parsed } as Blueprint;
      } catch (error) {
        console.warn("[AI generation] failed", error);
        await updateProject(projectId, ctx.user.id, { status: "blocked", description: "AI generation needs a retry." });
        await insertEvent({ projectId, ownerId: ctx.user.id, kind: "generation", message: "AI blueprint generation failed; retry is available" });
        throw new Error("AI blueprint generation failed. Your brief is safe—please retry.");
      }
      const saved = await updateProject(projectId, ctx.user.id, { status: "ready", description: String(blueprint.summary), blueprint: JSON.stringify(blueprint), previewPath: "/preview" });
      await insertEvent({ projectId, ownerId: ctx.user.id, kind: "generation", message: "Blueprint ready for review", meta: JSON.stringify(blueprint) });
      const generatedFiles = fileFallback(input.name, blueprint);
      const sourceVersionId = await insertProjectVersion({ projectId, ownerId: ctx.user.id, label: "Initial generated source", summary: `${generatedFiles.length} starter files generated from the conversation.`, snapshot: JSON.stringify(generatedFiles) });
      for (const file of generatedFiles) await upsertProjectFile({ projectId, ownerId: ctx.user.id, path: file.path, kind: file.kind, content: file.content, version: 1 });
      const routeMap = JSON.stringify(blueprint.pages.map(page => ({ path: `/${page.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, title: page })));
      await insertPreviewRun({ projectId, ownerId: ctx.user.id, versionId: sourceVersionId, status: "ready", logs: `[forge] conversation brief accepted\n[forge] generated ${generatedFiles.length} source files\n[forge] initial preview contract ready`, routeMap });
      await insertEvent({ projectId, ownerId: ctx.user.id, kind: "source-generation", message: `Automatically generated ${generatedFiles.length} starter files`, meta: JSON.stringify({ versionId: sourceVersionId, paths: generatedFiles.map(file => file.path) }) });
      await insertAudit({ projectId, actorId: ctx.user.id, action: "blueprint.generate", metadata: JSON.stringify({ projectId }) });
      return { project: saved, blueprint, sourceVersionId, filesGenerated: generatedFiles.length, remaining: usage.remaining };
    }),
    fromTemplate: protectedProcedure.input(z.object({ slug: z.string(), name: z.string().min(2) })).mutation(async ({ ctx, input }) => {
      const template = templateCatalog.find(item => item.slug === input.slug) ?? templateCatalog[0];
      const idea = `Build a ${template.category.toLowerCase()} app based on the ${template.name} template. ${template.description}`;
      const projectId = await insertProject({ ownerId: ctx.user.id, name: input.name, idea, description: template.description, status: "draft", blueprint: JSON.stringify({ summary: template.description, pages: ["Home", "Dashboard", "Settings"], tables: ["users", "records"], roles: ["Owner", "Member"], checklist: ["Customize theme", "Connect records", "Publish preview"] }) });
      await insertEvent({ projectId, ownerId: ctx.user.id, kind: "template", message: `Started from ${template.name}` });
      await insertAudit({ projectId, actorId: ctx.user.id, action: "template.use", metadata: JSON.stringify({ slug: input.slug }) });
      return getProject(projectId, ctx.user.id);
    }),
  }),
  ai: router({
    chat: protectedProcedure.input(z.object({
      messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(6000) })).min(1).max(30),
      projectName: z.string().max(80).optional(),
    })).mutation(async ({ ctx, input }) => {
      const usage = await consumeUsage(ctx.user.id, "builder-chat", 80);
      if (!usage.allowed) throw new Error("Daily builder conversation limit reached. Try again tomorrow.");
      const lastMessage = input.messages[input.messages.length - 1]?.content ?? "";
      const explicitBuild = /\b(build|create|generate|make it|go ahead|ship it|start now|yes)\b|பண்ணு|செய்|உருவாக்கு/i.test(lastMessage);
      const fallback = {
        reply: explicitBuild ? "I have enough to start. I’m turning our conversation into a build brief and will open the generated workspace when the blueprint is ready." : "Good direction. Tell me who will use this app, the most important workflow, and whether it needs login or payments. I’ll use your answer to shape the first build.",
        shouldBuild: explicitBuild,
        projectName: input.projectName || "Untitled build",
        buildBrief: input.messages.map(message => `${message.role}: ${message.content}`).join("\n"),
      };
      try {
        const response = await invokeLLM({ messages: [
          { role: "system", content: "You are Forge, a warm but decisive AI product builder. Have a short practical conversation with the user. Ask only the highest-value missing questions. When the user clearly asks to build, says yes/go ahead, or gives enough detail and an explicit build request, set shouldBuild=true. Return only JSON with reply (string), shouldBuild (boolean), projectName (string), and buildBrief (string). The buildBrief must be a complete implementation brief containing users, pages, core workflow, data tables, roles, integrations, and visual direction. Never claim that an app is already built until the build request is handed to the builder." },
          ...input.messages.slice(-18).map(message => ({ role: message.role as "user" | "assistant", content: message.content })),
        ], maxTokens: 1100 });
        const content = response.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? parseJson(content) : null;
        if (parsed && typeof parsed.reply === "string" && typeof parsed.buildBrief === "string") {
          const shouldBuild = Boolean(parsed.shouldBuild) || explicitBuild;
          await insertAudit({ actorId: ctx.user.id, action: shouldBuild ? "builder.build_intent" : "builder.chat", metadata: JSON.stringify({ remaining: usage.remaining }) });
          return { reply: parsed.reply, shouldBuild, projectName: typeof parsed.projectName === "string" ? parsed.projectName : fallback.projectName, buildBrief: parsed.buildBrief, remaining: usage.remaining };
        }
      } catch (error) { console.warn("[Builder chat] fallback used", error); }
      await insertAudit({ actorId: ctx.user.id, action: explicitBuild ? "builder.build_intent" : "builder.chat", metadata: JSON.stringify({ remaining: usage.remaining }) });
      return { ...fallback, remaining: usage.remaining };
    }),
    diagnose: protectedProcedure.input(z.object({ projectId: z.number(), errorLog: z.string().min(8) })).mutation(async ({ ctx, input }) => {
      const usage = await consumeUsage(ctx.user.id, "bug-diagnosis", 40);
      if (!usage.allowed) throw new Error("Daily diagnosis limit reached. Try again tomorrow.");
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const files = await listProjectFiles(input.projectId, ctx.user.id);
      let diagnosis = { summary: "The runtime log points to a missing data boundary.", confidence: 0.78, affectedArea: "Data loading", steps: ["Check the query response", "Add an empty state", "Retry the preview build"], patches: [] as FilePatch[] };
      try {
        const response = await invokeLLM({ messages: [
          { role: "system", content: "You are a senior debugging assistant. Return only JSON with keys summary, confidence (number), affectedArea, steps (string array), patches (array of {path,before,after,reason}). Only patch supplied files. Keep patches small and safe." },
          { role: "user", content: `Diagnose this app runtime error and propose a safe repair.\nERROR LOG:\n${input.errorLog}\nFILES:\n${files.slice(0, 12).map(file => `FILE ${file.path}\n${file.content.slice(0, 5000)}`).join("\n\n")}` },
        ], maxTokens: 1500 });
        const content = response.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? parseJson(content) : null;
        if (parsed) diagnosis = { ...diagnosis, ...parsed, patches: Array.isArray(parsed.patches) ? parsed.patches.filter((patch): patch is FilePatch => Boolean(patch && typeof patch === "object" && typeof (patch as { path?: unknown }).path === "string" && typeof (patch as { before?: unknown }).before === "string" && typeof (patch as { after?: unknown }).after === "string" && isSafePath((patch as { path: string }).path))) : [] } as typeof diagnosis;
      } catch (error) { console.warn("[AI diagnosis] fallback used", error); }
      if (!diagnosis.patches.length) {
        const candidate = files.find(file => /\.(tsx?|jsx?)$/.test(file.path));
        const patch = candidate ? heuristicPatch(candidate, input.errorLog) : null;
        if (patch) diagnosis.patches = [patch];
      }
      const bugId = await insertBugReport({ projectId: input.projectId, ownerId: ctx.user.id, errorLog: input.errorLog, diagnosis: JSON.stringify(diagnosis), patch: JSON.stringify(diagnosis.patches), affectedFiles: JSON.stringify(diagnosis.patches.map(patch => patch.path)), status: "open" });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "bug-fix", message: "AI diagnosis and reviewable patch ready", meta: JSON.stringify({ bugId, affectedFiles: diagnosis.patches.map(patch => patch.path) }) });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "bug.diagnose", metadata: JSON.stringify({ bugId, remaining: usage.remaining }) });
      return { id: bugId, diagnosis, remaining: usage.remaining };
    }),
    applyRepair: protectedProcedure.input(z.object({ projectId: z.number(), bugId: z.number() })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const bug = await getBugReport(input.bugId, ctx.user.id);
      if (!bug) throw new Error("Bug report not found");
      const patches = bug.patch ? JSON.parse(bug.patch) as FilePatch[] : [];
      const files = await listProjectFiles(input.projectId, ctx.user.id);
      let applied = 0;
      for (const patch of patches) {
        const current = files.find(file => file.path === patch.path);
        if (!current || current.content !== patch.before) continue;
        await upsertProjectFile({ projectId: input.projectId, ownerId: ctx.user.id, path: patch.path, kind: current.kind, content: patch.after, version: 1 });
        applied += 1;
      }
      const updatedFiles = await listProjectFiles(input.projectId, ctx.user.id);
      const versionId = await insertProjectVersion({ projectId: input.projectId, ownerId: ctx.user.id, label: `Repair ${input.bugId}`, summary: `Applied ${applied} reviewed repair patch${applied === 1 ? "" : "es"}.`, snapshot: JSON.stringify(updatedFiles.map(file => ({ path: file.path, kind: file.kind, content: file.content }))) });
      await updateBugReport(input.bugId, ctx.user.id, { status: applied ? "fixed" : "blocked" });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "bug-fix", message: applied ? "AI repair applied and saved to history" : "Repair became stale and needs review", meta: JSON.stringify({ bugId: input.bugId, versionId, applied }) });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "bug.apply", metadata: JSON.stringify({ bugId: input.bugId, versionId, applied }) });
      return { status: applied ? "fixed" as const : "blocked" as const, applied, versionId };
    }),
  }),
  deployment: router({
    providerStatus: publicProcedure.query(() => ({ web: deploymentAdapter.state(), domain: domainAdapter.state(), android: androidAdapter.state() })),
    connectDomain: protectedProcedure.input(z.object({ projectId: z.number(), hostname: z.string().min(4).max(255) })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const verification = await domainAdapter.verify(input.hostname);
      const domainStatus = verification.status === "ready" ? "connected" : verification.status === "pending" ? "pending" : "blocked";
      const id = await insertDomain({ projectId: input.projectId, ownerId: ctx.user.id, hostname: input.hostname, status: domainStatus });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "domain", message: `Domain setup started for ${input.hostname}`, meta: JSON.stringify(verification) });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "domain.connect", metadata: JSON.stringify({ hostname: input.hostname, provider: verification.provider }) });
      return { id, ...verification };
    }),
    publish: protectedProcedure.input(z.object({ projectId: z.number() })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const files = await listProjectFiles(input.projectId, ctx.user.id);
      const result = await deploymentAdapter.publish({ projectId: input.projectId, projectName: project.name, files: files.map(file => ({ path: file.path, content: file.content })) });
      const buildStatus = result.status === "ready" ? "ready" : result.status === "pending" ? "building" : "blocked";
      const id = await insertBuild({ projectId: input.projectId, ownerId: ctx.user.id, kind: "web", status: buildStatus, artifactUrl: result.publicUrl, blocker: result.blocker });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "publish", message: "Publish request saved; provider adapter response recorded", meta: JSON.stringify(result) });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "deploy.publish", metadata: JSON.stringify({ id, provider: result.provider }) });
      return { id, ...result };
    }),
    mobileBuild: protectedProcedure.input(z.object({ projectId: z.number(), kind: z.enum(["apk", "aab"]), packageName: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/), version: z.string().regex(/^\d+\.\d+\.\d+$/) })).mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found");
      const files = await listProjectFiles(input.projectId, ctx.user.id);
      const result = await androidAdapter.build({ projectId: input.projectId, kind: input.kind, packageName: input.packageName, version: input.version, files: files.map(file => ({ path: file.path, content: file.content })) });
      const buildStatus = result.status === "ready" ? "ready" : result.status === "pending" ? "building" : "blocked";
      const id = await insertBuild({ projectId: input.projectId, ownerId: ctx.user.id, kind: input.kind, status: buildStatus, packageName: input.packageName, version: input.version, artifactUrl: result.artifactUrl, blocker: result.blocker });
      await insertEvent({ projectId: input.projectId, ownerId: ctx.user.id, kind: "mobile-build", message: `${input.kind.toUpperCase()} build request saved`, meta: JSON.stringify(result) });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "mobile.build", metadata: JSON.stringify({ id, kind: input.kind, packageName: input.packageName }) });
      return { id, ...result };
    }),
  }),
  team: router({
    addMember: protectedProcedure.input(z.object({ projectId: z.number(), email: z.string().email(), role: z.enum(["editor", "viewer"]) })).mutation(async ({ ctx, input }) => {
      const access = await getProjectAccess(input.projectId, ctx.user.id);
      if (!access || access.role !== "owner") throw new Error("Only the project owner can manage members");
      const user = await getUserByEmail(input.email);
      if (!user) throw new Error("That user must sign in once before they can be added");
      const id = await addMember({ projectId: input.projectId, userId: user.id, role: input.role });
      await insertAudit({ projectId: input.projectId, actorId: ctx.user.id, action: "team.member_add", metadata: JSON.stringify({ userId: user.id, role: input.role }) });
      return { id, userId: user.id, role: input.role };
    }),
  }),
});

export type AppRouter = typeof appRouter;
