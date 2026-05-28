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

// --- Write Tools ---

export const toggle_todo = tool({
  description: "Toggle a todo's done/completed status in a Deadliner project. Changes appear live in the browser.",
  args: {
    projectId: tool.schema.string().describe("The project ID (e.g. 'seed-1')"),
    todoId: tool.schema.string().describe("The todo ID to toggle (e.g. '101')"),
    done: tool.schema.boolean().optional().describe("Set to true to mark done, false to unmark. Omit to toggle."),
  },
  async execute(args) {
    const { projectId } = args
    const data = await apiFetch(`/${encodeURIComponent(projectId)}`)
    const project = data.project
    const todo = (project.todos || []).find((t: any) => String(t.id) === args.todoId)
    if (!todo) throw new Error(`Todo ${args.todoId} not found in project ${projectId}`)

    const done = args.done !== undefined ? args.done : !todo.done
    const result = await apiFetch(`/${encodeURIComponent(projectId)}/todos/${encodeURIComponent(args.todoId)}`, {
      method: "PATCH",
      body: JSON.stringify({ done }),
    })
    return {
      todo: result.todo,
      message: done ? `Marked todo "${todo.text}" as done` : `Reopened todo "${todo.text}"`,
    }
  },
})

export const update_todo = tool({
  description: "Update a todo's text, priority, or details in a Deadliner project. Changes appear live in the browser.",
  args: {
    projectId: tool.schema.string().describe("The project ID (e.g. 'seed-1')"),
    todoId: tool.schema.string().describe("The todo ID to update"),
    text: tool.schema.string().optional().describe("New text for the todo"),
    priority: tool.schema.string().optional().describe("Priority: 'High', 'Medium', or 'Low'"),
    details: tool.schema.string().optional().describe("New details/description for the todo"),
  },
  async execute(args) {
    const { projectId, todoId, ...updates } = args
    const result = await apiFetch(`/${encodeURIComponent(projectId)}/todos/${encodeURIComponent(todoId)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    })
    return { todo: result.todo, message: `Updated todo in project ${projectId}` }
  },
})

export const add_todo = tool({
  description: "Add a new todo to a Deadliner project. Changes appear live in the browser.",
  args: {
    projectId: tool.schema.string().describe("The project ID (e.g. 'seed-1')"),
    text: tool.schema.string().describe("The todo description"),
    priority: tool.schema.string().optional().describe("Priority: 'High', 'Medium' (default), or 'Low'"),
    details: tool.schema.string().optional().describe("Optional detailed description"),
  },
  async execute(args) {
    const { projectId, text, priority, details } = args
    const result = await apiFetch(`/${encodeURIComponent(projectId)}/todos`, {
      method: "POST",
      body: JSON.stringify({ text, priority, details }),
    })
    return {
      todo: result.todo,
      message: `Added todo "${text}" to project ${projectId}`,
    }
  },
})

export const remove_todo = tool({
  description: "Remove/delete a todo from a Deadliner project. Changes appear live in the browser.",
  args: {
    projectId: tool.schema.string().describe("The project ID (e.g. 'seed-1')"),
    todoId: tool.schema.string().describe("The todo ID to remove"),
  },
  async execute(args) {
    const { projectId, todoId } = args
    const result = await apiFetch(`/${encodeURIComponent(projectId)}/todos/${encodeURIComponent(todoId)}`, {
      method: "DELETE",
    })
    return { message: `Removed todo from project ${projectId}`, project: result.project }
  },
})

export const update_project = tool({
  description: "Update a Deadliner project's fields (notes, status, deadline, goal, description, etc.). Changes appear live in the browser.",
  args: {
    projectId: tool.schema.string().describe("The project ID (e.g. 'seed-1')"),
    notes: tool.schema.string().optional().describe("New notes content for the project"),
    status: tool.schema.string().optional().describe("Project status: 'Active', 'Paused', 'Incubating', 'Waiting', 'Finished', or 'Archived'"),
    deadline: tool.schema.string().optional().describe("Deadline (ISO date string like '2026-07-01' or 'Ongoing'/'Completed')"),
    goal: tool.schema.string().optional().describe("Project goal statement"),
    title: tool.schema.string().optional().describe("Project title"),
    description: tool.schema.string().optional().describe("Project description"),
    currentFocus: tool.schema.string().optional().describe("Current focus area"),
    nextStep: tool.schema.string().optional().describe("Next step text"),
    lastWorked: tool.schema.string().optional().describe("Last worked timestamp (e.g. 'just now')"),
  },
  async execute(args) {
    const { projectId, ...updates } = args
    const result = await apiFetch(`/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    })
    return { project: result.project, message: `Updated project ${projectId}` }
  },
})
