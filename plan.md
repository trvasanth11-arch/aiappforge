# AI App Builder — MVP Implementation Plan

## Product scope

AI app developer-களுக்காக ஒரு browser-based command center உருவாக்கப்படுகிறது. User idea-ஐ எழுதினால் pages, database, login, dashboard ஆகியவற்றைக் கொண்ட app blueprint உருவாகும். MVP-யில் அந்த flow-க்கு real built-in Manus AI call இருக்கும்; output ஒரு readable app plan, suggested pages, data tables, roles மற்றும் next steps ஆக காட்டப்படும். Projects database-ல் சேமிக்கப்படும்.

இந்த முதல் build-ல் கீழ்கண்ட working product areas இருக்கும்:

- **Workspace dashboard:** recent projects, build health, deploy status, usage-style summary, quick actions.
- **AI App Generation:** idea textarea, app type/chips, Generate blueprint action, generated pages/database/auth summary மற்றும் activity log.
- **Live Preview + Bug Fix AI:** preview frame/mock browser surface, runtime error log, AI diagnosis, suggested fix, Apply repair state மற்றும் repair history.
- **Template Marketplace:** school, clinic, shop, portfolio, booking மற்றும் பிற templates; category/search/filter, featured cards, preview/use actions.
- **Custom Domain:** domain input, DNS checklist, verification state, SSL/connected status card.
- **One-click Web Publish:** build checklist, progress/status, public URL state and publish action.
- **Android APK Builder:** package name/version/build format selector, build progress, APK/AAB artifact state and download action.

Publish, custom-domain verification மற்றும் Android packaging-ன் real external infrastructure integration-க்கு தேவையான provider credentials/build workers இந்த MVP-யில் இல்லை. அதனால் UI state, server procedure boundaries மற்றும் clear integration-ready statuses உருவாக்கப்படும்; UI-யில் இவை fake success என்று காட்டப்படாது. Built-in AI generation மற்றும் bug analysis மட்டும் platform LLM-ஐ நேரடியாகப் பயன்படுத்தும்.

## Implementation approach

- **Frontend:** React + TypeScript + Wouter + Tailwind/shadcn starter components. A persistent left navigation shell with five product workspaces; responsive mobile layout.
- **Backend:** Existing Express/tRPC server. Add protected project, generation, bug-fix, domain, publish and mobile-build procedures. Manus OAuth starter flow remains the only login path.
- **Database:** Extend Drizzle schema with `projects`, `projectEvents`, `templates`, `domains`, `builds`, and `bugReports`. Every user-owned record is scoped by the authenticated user id. Add an additive migration and seed templates deterministically.
- **AI:** Use the supplied `invokeLLM` helper server-side. Generation asks for structured JSON containing app summary, pages, tables, roles and build checklist. Bug-fix asks for structured diagnosis, confidence, suggested changes and a safe repair summary. The UI keeps loading, empty, error and retry states.
- **Preview/publishing boundary:** Preview is rendered as a product surface with generated page cards and a browser-like frame. Publish/domain/APK actions create explicit queued/status records and explain when an external integration is not configured.
- **Route manifest:** Add `/manus-routes.json` with `/`, `/projects`, `/templates`, `/preview`, `/domains`, `/publishing`, and `/mobile-builds`.
- **Diagnostics and delivery:** Register TypeScript post-edit diagnostics before source edits, run typecheck/build, start the development server on port 3000, inspect the preview, commit to the managed main branch, and retain unresolved provider integrations as visible blockers rather than hiding them.

## Project structure

- `client/src/App.tsx`: authenticated route shell and workspace routing.
- `client/src/pages/Home.tsx`: dashboard overview and AI generation entry point.
- `client/src/pages/Workspace.tsx`: project generation, preview, bug fix and deployment tabs.
- `client/src/pages/Templates.tsx`: marketplace browsing and template actions.
- `client/src/pages/Settings.tsx`: domain and build configuration surfaces.
- `client/src/components/`: navigation, stat cards, activity timeline, preview frame, status badges and reusable form UI.
- `server/routers.ts`: protected tRPC procedures for product actions.
- `server/db.ts`: typed queries and seed/read helpers.
- `drizzle/schema.ts` and `drizzle/`: application schema and additive migration.
- `public/manus-routes.json`: route declarations.

## Design direction

### Considered styles

1. **Obsidian command center** — dark product workspace with electric violet signals and dense build telemetry. Probability: 0.07.
2. **Soft SaaS canvas** — pale neutral surfaces, friendly blue accents and spacious card-led workflows. Probability: 0.06.
3. **Signal glass lab** — charcoal canvas, frosted panels, lime/indigo status signals and technical instrumentation. Probability: 0.08.

### Chosen: Signal glass lab

- **Design movement:** modern developer-tool brutalism softened by translucent glass panels and instrument-panel hierarchy.
- **Core principles:** make build state visible; prioritize action over decoration; use generous breathing room around dense data; make AI output feel inspectable and trustworthy.
- **Color philosophy:** a near-black ink background anchors focus; indigo communicates intelligence and orchestration; acid-lime is reserved for healthy/ready states; warm amber flags attention without looking like failure.
- **Layout paradigm:** a fixed slim navigation rail feeds a wide command canvas with a split hero—creation on the left, system pulse on the right—followed by asymmetric activity and template lanes rather than generic centered grids.
- **Signature elements:** thin luminous divider lines, compact telemetry pills, and a small prism-like “spark” mark for AI-generated actions.
- **Interaction philosophy:** every primary action exposes its next state; toggles and buttons use short, confident labels; AI suggestions are framed as reviewable proposals, never invisible magic.
- **Animation:** use restrained 150–220ms transitions, soft panel rise on workspace entry, and animated progress bars only for active jobs; avoid looping decoration.
- **Typography system:** Geist/Inter-like sans for UI, strong 28–40px display headings, 12px uppercase telemetry labels with letter spacing, and monospace only for logs, package names and code-like output.
- **Brand essence:** “Turn one product idea into a build-ready app plan.” Personality: focused, transparent, capable.
- **Brand voice:** direct and calm. Example lines: “Describe the product. We’ll map the build.” / “Nothing ships silently—review every AI change.”
- **Wordmark & logo:** a compact prism spark made from three offset rounded bars beside the `forge` wordmark; the bars represent pages, data and deployment converging.
- **Signature brand color:** electric indigo `#7167FF`, paired with acid-lime readiness accents.

## Required behavior and boundaries

The app must require real Manus OAuth for protected dashboard data, use secure session behavior from the starter, preserve authentication boundaries, and never claim that an unconfigured publish/domain/APK provider completed successfully. AI failures must retain the input and provide retry. Database writes must be user-scoped. The first deliverable is the MVP control center; provider-specific deploy workers, DNS APIs and Android signing credentials can be connected later without redesigning the product surfaces.
