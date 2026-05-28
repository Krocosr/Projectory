# Deadliner — AGENTS.md

Next.js 14 App Router client-first SPA with API layer for OpenCode tooling. `'use client'` on every page/component — no RSC.

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
| `src/lib/storage.js` | `loadProjects()`, `saveProjects()` (returns `{success,error}`), `createTodo()`, `addTodoToProject()`, `toggleTodo()`, `removeTodo()` |
| `src/lib/constants.js` | `STATUSES`, `STATUS_COLORS`, `STATUS_STYLES`, `STATUS_BG`, `PRIORITY_STYLES`, `Z_INDEX`, `AUTO_SAVE_DEBOUNCE_MS` |
| `src/lib/dateUtils.js` | `formatDeadlineForDisplay()`, `formatRelativeTime()`, `toDateInputValue()` |
| `src/lib/migrations.js` | Versioned localStorage migration system (`runMigrations`, `needsMigration`) |
| `src/lib/fileStorage.js` | API-side file I/O for `data/projects.json` (used by API routes) |
| `src/app/api/projects/` | REST API endpoints for OpenCode tooling access |
| `scripts/deadliner-cli.mjs` | CLI tool to manage projects via the API |
| `src/components/` | 4 components: `DashboardHeader`, `NewProjectModal`, `ProjectCard`, `ProjectDetailView` |

## Gotchas

- **All components are `'use client'`** — even the leaf ones. Do not assume RSC patterns.
- **No TypeScript** — plain `.jsx`, no prop types, no JSDoc conventions
- **No test framework** installed — verification is manual or via `npm run build`
- **`createProject()`** (data.js) is the sole ID generator — modal should NOT set its own ID
- **`defaultForm`** imports from `@/app/data` — never duplicate it in modal
- **Notes auto-save**: 600ms debounce in `WorkspaceTab`. Uses `useRef` for latest project to prevent stale closures
- **FAB z-index** is `40` (Z_INDEX.FAB) — must stay below modal backdrop (`50`, Z_INDEX.MODAL)
- **`@/` alias** maps to `src/` (configured in `jsconfig.json`)
- **`STATUSES`** is centralized in `@/lib/constants` (includes 'Archived') — do not redefine elsewhere
- **Deadline format**: Seed data uses ISO (`YYYY-MM-DD`). Settings tab uses `toDateInputValue()` for input field conversion. Display via `formatDeadlineForDisplay()`.
- **`saveProjects()`** returns `{success: boolean, error?: string}` — check `result.success` before reading `result.error`
- **Focus restoration**: `lastFocusedCardIdRef` (useRef) in page.js stores last clicked card ID; restored on back navigation via `requestAnimationFrame` retry loop
- **Search debounce**: Uses `useDeferredValue` (React 18) in page.js — filter list lags behind input typing, keeping UI responsive
- **Notes auto-save cleanup**: On tab switch, saves notes synchronously via effect cleanup (prevents data loss from 600ms debounce). Uses `projectRef` for fresh closure.
- **PropTypes**: Used in `DashboardHeader`, `NewProjectModal`, `ProjectCard`, `ProjectDetailView`, `ErrorBoundary`
- **Context menu** positioning uses `position: fixed` with `clientX/clientY` (correct for viewport). ProjectCard trigger via right-click or "More" button (aria-haspopup="menu"). TodoItem trigger via right-click only.
- **Progress bars** have `role="progressbar"`, `aria-valuenow/min/max`, `aria-label` on both ProjectCard and ProjectDetailView

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create or update a single project |
| `PUT` | `/api/projects` | Replace all projects (bulk sync) |
| `GET` | `/api/projects/[id]` | Get a single project |
| `PATCH` | `/api/projects/[id]` | Partial update of a project |
| `DELETE` | `/api/projects/[id]` | Delete a project |

- **Storage**: File-based at `data/projects.json` (Next.js server-side only)
- **Client sync**: `saveProjects()` automatically syncs to API via `PUT /api/projects` (best-effort, silent failure)
- **CLI**: `node scripts/deadliner-cli.mjs list` — set `DEADLINER_API` env var for custom port

## Versioning

- **Scheme**: `MAJOR.MINOR.PATCH` (semver)
- **Current**: `0.3.0` — console.log cleanup, SettingsTab duplicate fix, recalculateProject consistency
- **Location**: `version` field in `package.json`
- **Process**: Bump before commit after build verification. `npm run build` must pass.
- **Commit pattern**: `v<version> — <short summary>` (e.g. `v0.1.1 — perf fixes, API routing, Settings cleanup`)

## Gotchas

- **No outer AnimatePresence** — `page.js` no longer wraps the dashboard↔detail transition in `AnimatePresence`. The grid disappears instantly when `selectedProject` changes; the detail gets a simple 150ms opacity fade-in. No `mode="wait"`/`mode="popLayout"` to block or overlap.

## Known Bug (Fixed): Blank page / filter overlay on dashboard↔detail navigation

**Root cause**: Outer `AnimatePresence mode="wait"` blocked the detail view from mounting until the grid's exit animation completed. A re-render during the exit (from URL race, auto-save, filter change) could restart/cancel the exit, leaving the detail perpetually unmounted (blank page). With `mode="popLayout"`, the grid stayed absolute-positioned behind the entering detail, causing a "project over dashboard" visual overlap when filters were active.

**Fix (v0.2.0)**: Removed outer `AnimatePresence` entirely. Grid disappears instantly on navigation. Detail fades in via standalone `motion.div`. This eliminates the animation race, the blank page, and the overlay issue simultaneously. Paired with `pendingNavigateHomeRef` guard and stable `projectParam` dependency in `searchParams` effect to handle URL race conditions.
