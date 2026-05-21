# Deadliner — AGENTS.md

Next.js 14 App Router client-only SPA. `'use client'` on every page/component — no RSC, no API routes.

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server |
| `npm run build` | **Only verification** — no lint/test/typecheck scripts exist |

## Architecture

- **State**: Single `page.js` owns all state (`useState` + `useCallback`), passes handlers as props
- **Persistence**: `localStorage` key `deadliner_projects`, seed flag `deadliner_seeded_v2`
- **Routing**: `useSearchParams` with `?project=` query param. Requires `<Suspense>` boundary around `DashboardContent`
- **ID scheme**: `Date.now()` for projects, `Date.now() + Math.random()` for todos
- **Seed data**: Hardcoded IDs 1-8 in `src/app/data.js` — no conflict risk with user IDs

## Key files

| File | Purpose |
|------|---------|
| `src/app/page.js` | State hub, routing logic, all callbacks |
| `src/app/data.js` | `defaultForm`, `createProject()`, `seedProjects` array, `SEED_KEY` |
| `src/lib/storage.js` | `loadProjects()`, `saveProjects()`, `createTodo()`, `addTodoToProject()`, `toggleTodo()`, `removeTodo()` |
| `src/components/` | 4 components: `DashboardHeader`, `NewProjectModal`, `ProjectCard`, `ProjectDetailView` |

## Gotchas

- **All components are `'use client'`** — even the leaf ones. Do not assume RSC patterns.
- **No TypeScript** — plain `.jsx`, no prop types, no JSDoc conventions
- **No test framework** installed — verification is manual or via `npm run build`
- **`createProject()`** (data.js) is the sole ID generator — modal should NOT set its own ID
- **`defaultForm`** imports from `@/app/data` — never duplicate it in modal
- **Notes auto-save**: 600ms debounce in `WorkspaceTab`. Uses `useRef` for latest project to prevent stale closures
- **FAB z-index** is `z-40` — must stay below modal backdrop (`z-50`)
- **`@/` alias** maps to `src/` (configured in `jsconfig.json`)
