import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

const ENV_API = process.env.DEADLINER_API || process.env.PROJECTORY_API || ""
let API_BASE = ENV_API

async function discoverApiUrl() {
  if (ENV_API) return
  const ports = [process.env.PORT && parseInt(process.env.PORT, 10), 3000, 3001, 3002, 3003, 3004, 3005, 4000, 5000, 7000, 8080, 9000].filter(Boolean)
  const tried = new Set()
  for (const port of ports) {
    if (tried.has(port)) continue; tried.add(port)
    const url = `http://localhost:${port}/api/projects`
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(800) })
      if (res.ok) {
        API_BASE = url
        console.error(`Discovered API at ${url}`)
        return
      }
    } catch {}
  }
  console.error("Could not discover Deadliner API. Set DEADLINER_API env var (e.g. DEADLINER_API=http://localhost:7000/api/projects).")
}

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
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
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_project",
      description: "Get full details of a single project by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Project ID" },
        },
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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case "list_projects": {
        const data = await api("")
        const projects = data.projects || []
        return {
          content: [{
            type: "text",
            text: projects.length === 0
              ? "No projects found."
              : projects.map(p => {
                  const done = (p.todos || []).filter(t => t.done).length
                  const total = (p.todos || []).length
                  return `[${p.id}] ${p.title} (${p.status || "No Status"}) — ${done}/${total} todos done${p.deadline ? ` — ${p.deadline}` : ""}`
                }).join("\n"),
          }],
        }
      }

      case "get_project": {
        const data = await api(`/${encodeURIComponent(args.id)}`)
        const p = data.project
        if (!p) throw new Error(`Project ${args.id} not found`)
        const done = (p.todos || []).filter(t => t.done).length
        const total = (p.todos || []).length
        const lines = [
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
        return { content: [{ type: "text", text: lines }] }
      }

      case "list_todos": {
        const data = await api(`/${encodeURIComponent(args.projectId)}`)
        const project = data.project
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
        const result = await api(`/${encodeURIComponent(args.projectId)}/todos`, {
          method: "POST",
          body: JSON.stringify({ text: args.text, priority: args.priority, details: args.details }),
        })
        return { content: [{ type: "text", text: `Added todo "${args.text}" to project ${args.projectId}` }] }
      }

      case "toggle_todo": {
        const data = await api(`/${encodeURIComponent(args.projectId)}`)
        const project = data.project
        const todo = (project.todos || []).find(t => String(t.id) === args.todoId)
        if (!todo) throw new Error(`Todo ${args.todoId} not found`)
        const done = args.done !== undefined ? args.done : !todo.done
        await api(`/${encodeURIComponent(args.projectId)}/todos/${encodeURIComponent(args.todoId)}`, {
          method: "PATCH",
          body: JSON.stringify({ done }),
        })
        const msg = done ? `Marked todo "${todo.text}" as done` : `Reopened todo "${todo.text}"`
        return { content: [{ type: "text", text: msg }] }
      }

      case "update_todo": {
        const { projectId, todoId, ...updates } = args
        await api(`/${encodeURIComponent(projectId)}/todos/${encodeURIComponent(todoId)}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        })
        return { content: [{ type: "text", text: `Updated todo ${todoId}` }] }
      }

      case "remove_todo": {
        await api(`/${encodeURIComponent(args.projectId)}/todos/${encodeURIComponent(args.todoId)}`, {
          method: "DELETE",
        })
        return { content: [{ type: "text", text: `Removed todo ${args.todoId} from project ${args.projectId}` }] }
      }

      case "update_project": {
        const { projectId, ...updates } = args
        await api(`/${encodeURIComponent(projectId)}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        })
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
}

main().catch((error) => {
  console.error("Server error:", error)
  process.exit(1)
})
