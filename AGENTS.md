# Projectory — AGENTS.md

Next.js 14 App Router client-first SPA with API layer for OpenCode tooling. `'use client'` on every page/component — no RSC.

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server |
| `npm run build` | **Only verification** — no lint/test/typecheck scripts exist |

## Architecture

- **State**: Single `page.js` owns all state (`useState` + `useCallback`), passes handlers as props
- **Persistence**: `localStorage` key `projectory_projects`, seed flag `projectory_seeded_v2`
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
| `scripts/projectory-cli.mjs` | CLI tool to manage projects via the API |
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
| `GET` | `/api/projects/poll` | Get `data/projects.json` mtime for live-sync polling |
| `GET` | `/api/projects/[id]` | Get a single project |
| `PATCH` | `/api/projects/[id]` | Partial update of a project (notes, status, deadline, etc.) |
| `DELETE` | `/api/projects/[id]` | Delete a project |
| `POST` | `/api/projects/[id]/todos` | Add a todo to a project |
| `PATCH` | `/api/projects/[id]/todos/[todoId]` | Update/toggle a todo |
| `DELETE` | `/api/projects/[id]/todos/[todoId]` | Remove a todo |

- **Storage**: File-based at `data/projects.json` (Next.js server-side only)
- **Client sync**: `saveProjects()` automatically syncs to API via `PUT /api/projects` (best-effort, silent failure)
- **Live sync**: `page.js` polls `GET /api/projects/poll` every 3s. When mtime differs, it re-fetches projects from API and updates localStorage + state. Changes from write tools appear live without page refresh.
- **CLI**: `node scripts/projectory-cli.mjs list` — set `PROJECTORY_API` env var for custom port

## OpenCode Tools

Tools are defined in `.opencode/tools/projectory.ts`. Available tools:

| Tool | Description |
|------|-------------|
| `projectory_read_projects` | List all projects |
| `projectory_read_project` | Get full project detail by ID |
| `projectory_read_todos` | Get todos for a project (filtered) |
| `projectory_toggle_todo` | Toggle a todo's done/undone status |
| `projectory_update_todo` | Update a todo's text/priority/details |
| `projectory_add_todo` | Add a new todo to a project |
| `projectory_remove_todo` | Remove a todo from a project |
| `projectory_update_project` | Update project fields (notes, status, deadline, title, etc.) |

- **Import** from `.opencode/tools/projectory.ts` in the `apiFetch` helper
- **Server must be running** (`npm run dev`) for API-based tools
- **Write tools** modify `data/projects.json` via the API — the browser detects the change via polling (3s interval) and updates live

## Versioning

- **Scheme**: `MAJOR.MINOR.PATCH` (semver)
- **Current**: `0.4.0` — Write tools (toggle/update/add/remove todo, update project) + live-sync polling
- **Location**: `version` field in `package.json`
- **Process**: Bump before commit after build verification. `npm run build` must pass.
- **Commit pattern**: `v<version> — <short summary>` (e.g. `v0.1.1 — perf fixes, API routing, Settings cleanup`)

## Gotchas

- **No outer AnimatePresence** — `page.js` no longer wraps the dashboard↔detail transition in `AnimatePresence`. The grid disappears instantly when `selectedProject` changes; the detail gets a simple 150ms opacity fade-in. No `mode="wait"`/`mode="popLayout"` to block or overlap.
