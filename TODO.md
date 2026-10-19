# AI App Builder MVP — Outcome TODO

## Dashboard workspace and navigation

- [x] Authenticated users see a dashboard with recent projects, build health, deployment status, quick actions, and navigation to generation, templates, preview/bug fix, domains, publishing, and Android builds.
- [x] The interface is responsive and uses the approved Signal glass lab visual system with clear AI, healthy, attention, and blocked states.

## AI app generation

- [x] A user can submit an app idea and receive an AI-generated blueprint containing a summary, pages, database tables, roles/login requirements, and a build checklist.
- [x] Generated projects are stored in the managed database and scoped to the authenticated user.
- [x] AI loading, empty, failure, and retry states preserve the submitted idea and never claim success when no usable AI result exists.

## Live preview and Bug Fix AI

- [x] A project workspace shows a browser-like live preview surface with generated page navigation and project build state.
- [x] The user can inspect an error log, request an AI diagnosis, see a fix suggestion with confidence and affected area, and apply a repair state.
- [x] Bug-fix history is visible and failed analysis keeps the log available for retry.

## Template marketplace

- [x] The marketplace includes School, Clinic, Shop, Portfolio, Booking, and additional ready-template cards with category/search/filter controls.
- [x] A user can preview or use a template to start a project blueprint flow.

## Custom domain and publishing

- [x] A user can enter a custom domain, see DNS/SSL guidance, and track pending, verifying, connected, or blocked state.
- [x] A user can start a one-click web publish flow and see build/publish progress and a public URL only when a real publication result exists.
- [x] Missing external deployment configuration remains explicit as an integration-ready blocker.

## Android APK Builder

- [x] A user can select APK or AAB, package name, and version, then start a mobile build flow.
- [x] The UI shows queued/building/ready/blocked state and exposes download only when an artifact exists; missing Android signing/build infrastructure is explicit.

## Engineering delivery

- [x] Manus OAuth remains the real protected login flow; session cookie behavior remains Preview-safe.
- [x] Drizzle schema and additive migration cover projects, project events, templates, domains, builds, and bug reports.
- [x] `/manus-routes.json` describes all product pages, TypeScript diagnostics are registered, and the app passes typecheck/build checks.


## Full completion phases

- [x] AI generates a real file tree for each project, including page components, routes, schema and API contract, and stores each file with a version.
- [x] Project workspace includes a file explorer, source viewer, generated-file regeneration, version history, restore and rollback.
- [x] Preview compiles the generated project contract, validates the generated entry point and paths, maps blueprint pages, and stores runtime logs on a versioned preview run.
- [x] Bug Fix AI reads selected project files and error logs, proposes a reviewable file patch, applies only non-stale patches, records a repair event, and stores a restorable snapshot.
- [x] Publishing uses a provider adapter boundary, persists deployment status and audit events, and reports the exact missing provider configuration instead of fabricating a public URL.
- [ ] Connect a real deployment-provider token and map its project API to return build logs, public URL and rollback handles.
- [x] Domain setup uses a provider adapter boundary and persists pending/blocked verification state with provider guidance.
- [ ] Connect a real DNS provider token to run challenge verification polling and SSL state updates.
- [x] Android builds validate package/version inputs, use an isolated build adapter boundary, and keep signing/build blockers explicit.
- [ ] Connect an Android worker and protected signing credentials to produce downloadable APK/AAB artifacts.
- [x] Project member roles (editor/viewer), owner-only membership changes, daily usage counters, audit logs, and protected generation/diagnosis limits are implemented.
- [x] Dashboard product brief is a conversational AI builder: user messages, assistant follow-up questions, build-ready brief generation, and automatic blueprint handoff when the user says build/go ahead.
