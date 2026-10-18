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
- [ ] Preview compiles the generated project contract and renders its actual generated pages/data map; runtime logs are attached to a project version.
- [ ] Bug Fix AI reads selected project files and error logs, proposes a reviewable diff, applies the patch, records a repair event, and supports rollback.
- [ ] Publishing uses a provider adapter boundary with build logs, environment variables, deployment status, public URL and rollback; missing provider configuration remains explicit.
- [ ] Domain setup uses a provider adapter boundary with DNS challenge, verification polling, SSL state and removal/update actions.
- [ ] Android builds use an isolated wrapper/build adapter with APK/AAB artifacts, build logs, package validation and protected signing configuration.
- [ ] Team roles, project permissions, usage limits, audit logs and production rate limits are implemented.
