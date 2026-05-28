---
name: deadliner-read
description: "Use when working with the Deadliner project manager app — reading projects, todos, and project data via the API or data files. Covers API endpoints, data models for Project and Todo objects, and the available deadliner_read_* tools. Also use when asked to analyze project progress, summarize todos, or inspect project details."
---

# Deadliner Read Skill

Deadliner is a Next.js 14 client-first SPA project manager. Data is persisted to `localStorage` in the browser and synced to `data/projects.json` on disk via the API.

## Prerequisite

The server must be running for tools to work. Start the dev server with (only if server is not already running):

```bash
npm run dev
```

By default, the API listens on `http://localhost:3000`. Set `DEADLINER_API` env var to use a different port.

## Available Tools

Three tools are registered under the `deadliner` namespace:

| Tool | Description |
|------|-------------|
| `deadliner_read_projects` | List all projects with summary (title, status, progress %, todo counts) |
| `deadliner_read_project` | Get full project detail by ID (all fields, todos, timeline, notes, links, assets) |
| `deadliner_read_todos` | Get todos for a project, optionally filtered by `all`, `pending`, or `done` |

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

## Data Model

### Project

```typescript
{
  id: number | string,       // Date.now() for user projects, 'seed-N' for seed data
  title: string,
  status: 'Active' | 'Paused' | 'Incubating' | 'Waiting' | 'Finished' | 'Archived',
  progress: number,          // 0-100
  lastWorked: string,        // e.g. "2h ago", "just now"
  todoCount: number,
  nextStep: string,
  goal: string,
  currentFocus: string,
  deadline: string,          // ISO date string or "Ongoing" / "Completed"
  description: string,
  todos: Todo[],
  notes: string,
  links: { url: string, title: string }[],
  assets: { name: string, url?: string, addedAt: string }[],
  timeline: { date: string, action: string }[],
}
```

### Todo

```typescript
{
  id: number,                    // Date.now() + Math.random()
  text: string,
  priority: 'High' | 'Medium' | 'Low',
  details: string,
  done: boolean,
  createdAt: string,             // ISO timestamp
}
```

## Statuses

The 6 project statuses and their meanings:

| Status | Meaning |
|--------|---------|
| Active | Currently being worked on |
| Paused | Temporarily on hold |
| Incubating | Early idea phase |
| Waiting | Blocked / awaiting something |
| Finished | Complete |
| Archived | Stored for reference |

## Examples

**List all projects:**
```
deadliner_read_projects
```

**Get full detail for a specific project:**
```
deadliner_read_project({ id: "seed-1" })
```

**Get only pending todos:**
```
deadliner_read_todos({ projectId: "seed-1", filter: "pending" })
```

## File Fallback

If the dev server is not running, read `data/projects.json` directly from the project root. The file contains the same `Project[]` array format.
