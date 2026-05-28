# Deadliner — Multi-Project Manager

A client-first single-page application for managing multiple projects, todos, deadlines, and workspace notes. Built with Next.js 14 App Router and persisted to `localStorage`.

## Features

- **Project Dashboard** — card grid with status badges, progress bars, search/filter
- **Project Detail View** — 5 tabs: Overview, Todos, Workspace (notes), Timeline, Settings
- **Todo Management** — add, edit, reorder (drag-and-drop), toggle done, set priority
- **Scratchpad (Workspace)** — per-project notes with auto-save (600ms debounce)
- **Links & Assets** — per-project link library and asset tracking
- **Timeline** — auto-logged activity per project
- **Dark Mode** — toggleable, persisted, respects `prefers-color-scheme`
- **Data Import/Export** — JSON export and import via dashboard header
- **Keyboard Shortcuts** — `/` focuses search, `n` opens new project modal
- **Live Sync** — 3-second polling syncs changes from API to browser
- **Context Menus** — right-click or "More" button on cards and todos

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| UI Library | React 18 |
| State | `useState` + `useCallback` (no Redux/Zustand) |
| Persistence | `localStorage` + file-based API (`data/projects.json`) |
| Animation | Framer Motion |
| DnD | `@hello-pangea/dnd` |
| Styling | Tailwind CSS + CSS custom properties |
| Routing | `useSearchParams` (`?project=`) |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Seed data loads automatically on first visit.

### Production Build

```bash
npm run build
npm start
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create or update a project |
| `PUT` | `/api/projects` | Bulk sync all projects |
| `GET` | `/api/projects/[id]` | Get single project |
| `PATCH` | `/api/projects/[id]` | Partial update |
| `DELETE` | `/api/projects/[id]` | Delete project |
| `POST` | `/api/projects/[id]/todos` | Add todo |
| `PATCH` | `/api/projects/[id]/todos/[todoId]` | Update/toggle todo |
| `DELETE` | `/api/projects/[id]/todos/[todoId]` | Remove todo |
| `GET` | `/api/projects/poll` | Poll for live sync changes |

CLI tool: `node scripts/deadliner-cli.mjs list`

## Project Statuses

Active → Paused → Incubating → Waiting → Finished → Archived

## Project Structure

```
src/
├── app/
│   ├── api/projects/      # REST API routes
│   ├── data.js            # Seed data, defaultForm, createProject
│   └── page.js             # State hub, routing, all callbacks
├── components/
│   ├── detail/             # Project detail sub-components
│   ├── DashboardHeader.jsx
│   ├── NewProjectModal.jsx
│   ├── ProjectCard.jsx
│   └── ProjectDetailView.jsx
├── lib/
│   ├── constants.js        # Statuses, colors, z-index
│   ├── dateUtils.js        # Date formatting
│   ├── fileStorage.js      # API-side file I/O
│   ├── migrations.js       # localStorage migration system
│   └── storage.js          # localStorage CRUD + API sync
data/
└── projects.json           # API data file (gitignored)
```

## License

MIT
