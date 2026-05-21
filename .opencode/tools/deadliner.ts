import { tool } from "@opencode-ai/plugin"

const API_BASE = process.env.DEADLINER_API || "http://localhost:3000/api/projects"

async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const read_projects = tool({
  description: "List all projects from the Deadliner project manager with summary info",
  args: {},
  async execute() {
    const data = await apiFetch("")
    const projects = data.projects
    if (!projects || projects.length === 0) return { projects: [], count: 0 }
    return {
      count: projects.length,
      projects: projects.map((p: any) => ({
        id: p.id,
        title: p.title,
        status: p.status || "No Status",
        progress: p.progress ?? (p.todos
          ? Math.round((p.todos.filter((t: any) => t.done).length / p.todos.length) * 100)
          : 0),
        todoCount: p.todoCount ?? p.todos?.length ?? 0,
        doneCount: p.todos?.filter((t: any) => t.done).length ?? 0,
        currentFocus: p.currentFocus || "",
        nextStep: p.nextStep || "",
        deadline: p.deadline || "",
        lastWorked: p.lastWorked || "",
      })),
    }
  },
})

export const read_project = tool({
  description: "Get a single project's full details by ID from the Deadliner app",
  args: {
    id: tool.schema.string().describe("The project ID (e.g. 'seed-1' or a numeric ID)"),
  },
  async execute(args) {
    const data = await apiFetch(`/${encodeURIComponent(args.id)}`)
    return { project: data.project }
  },
})

export const read_todos = tool({
  description: "Get all todos for a project by ID from the Deadliner app",
  args: {
    projectId: tool.schema.string().describe("The project ID"),
    filter: tool.schema.string().optional().describe("Filter: 'all', 'pending', or 'done'. Defaults to 'all'"),
  },
  async execute(args) {
    const data = await apiFetch(`/${encodeURIComponent(args.projectId)}`)
    const project = data.project
    let todos = project.todos || []
    if (args.filter === "pending") todos = todos.filter((t: any) => !t.done)
    if (args.filter === "done") todos = todos.filter((t: any) => t.done)
    return {
      projectId: project.id,
      title: project.title,
      totalTodos: (project.todos || []).length,
      filteredCount: todos.length,
      todos: todos.map((t: any) => ({
        id: t.id,
        text: t.text,
        priority: t.priority || "Medium",
        details: t.details || "",
        done: t.done,
        createdAt: t.createdAt || "",
      })),
    }
  },
})
