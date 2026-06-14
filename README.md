<p align="center">
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="Status" />
  <img src="https://img.shields.io/github/license/Krocosr/Projectory" alt="License" />
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind CSS" />
  <br/>
  <img src="https://img.shields.io/github/actions/workflow/status/Krocosr/Projectory/ci.yml?branch=master" alt="CI" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome" />
</p>

<h1 align="center">
  Projectory — Multi-Project Manager
</h1>

<p align="center">
  <b>A sleek, client-first SPA for juggling projects, todos, deadlines, and workspace notes — all in one place.</b><br/>
  Built with <b>Next.js 14</b> + <b>React 18</b>. Zero backend setup. Works offline. Syncs when online.
</p>

<p align="center">
  <img src="/screenshot-dashboard.png" width="700" alt="Dashboard screenshot" />
</p>

---

## Why Only Specialized Features?

Projectory doesn't try to replace Jira, Notion, or Linear. Instead, it focuses on **what's genuinely useful** for a single developer managing multiple projects:

- **A dashboard that fits in one screen** — card grid, not a spreadsheet. See status, progress, deadline at a glance.
- **Todos with drag & drop** — reorder, prioritize, toggle. No heavy workflow engine.
- **Per-project scratchpad** — auto-saved notes per project, not a sprawling wiki.
- **No feature bloat** — intentionally absent: complex permissions, Gantt charts, integrations with 50+ services. If you need those, tools like Linear or Notion are a better fit. Projectory is for **your personal workflow**, not your company's.

---

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
- **Context Menus** — Right-click or "More" button on cards & todos
- **Workspace Launcher** (planned) — Launch multiple apps with a single click
- **CLI Tool** — Manage everything from the terminal: `node scripts/projectory-cli.mjs list`

<p align="center">
  <img src="/screenshot-detail.png" width="700" alt="Project detail screenshot" />
</p>

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **UI** | React 18 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 3 + CSS custom properties |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) |
| **Drag & Drop** | [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) + [@dnd-kit](https://dndkit.com/) |
| **State** | Zustand (`useProjectStore`) |
| **Storage** | `localStorage` + IndexedDB (Dexie) + file-based API |
| **Routing** | `useSearchParams` (`?project=`) |

---

## Quick Start

```bash
git clone https://github.com/Krocosr/Projectory.git
cd deadliner
npm install
npm run dev
```

Open **http://localhost:3000** (auto-probes next available port if busy) — seed data loads automatically on first visit.

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker compose up --build
```

---

## MCP Server (AI Integration)

Projectory includes a [Model Context Protocol](https://modelcontextprotocol.io/) server that lets AI assistants (Claude, OpenCode, etc.) read and write your project data directly.

### What it exposes

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects with progress & status |
| `get_project` | Full project details including todos |
| `list_todos` | Filtered todo list per project |
| `add_todo` | Create a new todo |
| `toggle_todo` | Mark/reopen a todo |
| `update_todo` | Edit todo text, priority, or details |
| `remove_todo` | Delete a todo |
| `update_project` | Update project fields |

### Setup

1. **Start the app** — the MCP server needs the API running:
   ```bash
   npm run dev
   ```

2. **Configure your client** — point it to the MCP server at `mcp-server/index.mjs`:

   **For Claude Desktop / OpenCode / any MCP client**, add to your `mcp.json` or client config:
   ```json
   {
     "mcpServers": {
       "deadliner": {
         "command": "node",
         "args": ["path/to/deadliner/mcp-server/index.mjs"]
       }
     }
   }
   ```

   The server auto-discovers the API port by scanning common ports. If your API is on a non-standard port, set the `DEADLINER_API` env var:
   ```json
   {
     "mcpServers": {
       "deadliner": {
         "command": "node",
         "args": ["path/to/deadliner/mcp-server/index.mjs"],
         "env": { "DEADLINER_API": "http://localhost:7000/api/projects" }
       }
     }
   }
   ```

   If you already have this project open in OpenCode, the included `.opencode/` config and `mcp.json` auto-register the MCP server.

3. **Done** — your AI assistant can now manage your projects and todos.

or
> **Copy-Paste this to your agent:** Read and follow the setup instructions at [README.md](https://raw.githubusercontent.com/Krocosr/Projectory/master/README.md) to configure yourself.

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
│   ├── detail/              # Detail view sub-components
│   ├── DashboardHeader.jsx
│   ├── NewProjectModal.jsx
│   ├── ProjectCard.jsx
│   └── ProjectDetailView.jsx
├── lib/
│   ├── constants.js        # Statuses, colors, z-index tokens
│   ├── dateUtils.js        # Date formatting helpers
│   ├── fileStorage.js      # Server-side file I/O
│   ├── migrations.js       # localStorage schema migration
│   ├── storage.js          # localStorage CRUD + API sync
│   ├── db.js               # IndexedDB (Dexie) layer
│   ├── validation.js       # Zod schemas for API validation
│   └── search.js           # Full-text search
data/
└── projects.json           # API data file (gitignored)
mcp-server/
├── package.json            # MCP server dependencies
└── index.mjs               # MCP server (8 tools)
mcp.json                    # MCP client config
```

---

## Project Status Sections

Projects are organized by status — each acts as a section, not a lifecycle step:

- **Active** — Currently being worked on
- **Paused** — On hold, will resume
- **Incubating** — Early idea, not yet started
- **Waiting** — Blocked by something external
- **Finished** — Done
- **Archived** — Hidden, auto-purges after 7 days

Each status has a distinct color badge. Filter or sort by status from the dashboard.

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
