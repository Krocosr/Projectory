<p align="center">
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="Status" />
  <img src="https://img.shields.io/github/license/ariop/deadliner" alt="License" />
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind CSS" />
  <br/>
  <img src="https://img.shields.io/github/actions/workflow/status/ariop/deadliner/ci.yml?branch=master" alt="CI" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome" />
</p>

<h1 align="center">
  Projectory — Multi-Project Manager
</h1>

<p align="center">
  <b>A sleek, client-first SPA for juggling projects, todos, deadlines, and workspace notes — all in one place.</b><br/>
  Built with <b>Next.js 14</b> + <b>React 18</b>. Zero backend setup. Works offline. Syncs when online.
</p>

---

## Why Projectory?

Tired of context-switching between a dozen tabs? Projectory gives you a **single dashboard** to track every project you're working on — from software builds to home renovations.

| Problem | Projectory Fix |
|---------|---------------|
| Projects scattered everywhere | One card-grid dashboard with search & filter |
| Notes lost in random files | Per-project scratchpad with **auto-save** |
| Todos buried in chat logs | Drag-and-drop todos with priorities & deadlines |
| Deadlines sneak up on you | Clear timeline + overdue indicators |
| Distracting bright UIs | Built-in **dark mode** that sticks |



## Features

- **Dashboard** — Card grid with status badges, progress bars, inline search & filtering
- **Project Detail** — 5 tabbed views: Overview - Todos - Workspace - Timeline - Settings
- **Todo Manager** — Add, edit, reorder (drag & drop), toggle done, set priority, assign deadlines
- **Workspace (Notes)** — Per-project scratchpad with 600ms auto-save debounce
- **Link Library** — Save and organize per-project links & assets
- **Activity Timeline** — Auto-logged project activity
- **Dark Mode** — Toggleable, persisted, respects `prefers-color-scheme`
- **Data Import/Export** — JSON export/import via the dashboard header
- **Live Sync** — 3-second polling keeps the browser in sync with the API
- **Keyboard Shortcuts** — <kbd>/</kbd> to search, <kbd>n</kbd> for new project
- **Context Menus** — Right-click or "More" button on cards & todos
- **CLI Tool** — Manage everything from the terminal: `node scripts/projectory-cli.mjs list`

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **UI** | React 18 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 3 + CSS custom properties |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) |
| **Drag & Drop** | [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) |
| **State** | `useState` + `useCallback` (minimal, no Redux) |
| **Storage** | `localStorage` + file-based API (`data/projects.json`) |
| **Routing** | `useSearchParams` (`?project=`) |

---

## Quick Start

```bash
git clone https://github.com/ariop/deadliner.git
cd deadliner
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — seed data loads automatically on first visit.

### Production

```bash
npm run build
npm start
```

---

## API

Full REST API for external tooling, integrations, or the CLI:

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create or update a project |
| `PUT` | `/api/projects` | Bulk sync (replace all) |
| `GET` | `/api/projects/[id]` | Get single project |
| `PATCH` | `/api/projects/[id]` | Partial update (notes, status, etc.) |
| `DELETE` | `/api/projects/[id]` | Delete project |
| `POST` | `/api/projects/[id]/todos` | Add todo |
| `PATCH` | `/api/projects/[id]/todos/[todoId]` | Update/toggle todo |
| `DELETE` | `/api/projects/[id]/todos/[todoId]` | Remove todo |
| `GET` | `/api/projects/poll` | Poll for live-sync changes |

CLI: `node scripts/projectory-cli.mjs list` (set `PROJECTORY_API` env var for custom port)

---

## Project Structure

```
src/
├── app/
│   ├── api/projects/       # REST API routes (Next.js Route Handlers)
│   ├── data.js             # Seed data, default form, project factory
│   └── page.js             # Single-page state hub & routing
├── components/
│   ├── detail/              # Sub-components for the detail view
│   ├── DashboardHeader.jsx
│   ├── NewProjectModal.jsx
│   ├── ProjectCard.jsx
│   └── ProjectDetailView.jsx
├── lib/
│   ├── constants.js        # Statuses, colors, z-index tokens
│   ├── dateUtils.js        # Date formatting helpers
│   ├── fileStorage.js      # Server-side file I/O for API
│   ├── migrations.js       # localStorage schema migration
│   └── storage.js          # localStorage CRUD + API sync
data/
└── projects.json           # API data file (gitignored)
```

---

## Project Lifecycle

```
Active -> Paused -> Incubating -> Waiting -> Finished -> Archived
```

Each status has a distinct color badge and style. Move projects through the pipeline from the Settings tab.

---

## Contributing

PRs are welcome! If you've got an idea for a feature or found a bug, open an issue or submit a pull request.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes
4. Push (`git push origin feature/amazing`)
5. Open a Pull Request

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.
