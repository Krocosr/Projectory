import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { join, dirname } from "path"
import { fileURLToPath, pathToFileURL } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const ENV_API = process.env.DEADLINER_API || process.env.PROJECTORY_API || ""
let API_BASE = ENV_API

let fileStorage = null

function fileUrl(p) {
  return pathToFileURL(p).href
}

async function loadFileStorage() {
  if (fileStorage) return fileStorage
  try {
    const mod = await import(fileUrl(join(__dirname, "..", "src", "lib", "fileStorage.js")))
    fileStorage = mod
    return fileStorage
  } catch (e) {
    console.error("Failed to load fileStorage module:", e.message)
    return null
  }
}

async function api(path, options = {}) {
  if (!API_BASE) throw new Error("No API base URL configured")
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(5000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `API error: ${res.status}`)
  return data
}

async function discoverApiUrl() {
  if (ENV_API) return
  const ports = [process.env.PORT && parseInt(process.env.PORT, 10), 3000, 3001, 3002, 3003, 3004, 3005, 4000, 5000, 7000, 8080, 9000].filter(Boolean)
  const tried = new Set()
  for (const port of ports) {
    if (tried.has(port)) continue; tried.add(port)
    try {
      const res = await fetch(`http://localhost:${port}/api/projects`, { signal: AbortSignal.timeout(800) })
      if (res.ok) {
        API_BASE = `http://localhost:${port}/api/projects`
        console.error(`Discovered API at ${API_BASE}`)
        return
      }
    } catch {}
  }
  console.error("No API server found")
}

function formatProjectSummary(p) {
  const done = (p.todos || []).filter(t => t.done).length
  const total = (p.todos || []).length
  return `[${p.id}] ${p.title} (${p.status || "No Status"}) — ${done}/${total} todos done${p.deadline ? ` — ${p.deadline}` : ""}`
}

function formatProjectDetail(p) {
  const done = (p.todos || []).filter(t => t.done).length
  const total = (p.todos || []).length
  return [
    `# ${p.title}`,
    `Status: ${p.status || "No Status"} | Progress: ${done}/${total} todos done`,
    p.goal ? `Goal: ${p.goal}` : null,
    p.deadline ? `Deadline: ${p.deadline}` : null,
    p.description ? `\n${p.description}` : null,
    p.currentFocus ? `\nFocus: ${p.currentFocus}` : null,
    p.nextStep ? `Next: ${p.nextStep}` : null,
    p.notes ? `\nNotes:\n${p.notes}` : null,
    `\nTodos (${total}):`,
    ...(p.todos || []).map(t => `  [${t.id}] ${t.done ? "✓" : "○"} ${t.text} (${t.priority || "Medium"})${t.details ? ` — ${t.details}` : ""}`),
  ].filter(Boolean).join("\n")
}

async function listProjectsViaApi() {
  const data = await api("")
  return data.projects || []
}

async function getProjectViaApi(id) {
  const data = await api(`/${encodeURIComponent(id)}`)
  return data.project
}

const server = new Server(
  { name: "deadliner-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_projects",
      description: "List all projects with summary info (status, progress, todo counts)",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_project",
      description: "Get full details of a single project by ID",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", description: "Project ID" } },
        required: ["id"],
      },
    },
    {
      name: "list_todos",
      description: "Get todos for a project, optionally filtered by status",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          filter: { type: "string", enum: ["all", "pending", "done"], description: "Filter todos (default: all)" },
        },
        required: ["projectId"],
      },
    },
    {
      name: "add_todo",
      description: "Add a new todo to a project",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          text: { type: "string", description: "Todo text" },
          priority: { type: "string", enum: ["High", "Medium", "Low"], description: "Priority (default: Medium)" },
          details: { type: "string", description: "Optional details" },
        },
        required: ["projectId", "text"],
      },
    },
    {
      name: "toggle_todo",
      description: "Toggle a todo's done/completed status",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          todoId: { type: "string", description: "Todo ID to toggle" },
          done: { type: "boolean", description: "Set to true/false to explicitly set, omit to toggle" },
        },
        required: ["projectId", "todoId"],
      },
    },
    {
      name: "update_todo",
      description: "Update a todo's text, priority, or details",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          todoId: { type: "string", description: "Todo ID to update" },
          text: { type: "string", description: "New text" },
          priority: { type: "string", enum: ["High", "Medium", "Low"], description: "New priority" },
          details: { type: "string", description: "New details" },
        },
        required: ["projectId", "todoId"],
      },
    },
    {
      name: "remove_todo",
      description: "Remove/delete a todo from a project",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          todoId: { type: "string", description: "Todo ID to remove" },
        },
        required: ["projectId", "todoId"],
      },
    },
    {
      name: "update_project",
      description: "Update a project's fields (status, notes, deadline, goal, title, etc.)",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          title: { type: "string", description: "New title" },
          status: { type: "string", enum: ["Active", "Paused", "Incubating", "Waiting", "Finished", "Archived"], description: "New status" },
          goal: { type: "string", description: "Goal statement" },
          deadline: { type: "string", description: "Deadline (ISO date, 'Ongoing', or 'Completed')" },
          notes: { type: "string", description: "Notes content" },
          description: { type: "string", description: "Description" },
          currentFocus: { type: "string", description: "Current focus area" },
          nextStep: { type: "string", description: "Next step" },
        },
        required: ["projectId"],
      },
    },
  ],
}))

function isApiAvailable() {
  return !!API_BASE
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case "list_projects": {
        if (isApiAvailable()) {
          const projects = await listProjectsViaApi()
          return {
            content: [{ type: "text", text: projects.length === 0 ? "No projects found." : projects.map(formatProjectSummary).join("\n") }],
          }
        }
        const fs = await loadFileStorage()
        const projects = fs.readProjects()
        return {
          content: [{ type: "text", text: projects.length === 0 ? "No projects found." : projects.map(formatProjectSummary).join("\n") }],
        }
      }

      case "get_project": {
        if (isApiAvailable()) {
          const project = await getProjectViaApi(args.id)
          return { content: [{ type: "text", text: formatProjectDetail(project) }] }
        }
        const fs = await loadFileStorage()
        const projects = fs.readProjects()
        const project = projects.find(p => String(p.id) === String(args.id))
        if (!project) throw new Error(`Project ${args.id} not found`)
        return { content: [{ type: "text", text: formatProjectDetail(project) }] }
      }

      case "list_todos": {
        if (isApiAvailable()) {
          const project = await getProjectViaApi(args.projectId)
          let todos = project.todos || []
          if (args.filter === "pending") todos = todos.filter(t => !t.done)
          if (args.filter === "done") todos = todos.filter(t => t.done)
          const label = args.filter || "all"
          const lines = [
            `Todos for "${project.title}" (${todos.length}/${(project.todos || []).length} — filter: ${label}):`,
            ...todos.map(t => `  [${t.id}] ${t.done ? "✓" : "○"} ${t.text} (${t.priority || "Medium"})${t.details ? ` — ${t.details}` : ""}`),
            todos.length === 0 ? "  (none)" : null,
          ].filter(Boolean).join("\n")
          return { content: [{ type: "text", text: lines }] }
        }
        const fs = await loadFileStorage()
        const projects = fs.readProjects()
        const project = projects.find(p => String(p.id) === String(args.projectId))
        if (!project) throw new Error(`Project ${args.projectId} not found`)
        let todos = project.todos || []
        if (args.filter === "pending") todos = todos.filter(t => !t.done)
        if (args.filter === "done") todos = todos.filter(t => t.done)
        const label = args.filter || "all"
        const lines = [
          `Todos for "${project.title}" (${todos.length}/${(project.todos || []).length} — filter: ${label}):`,
          ...todos.map(t => `  [${t.id}] ${t.done ? "✓" : "○"} ${t.text} (${t.priority || "Medium"})${t.details ? ` — ${t.details}` : ""}`),
          todos.length === 0 ? "  (none)" : null,
        ].filter(Boolean).join("\n")
        return { content: [{ type: "text", text: lines }] }
      }

      case "add_todo": {
        if (isApiAvailable()) {
          await api(`/${encodeURIComponent(args.projectId)}/todos`, {
            method: "POST",
            body: JSON.stringify({ text: args.text, priority: args.priority, details: args.details }),
          })
        } else {
          const fs = await loadFileStorage()
          const { recalculateProject } = await import(fileUrl(join(__dirname, "..", "src", "lib", "storage.js")))
          const projects = fs.readProjects()
          const idx = projects.findIndex(p => String(p.id) === String(args.projectId))
          if (idx === -1) throw new Error(`Project ${args.projectId} not found`)
          const todo = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            text: args.text,
            priority: args.priority || "Medium",
            details: args.details || "",
            done: false,
            createdAt: new Date().toISOString(),
          }
          projects[idx].todos = [...(projects[idx].todos || []), todo]
          projects[idx] = recalculateProject(projects[idx])
          fs.writeProjects(projects)
        }
        return { content: [{ type: "text", text: `Added todo "${args.text}" to project ${args.projectId}` }] }
      }

      case "toggle_todo": {
        if (isApiAvailable()) {
          const done = args.done !== undefined ? args.done : (() => {
            throw new Error("toggle_todo via API requires explicit 'done' boolean")
          })()
          await api(`/${encodeURIComponent(args.projectId)}/todos/${encodeURIComponent(args.todoId)}`, {
            method: "PATCH",
            body: JSON.stringify({ done }),
          })
        } else {
          const fs = await loadFileStorage()
          const { recalculateProject } = await import(fileUrl(join(__dirname, "..", "src", "lib", "storage.js")))
          const projects = fs.readProjects()
          const project = projects.find(p => String(p.id) === String(args.projectId))
          if (!project) throw new Error(`Project ${args.projectId} not found`)
          const todo = (project.todos || []).find(t => String(t.id) === args.todoId)
          if (!todo) throw new Error(`Todo ${args.todoId} not found`)
          const done = args.done !== undefined ? args.done : !todo.done
          todo.done = done
          todo.completedAt = done ? new Date().toISOString() : null
          const idx = projects.findIndex(p => String(p.id) === String(args.projectId))
          projects[idx] = recalculateProject(project)
          fs.writeProjects(projects)
        }
        return { content: [{ type: "text", text: `Toggled todo ${args.todoId} in project ${args.projectId}` }] }
      }

      case "update_todo": {
        const { projectId, todoId, ...updates } = args
        if (isApiAvailable()) {
          await api(`/${encodeURIComponent(projectId)}/todos/${encodeURIComponent(todoId)}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
          })
        } else {
          const fs = await loadFileStorage()
          const { recalculateProject } = await import(fileUrl(join(__dirname, "..", "src", "lib", "storage.js")))
          const projects = fs.readProjects()
          const project = projects.find(p => String(p.id) === String(projectId))
          if (!project) throw new Error(`Project ${projectId} not found`)
          const todo = (project.todos || []).find(t => String(t.id) === todoId)
          if (!todo) throw new Error(`Todo ${todoId} not found`)
          Object.assign(todo, updates)
          const idx = projects.findIndex(p => String(p.id) === String(projectId))
          projects[idx] = recalculateProject(project)
          fs.writeProjects(projects)
        }
        return { content: [{ type: "text", text: `Updated todo ${todoId} in project ${projectId}` }] }
      }

      case "remove_todo": {
        if (isApiAvailable()) {
          await api(`/${encodeURIComponent(args.projectId)}/todos/${encodeURIComponent(args.todoId)}`, {
            method: "DELETE",
          })
        } else {
          const fs = await loadFileStorage()
          const { recalculateProject } = await import(fileUrl(join(__dirname, "..", "src", "lib", "storage.js")))
          const projects = fs.readProjects()
          const project = projects.find(p => String(p.id) === String(args.projectId))
          if (!project) throw new Error(`Project ${args.projectId} not found`)
          project.todos = (project.todos || []).filter(t => String(t.id) !== args.todoId)
          const idx = projects.findIndex(p => String(p.id) === String(args.projectId))
          projects[idx] = recalculateProject(project)
          fs.writeProjects(projects)
        }
        return { content: [{ type: "text", text: `Removed todo ${args.todoId} from project ${args.projectId}` }] }
      }

      case "update_project": {
        const { projectId, ...updates } = args
        if (isApiAvailable()) {
          await api(`/${encodeURIComponent(projectId)}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
          })
        } else {
          const fs = await loadFileStorage()
          const { recalculateProject } = await import(fileUrl(join(__dirname, "..", "src", "lib", "storage.js")))
          const projects = fs.readProjects()
          const idx = projects.findIndex(p => String(p.id) === String(projectId))
          if (idx === -1) throw new Error(`Project ${projectId} not found`)
          projects[idx] = recalculateProject({ ...projects[idx], ...updates })
          fs.writeProjects(projects)
        }
        return { content: [{ type: "text", text: `Updated project ${projectId}` }] }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    }
  }
})

async function main() {
  await discoverApiUrl()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("Deadliner MCP server running on stdio")
  if (isApiAvailable()) {
    console.error(`Storage: API (${API_BASE})`)
  } else {
    const fs = await loadFileStorage()
    if (fs) {
      console.error("Storage: fileStorage module (no API server)")
    } else {
      console.error("Storage: UNAVAILABLE — start the dev server or ensure src/lib/fileStorage.js exists")
    }
  }
}

main().catch((error) => {
  console.error("Server error:", error)
  process.exit(1)
})
