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

async function getAllProjects() {
  if (isApiAvailable()) {
    return await listProjectsViaApi()
  }
  const fs = await loadFileStorage()
  return fs.readProjects()
}

async function getProjectByIdHelper(id) {
  if (isApiAvailable()) {
    return await getProjectViaApi(id)
  }
  const fs = await loadFileStorage()
  const projects = fs.readProjects()
  return projects.find(p => String(p.id) === String(id))
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
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
        },
        required: ["projectId"],
      },
    },
    {
      name: "create_project",
      description: "Create a new project",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Project title" },
          status: { type: "string", enum: ["Active", "Paused", "Incubating", "Waiting", "Finished", "Archived"], description: "Project status (default: Active)" },
          goal: { type: "string", description: "Goal statement" },
          description: { type: "string", description: "Description" },
          deadline: { type: "string", description: "Deadline" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
          workingDir: { type: "string", description: "Working directory" },
        },
        required: ["title"],
      },
    },
    {
      name: "delete_project",
      description: "Delete a project permanently (requires confirm: true)",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          confirm: { type: "boolean", description: "Must be true to confirm deletion" },
        },
        required: ["projectId", "confirm"],
      },
    },
    {
      name: "search_todos",
      description: "Search todos across all projects by text, project, or status",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text to search for in todo title or details (case-insensitive)" },
          projectId: { type: "string", description: "Limit search to a specific project" },
          status: { type: "string", enum: ["pending", "done", "all"], description: "Filter by completion status (default: all)" },
        },
      },
    },
    {
      name: "stats",
      description: "Get project statistics across all projects or a single project",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Limit stats to a specific project" },
        },
      },
    },
    {
      name: "launch",
      description: "Manage launch items for a project — add, list, remove, or log start/stop in activity log",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add_item", "list_items", "remove_item", "start", "stop"], description: "Action to perform" },
          projectId: { type: "string", description: "Project ID" },
          itemId: { type: "string", description: "Launch item ID (for remove_item, start, stop)" },
          name: { type: "string", description: "Launch item name (for add_item)" },
          type: { type: "string", enum: ["app", "command"], description: "Item type (for add_item)" },
          path: { type: "string", description: "Path to executable (for add_item, type=app)" },
          command: { type: "string", description: "Command to run (for add_item, type=command)" },
          workingDir: { type: "string", description: "Working directory (for add_item)" },
          wait: { type: "boolean", description: "Wait for process to exit (for add_item, default: false)" },
          killOnStop: { type: "boolean", description: "Kill process on stop (for add_item, default: true)" },
        },
        required: ["action", "projectId"],
      },
    },
    {
      name: "timer",
      description: "Manage timer/pomodoro sessions for a project — get/update config, start/stop sessions",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["get_config", "update_config", "start_session", "stop_session"], description: "Action to perform" },
          projectId: { type: "string", description: "Project ID" },
          mode: { type: "string", enum: ["pomodoro", "countdown", "countup"], description: "Timer mode (for update_config)" },
          workDuration: { type: "number", description: "Work/focus duration in minutes (1-180, for update_config)" },
          shortBreakDuration: { type: "number", description: "Short break duration in minutes (1-30, for update_config)" },
          longBreakDuration: { type: "number", description: "Long break duration in minutes (1-60, for update_config)" },
          sessionsBeforeLongBreak: { type: "number", description: "Sessions before long break (1-20, for update_config)" },
          soundEnabled: { type: "boolean", description: "Enable sound (for update_config)" },
          autoCycle: { type: "boolean", description: "Auto-cycle sessions (for update_config)" },
          checkpointsEnabled: { type: "boolean", description: "Enable checkpoints (for update_config)" },
          checkpointInterval: { type: "number", description: "Checkpoint interval in minutes (1-60, for update_config)" },
          sessionType: { type: "string", enum: ["focus", "break"], description: "Session type (for start_session)" },
          duration: { type: "number", description: "Custom duration in minutes (for start_session countdown)" },
        },
        required: ["action", "projectId"],
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

      case "create_project": {
        const title = (args.title || "").trim()
        if (!title) throw new Error("Project title is required")
        const newProject = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          title,
          status: args.status || "Active",
          goal: args.goal || "",
          description: args.description || "",
          deadline: args.deadline || "",
          tags: args.tags || [],
          workingDir: args.workingDir || "",
          todos: [],
          links: [],
          assets: [],
          timeline: [{ date: new Date().toISOString(), action: "Project created" }],
          scratchpadLog: [],
          pomodoroLog: [],
          launchItems: [],
          activityLog: [],
          timerConfig: { mode: "pomodoro", workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4, soundEnabled: true, autoCycle: true, checkpointsEnabled: false, checkpointInterval: 15 },
        }
        if (isApiAvailable()) {
          await api("", { method: "POST", body: JSON.stringify({ project: newProject }) })
        } else {
          const fs = await loadFileStorage()
          const { recalculateProject } = await import(fileUrl(join(__dirname, "..", "src", "lib", "storage.js")))
          const projects = fs.readProjects()
          projects.push(recalculateProject(newProject))
          fs.writeProjects(projects)
        }
        return { content: [{ type: "text", text: `Created project "${title}" (ID: ${newProject.id})` }] }
      }

      case "delete_project": {
        if (args.confirm !== true) throw new Error("Deletion requires confirm: true")
        if (isApiAvailable()) {
          await api(`/${encodeURIComponent(args.projectId)}`, { method: "DELETE" })
        } else {
          const fs = await loadFileStorage()
          const projects = fs.readProjects()
          const idx = projects.findIndex(p => String(p.id) === String(args.projectId))
          if (idx === -1) throw new Error(`Project ${args.projectId} not found`)
          const removed = projects.splice(idx, 1)[0]
          fs.writeProjects(projects)
        }
        return { content: [{ type: "text", text: `Deleted project ${args.projectId}` }] }
      }

      case "search_todos": {
        const projects = await getAllProjects()
        const matched = []
        const query = (args.query || "").toLowerCase()
        for (const p of projects) {
          if (args.projectId && String(p.id) !== String(args.projectId)) continue
          const todos = p.todos || []
          for (const t of todos) {
            if (args.status === "pending" && t.done) continue
            if (args.status === "done" && !t.done) continue
            if (query && !t.text.toLowerCase().includes(query) && !(t.details || "").toLowerCase().includes(query)) continue
            matched.push({ project: p.title, projectId: p.id, todo: t })
          }
        }
        if (matched.length === 0) {
          const reason = args.query ? ` matching "${args.query}"` : ""
          return { content: [{ type: "text", text: `No todos found${reason}.` }] }
        }
        const lines = [`Found ${matched.length} todo(s):`, ""]
        let currentProj = ""
        for (const m of matched) {
          const projLabel = `${m.project} [${m.projectId}]`
          if (projLabel !== currentProj) {
            currentProj = projLabel
            lines.push(`  ${projLabel}:`)
          }
          const t = m.todo
          lines.push(`    [${t.id}] ${t.done ? "✓" : "○"} ${t.text} (${t.priority || "Medium"})${t.details ? ` — ${t.details}` : ""}`)
        }
        return { content: [{ type: "text", text: lines.join("\n") }] }
      }

      case "stats": {
        const projects = args.projectId
          ? [await getProjectByIdHelper(args.projectId)]
          : await getAllProjects()
        if (projects.length === 0 || projects[0] === undefined) {
          return { content: [{ type: "text", text: "No projects found." }] }
        }
        if (args.projectId) {
          const p = projects[0]
          const todos = p.todos || []
          const done = todos.filter(t => t.done).length
          const total = todos.length
          const pct = total === 0 ? 0 : Math.round((done / total) * 100)
          return {
            content: [{
              type: "text",
              text: [
                `# ${p.title}`,
                `Status: ${p.status || "No Status"}`,
                `Deadline: ${p.deadline || "None"}`,
                `Todos: ${done}/${total} done (${pct}%)`,
                `Tags: ${(p.tags || []).join(", ") || "None"}`,
                `Launch items: ${(p.launchItems || []).length}`,
                `Timer sessions logged: ${(p.pomodoroLog || []).length}`,
              ].join("\n"),
            }],
          }
        }
        const totalTodos = projects.reduce((s, p) => s + (p.todos || []).length, 0)
        const totalDone = projects.reduce((s, p) => s + (p.todos || []).filter(t => t.done).length, 0)
        const overallPct = totalTodos === 0 ? 0 : Math.round((totalDone / totalTodos) * 100)
        const byStatus = {}
        for (const p of projects) {
          const st = p.status || "No Status"
          byStatus[st] = (byStatus[st] || 0) + 1
        }
        const statusLines = Object.entries(byStatus)
          .sort((a, b) => b[1] - a[1])
          .map(([s, c]) => `  ${s}: ${c}`)
        return {
          content: [{
            type: "text",
            text: [
              `# Project Statistics`,
              `Total projects: ${projects.length}`,
              `Total todos: ${totalTodos}`,
              `Total done: ${totalDone}`,
              `Overall completion: ${overallPct}%`,
              `By status:`,
              ...statusLines,
            ].join("\n"),
          }],
        }
      }

      case "launch": {
        const pid = args.projectId
        if (isApiAvailable()) {
          const project = await getProjectViaApi(pid)
          let launchItems = project.launchItems || []
          let activityLog = project.activityLog || []
          switch (args.action) {
            case "add_item": {
              if (!args.name || !args.name.trim()) throw new Error("Item name is required")
              if (launchItems.some(i => i.name === args.name.trim())) throw new Error(`Item "${args.name}" already exists`)
              const item = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                name: args.name.trim(),
                type: args.type || "command",
                path: args.path || "",
                command: args.command || "",
                workingDir: args.workingDir || "",
                wait: args.wait === true,
                killOnStop: args.killOnStop !== false,
              }
              launchItems.push(item)
              await api(`/${encodeURIComponent(pid)}`, {
                method: "PATCH",
                body: JSON.stringify({ launchItems }),
              })
              return { content: [{ type: "text", text: `Added launch item "${item.name}" (ID: ${item.id})` }] }
            }
            case "list_items": {
              if (launchItems.length === 0) return { content: [{ type: "text", text: "No launch items." }] }
              const lines = launchItems.map(i => `  [${i.id}] ${i.name} (${i.type})${i.path ? ` → ${i.path}` : ""}${i.command ? ` $ ${i.command}` : ""}`)
              return { content: [{ type: "text", text: [`Launch items for "${project.title}":`, ...lines].join("\n") }] }
            }
            case "remove_item": {
              const idx = launchItems.findIndex(i => String(i.id) === args.itemId)
              if (idx === -1) throw new Error(`Launch item ${args.itemId} not found`)
              const removed = launchItems.splice(idx, 1)[0]
              await api(`/${encodeURIComponent(pid)}`, {
                method: "PATCH",
                body: JSON.stringify({ launchItems }),
              })
              return { content: [{ type: "text", text: `Removed launch item "${removed.name}"` }] }
            }
            case "start": {
              const item = launchItems.find(i => String(i.id) === args.itemId)
              if (!item) throw new Error(`Launch item ${args.itemId} not found`)
              activityLog.push({
                itemId: String(item.id),
                itemName: item.name,
                startTime: new Date().toISOString(),
                source: "launch",
              })
              await api(`/${encodeURIComponent(pid)}`, {
                method: "PATCH",
                body: JSON.stringify({ activityLog }),
              })
              return { content: [{ type: "text", text: `Started "${item.name}" — logged to activity` }] }
            }
            case "stop": {
              const lastIdx = activityLog.length - 1 - [...activityLog].reverse().findIndex(e => String(e.itemId) === args.itemId && !e.endTime)
              if (lastIdx < 0) throw new Error(`No running session for item ${args.itemId}`)
              const entry = activityLog[lastIdx]
              const endTime = new Date()
              entry.endTime = endTime.toISOString()
              entry.duration = Math.round((endTime.getTime() - new Date(entry.startTime).getTime()) / 1000)
              await api(`/${encodeURIComponent(pid)}`, {
                method: "PATCH",
                body: JSON.stringify({ activityLog }),
              })
              return { content: [{ type: "text", text: `Stopped "${entry.itemName}" — ran for ${entry.duration}s` }] }
            }
            default:
              throw new Error(`Unknown launch action: ${args.action}`)
          }
        } else {
          const fs = await loadFileStorage()
          const { recalculateProject } = await import(fileUrl(join(__dirname, "..", "src", "lib", "storage.js")))
          const projects = fs.readProjects()
          const pidx = projects.findIndex(p => String(p.id) === String(pid))
          if (pidx === -1) throw new Error(`Project ${pid} not found`)
          const project = projects[pidx]
          const launchItems = project.launchItems || []
          const activityLog = project.activityLog || []
          switch (args.action) {
            case "add_item": {
              if (!args.name || !args.name.trim()) throw new Error("Item name is required")
              if (launchItems.some(i => i.name === args.name.trim())) throw new Error(`Item "${args.name}" already exists`)
              launchItems.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                name: args.name.trim(),
                type: args.type || "command",
                path: args.path || "",
                command: args.command || "",
                workingDir: args.workingDir || "",
                wait: args.wait === true,
                killOnStop: args.killOnStop !== false,
              })
              project.launchItems = launchItems
              projects[pidx] = recalculateProject(project)
              fs.writeProjects(projects)
              const added = launchItems[launchItems.length - 1]
              return { content: [{ type: "text", text: `Added launch item "${added.name}" (ID: ${added.id})` }] }
            }
            case "list_items": {
              if (launchItems.length === 0) return { content: [{ type: "text", text: "No launch items." }] }
              const lines = launchItems.map(i => `  [${i.id}] ${i.name} (${i.type})${i.path ? ` → ${i.path}` : ""}${i.command ? ` $ ${i.command}` : ""}`)
              return { content: [{ type: "text", text: [`Launch items for "${project.title}":`, ...lines].join("\n") }] }
            }
            case "remove_item": {
              const ridx = launchItems.findIndex(i => String(i.id) === args.itemId)
              if (ridx === -1) throw new Error(`Launch item ${args.itemId} not found`)
              const removed = launchItems.splice(ridx, 1)[0]
              project.launchItems = launchItems
              projects[pidx] = recalculateProject(project)
              fs.writeProjects(projects)
              return { content: [{ type: "text", text: `Removed launch item "${removed.name}"` }] }
            }
            case "start": {
              const item = launchItems.find(i => String(i.id) === args.itemId)
              if (!item) throw new Error(`Launch item ${args.itemId} not found`)
              activityLog.push({
                itemId: String(item.id),
                itemName: item.name,
                startTime: new Date().toISOString(),
                source: "launch",
              })
              project.activityLog = activityLog
              projects[pidx] = recalculateProject(project)
              fs.writeProjects(projects)
              return { content: [{ type: "text", text: `Started "${item.name}" — logged to activity` }] }
            }
            case "stop": {
              const lastIdx = activityLog.length - 1 - [...activityLog].reverse().findIndex(e => String(e.itemId) === args.itemId && !e.endTime)
              if (lastIdx < 0) throw new Error(`No running session for item ${args.itemId}`)
              const entry = activityLog[lastIdx]
              const endTime = new Date()
              entry.endTime = endTime.toISOString()
              entry.duration = Math.round((endTime.getTime() - new Date(entry.startTime).getTime()) / 1000)
              project.activityLog = activityLog
              projects[pidx] = recalculateProject(project)
              fs.writeProjects(projects)
              return { content: [{ type: "text", text: `Stopped "${entry.itemName}" — ran for ${entry.duration}s` }] }
            }
            default:
              throw new Error(`Unknown launch action: ${args.action}`)
          }
        }
      }

      case "timer": {
        const pid = args.projectId
        if (isApiAvailable()) {
          const project = await getProjectViaApi(pid)
          let pomodoroLog = project.pomodoroLog || []
          let timerConfig = project.timerConfig || { mode: "pomodoro", workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4, soundEnabled: true, autoCycle: true, checkpointsEnabled: false, checkpointInterval: 15 }
          switch (args.action) {
            case "get_config":
              return { content: [{ type: "text", text: [
                `Timer config for "${project.title}":`,
                `  Mode: ${timerConfig.mode}`,
                `  Work: ${timerConfig.workDuration}min`,
                `  Short break: ${timerConfig.shortBreakDuration}min`,
                `  Long break: ${timerConfig.longBreakDuration}min`,
                `  Sessions before long break: ${timerConfig.sessionsBeforeLongBreak}`,
                `  Sound: ${timerConfig.soundEnabled ? "on" : "off"}`,
                `  Auto-cycle: ${timerConfig.autoCycle ? "on" : "off"}`,
                `  Checkpoints: ${timerConfig.checkpointsEnabled ? `every ${timerConfig.checkpointInterval}min` : "off"}`,
                `Sessions logged: ${pomodoroLog.length}`,
              ].join("\n") }] }
            case "update_config": {
              const updates = {}
              for (const key of ["mode", "workDuration", "shortBreakDuration", "longBreakDuration", "sessionsBeforeLongBreak", "soundEnabled", "autoCycle", "checkpointsEnabled", "checkpointInterval"]) {
                if (args[key] !== undefined) updates[key] = args[key]
              }
              if (updates.workDuration !== undefined && (updates.workDuration < 1 || updates.workDuration > 180)) throw new Error("workDuration must be 1-180")
              if (updates.shortBreakDuration !== undefined && (updates.shortBreakDuration < 1 || updates.shortBreakDuration > 30)) throw new Error("shortBreakDuration must be 1-30")
              if (updates.longBreakDuration !== undefined && (updates.longBreakDuration < 1 || updates.longBreakDuration > 60)) throw new Error("longBreakDuration must be 1-60")
              if (updates.checkpointInterval !== undefined && (updates.checkpointInterval < 1 || updates.checkpointInterval > 60)) throw new Error("checkpointInterval must be 1-60")
              Object.assign(timerConfig, updates)
              await api(`/${encodeURIComponent(pid)}`, {
                method: "PATCH",
                body: JSON.stringify({ timerConfig }),
              })
              return { content: [{ type: "text", text: "Timer config updated" }] }
            }
            case "start_session": {
              if (!args.sessionType) throw new Error("sessionType (focus/break) is required")
              if (!["focus", "break"].includes(args.sessionType)) throw new Error("sessionType must be 'focus' or 'break'")
              const session = {
                startedAt: new Date().toISOString(),
                type: args.sessionType,
                duration: args.duration || (args.sessionType === "focus" ? timerConfig.workDuration : timerConfig.shortBreakDuration),
              }
              pomodoroLog.push(session)
              await api(`/${encodeURIComponent(pid)}`, {
                method: "PATCH",
                body: JSON.stringify({ pomodoroLog }),
              })
              return { content: [{ type: "text", text: `Started ${args.sessionType} session (${session.duration}min)` }] }
            }
            case "stop_session": {
              const lastIdx = pomodoroLog.length - 1 - [...pomodoroLog].reverse().findIndex(e => !e.finishedAt)
              if (lastIdx < 0) throw new Error("No active session to stop")
              const session = pomodoroLog[lastIdx]
              const endTime = new Date()
              session.finishedAt = endTime.toISOString()
              session.duration = Math.round((endTime.getTime() - new Date(session.startedAt).getTime()) / 1000)
              await api(`/${encodeURIComponent(pid)}`, {
                method: "PATCH",
                body: JSON.stringify({ pomodoroLog }),
              })
              return { content: [{ type: "text", text: `Stopped ${session.type} session — ran for ${session.duration}s` }] }
            }
            default:
              throw new Error(`Unknown timer action: ${args.action}`)
          }
        } else {
          const fs = await loadFileStorage()
          const { recalculateProject } = await import(fileUrl(join(__dirname, "..", "src", "lib", "storage.js")))
          const projects = fs.readProjects()
          const pidx = projects.findIndex(p => String(p.id) === String(pid))
          if (pidx === -1) throw new Error(`Project ${pid} not found`)
          const project = projects[pidx]
          let pomodoroLog = project.pomodoroLog || []
          let timerConfig = project.timerConfig || { mode: "pomodoro", workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4, soundEnabled: true, autoCycle: true, checkpointsEnabled: false, checkpointInterval: 15 }
          switch (args.action) {
            case "get_config":
              return { content: [{ type: "text", text: [
                `Timer config for "${project.title}":`,
                `  Mode: ${timerConfig.mode}`,
                `  Work: ${timerConfig.workDuration}min`,
                `  Short break: ${timerConfig.shortBreakDuration}min`,
                `  Long break: ${timerConfig.longBreakDuration}min`,
                `  Sessions before long break: ${timerConfig.sessionsBeforeLongBreak}`,
                `  Sound: ${timerConfig.soundEnabled ? "on" : "off"}`,
                `  Auto-cycle: ${timerConfig.autoCycle ? "on" : "off"}`,
                `  Checkpoints: ${timerConfig.checkpointsEnabled ? `every ${timerConfig.checkpointInterval}min` : "off"}`,
                `Sessions logged: ${pomodoroLog.length}`,
              ].join("\n") }] }
            case "update_config": {
              const updates = {}
              for (const key of ["mode", "workDuration", "shortBreakDuration", "longBreakDuration", "sessionsBeforeLongBreak", "soundEnabled", "autoCycle", "checkpointsEnabled", "checkpointInterval"]) {
                if (args[key] !== undefined) updates[key] = args[key]
              }
              if (updates.workDuration !== undefined && (updates.workDuration < 1 || updates.workDuration > 180)) throw new Error("workDuration must be 1-180")
              if (updates.shortBreakDuration !== undefined && (updates.shortBreakDuration < 1 || updates.shortBreakDuration > 30)) throw new Error("shortBreakDuration must be 1-30")
              if (updates.longBreakDuration !== undefined && (updates.longBreakDuration < 1 || updates.longBreakDuration > 60)) throw new Error("longBreakDuration must be 1-60")
              if (updates.checkpointInterval !== undefined && (updates.checkpointInterval < 1 || updates.checkpointInterval > 60)) throw new Error("checkpointInterval must be 1-60")
              Object.assign(timerConfig, updates)
              project.timerConfig = timerConfig
              projects[pidx] = recalculateProject(project)
              fs.writeProjects(projects)
              return { content: [{ type: "text", text: "Timer config updated" }] }
            }
            case "start_session": {
              if (!args.sessionType) throw new Error("sessionType (focus/break) is required")
              if (!["focus", "break"].includes(args.sessionType)) throw new Error("sessionType must be 'focus' or 'break'")
              const session = {
                startedAt: new Date().toISOString(),
                type: args.sessionType,
                duration: args.duration || (args.sessionType === "focus" ? timerConfig.workDuration : timerConfig.shortBreakDuration),
              }
              pomodoroLog.push(session)
              project.pomodoroLog = pomodoroLog
              projects[pidx] = recalculateProject(project)
              fs.writeProjects(projects)
              return { content: [{ type: "text", text: `Started ${args.sessionType} session (${session.duration}min)` }] }
            }
            case "stop_session": {
              const lastIdx = pomodoroLog.length - 1 - [...pomodoroLog].reverse().findIndex(e => !e.finishedAt)
              if (lastIdx < 0) throw new Error("No active session to stop")
              const session = pomodoroLog[lastIdx]
              const endTime = new Date()
              session.finishedAt = endTime.toISOString()
              session.duration = Math.round((endTime.getTime() - new Date(session.startedAt).getTime()) / 1000)
              project.pomodoroLog = pomodoroLog
              projects[pidx] = recalculateProject(project)
              fs.writeProjects(projects)
              return { content: [{ type: "text", text: `Stopped ${session.type} session — ran for ${session.duration}s` }] }
            }
            default:
              throw new Error(`Unknown timer action: ${args.action}`)
          }
        }
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
