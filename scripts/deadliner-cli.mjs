#!/usr/bin/env node

const API_BASE = process.env.DEADLINER_API || 'http://localhost:3000/api/projects';

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case 'list':
      return list(args);
    case 'get':
      return get(args);
    case 'create':
      return create(args);
    case 'delete':
      return del(args);
    case 'help':
    default:
      showHelp();
  }
}

async function list() {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    console.error(`Error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = await res.json();
  const projects = data.projects;
  if (!projects || projects.length === 0) {
    console.log('No projects found.');
    return;
  }
  console.log(`Projects (${projects.length}):\n`);
  projects.forEach((p) => {
    const progress = p.todos
      ? Math.round((p.todos.filter((t) => t.done).length / p.todos.length) * 100)
      : 0;
    console.log(`  [${p.id}] ${p.title} (${p.status || 'No Status'}) — ${progress}% complete`);
    if (p.currentFocus) console.log(`        Focus: ${p.currentFocus}`);
    if (p.nextStep) console.log(`        Next:  ${p.nextStep}`);
  });
}

async function get(args) {
  const id = args[0];
  if (!id) {
    console.error('Usage: deadliner get <id>');
    process.exit(1);
  }
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) {
    console.error(`Error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = await res.json();
  console.log(JSON.stringify(data.project, null, 2));
}

async function create(args) {
  if (args.length === 0) {
    console.error('Usage: deadliner create <json-string>');
    console.error('   or: cat project.json | deadliner create');
    process.exit(1);
  }
  const input = args.join(' ');
  let project;
  try {
    project = JSON.parse(input);
  } catch {
    console.error('Invalid JSON. Provide a valid project object.');
    process.exit(1);
  }
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project }),
  });
  if (!res.ok) {
    console.error(`Error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = await res.json();
  console.log(`Created/updated project [${data.project.id}]: ${data.project.title}`);
}

async function del(args) {
  const id = args[0];
  if (!id) {
    console.error('Usage: deadliner delete <id>');
    process.exit(1);
  }
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    console.error(`Error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = await res.json();
  console.log(data.message);
}

function showHelp() {
  console.log(`
Deadliner CLI — Manage projects via the running dev server

Usage:
  deadliner list                  List all projects
  deadliner get <id>              Get a single project by ID
  deadliner create <json>         Create or update a project
  deadliner delete <id>           Delete a project by ID

Environment:
  DEADLINER_API   API base URL (default: http://localhost:3000/api/projects)

Examples:
  deadliner list
  deadliner get seed-1
  deadliner create '{"title":"Test","status":"Active"}'
  deadliner delete 123
`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
