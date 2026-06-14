/**
 * Project Data Module
 * 
 * Defines project structure, seed data, and project creation logic.
 * 
 * Architecture Notes:
 * - This is a client-only SPA using Next.js 14 App Router
 * - Next.js is used for its routing, build optimization, and developer experience
 * - All components use 'use client' directive (no React Server Components)
 * - State management: Single source of truth in page.js, passed down as props
 * - See AGENTS.md for the current API route inventory
 * - Routing via useSearchParams with ?project= query param (requires Suspense boundary)
 * 
 * ID Generation:
 * - Projects: Date.now() (guaranteed unique per creation)
 * - Todos: Date.now() + Math.random() (handles rapid creation)
 * - Seed data uses string IDs like 'seed-1' (no conflict with user-generated IDs)
 */

export const SEED_KEY = 'projectory_seeded_v2';

/**
 * Default form values for new project creation
 * Imported by NewProjectModal to ensure consistency
 */
export const defaultForm = {
  title: '',
  description: '',
  status: 'Active',
  goal: '',
  deadline: '',
};

/**
 * Create a new project from form data
 * 
 * This is the single source of truth for project ID generation.
 * Modal components should NOT generate their own IDs.
 * 
 * @param {Object} form - Form data matching defaultForm structure
 * @returns {Object} Complete project object with all required fields
 */
export function createProject(form) {
  return {
    ...form,
    title: form.title.trim(),
    id: Date.now(),
    progress: 0,
    lastWorked: new Date().toISOString(),
    todoCount: 0,
    nextStep: 'Define first action',
    currentFocus: 'Getting started',
    todos: [],
    notes: '',
    links: [],
    assets: [],
    sortState: 'default',
    archivedAt: null,
    scratchpadLog: [],
    pomodoroLog: [],
    timeline: [{
      date: new Date().toISOString(),
      action: 'Project created',
    }],
  };
}

/**
 * Seed Projects - Demo Data
 * 
 * Prefixed string IDs ('seed-1' through 'seed-8') ensure no collision
 * with user-generated projects using Date.now().
 * 
 * Loaded once per browser via SEED_KEY flag in localStorage.
 */
export const seedProjects = [
  {
    id: 'seed-1',
    title: 'AI Story App',
    status: 'Active',
    progress: 68,
    lastWorked: '2h ago',
    todoCount: 5,
    nextStep: 'Fix Google OAuth callback',
    goal: 'Create AI storytelling platform',
    currentFocus: 'Authentication flow',
    deadline: '2026-06-15',
    description: 'A platform where users can generate interactive stories using AI. Features branching narratives, character generation, and collaborative editing.',
    todos: [
      { id: 101, text: 'Fix Google OAuth callback', priority: 'High', done: false, createdAt: '2026-05-18T10:00:00Z' },
      { id: 102, text: 'Add rate limiting middleware', priority: 'High', done: false, createdAt: '2026-05-18T10:00:00Z' },
      { id: 103, text: 'Review PR for auth module', priority: 'Medium', done: false, createdAt: '2026-05-18T10:00:00Z' },
      { id: 104, text: 'Write unit tests for API routes', priority: 'Medium', done: true, createdAt: '2026-05-18T10:00:00Z' },
      { id: 105, text: 'Update project documentation', priority: 'Low', done: false, createdAt: '2026-05-18T10:00:00Z' },
    ],
    notes: 'OAuth callback URL needs to be registered in Google Cloud Console. Using Passport.js with Google strategy.',
    links: [
      { url: 'https://console.cloud.google.com', title: 'Google Cloud Console' },
      { url: 'https://docs.passportjs.org', title: 'Passport.js Docs' },
    ],
    assets: [],
    timeline: [
      { date: '2026-05-20T10:00:00Z', action: 'Added 3 todos' },
      { date: '2026-05-20T08:00:00Z', action: 'Updated script notes' },
      { date: '2026-05-19T16:00:00Z', action: 'Completed login UI' },
      { date: '2026-05-19T10:00:00Z', action: 'Created project' },
    ],
  },
  {
    id: 'seed-2',
    title: 'Portfolio Redesign',
    status: 'Paused',
    progress: 42,
    lastWorked: '3d ago',
    todoCount: 8,
    nextStep: 'Design case study section',
    goal: 'Modern portfolio with case studies',
    currentFocus: 'Visual design system',
    deadline: '2026-07-01',
    description: 'Rebuilding personal portfolio with a focus on case study narratives and polished interaction design.',
    todos: [
      { id: 201, text: 'Design case study section', priority: 'High', done: false, createdAt: '2026-05-15T10:00:00Z' },
      { id: 202, text: 'Create typography scale', priority: 'Medium', done: true, createdAt: '2026-05-15T10:00:00Z' },
      { id: 203, text: 'Build color palette', priority: 'Medium', done: true, createdAt: '2026-05-15T10:00:00Z' },
    ],
    notes: 'Inspired by Linear and Vercel design systems. Dark theme first, light theme as adaptation.',
    links: [],
    assets: [],
    timeline: [
      { date: '2026-05-17T10:00:00Z', action: 'Updated design tokens' },
      { date: '2026-05-15T14:00:00Z', action: 'Paused project' },
    ],
  },
  {
    id: 'seed-3',
    title: 'YouTube Channel',
    status: 'Active',
    progress: 15,
    lastWorked: '1d ago',
    todoCount: 12,
    nextStep: 'Script next video on WebGL',
    goal: 'Dev-focused educational content',
    currentFocus: 'Content planning',
    deadline: 'Ongoing',
    description: 'Teaching web development and creative coding through project-based video tutorials.',
    todos: [
      { id: 301, text: 'Script next video on WebGL', priority: 'High', done: false, createdAt: '2026-05-19T10:00:00Z' },
      { id: 302, text: 'Record audio voiceover', priority: 'Medium', done: false, createdAt: '2026-05-19T10:00:00Z' },
    ],
    notes: 'Targeting 10-15 min videos. First series: WebGL from scratch.',
    links: [],
    assets: [],
    timeline: [
      { date: '2026-05-19T10:00:00Z', action: 'Uploaded channel trailer' },
      { date: '2026-05-18T10:00:00Z', action: 'Wrote content strategy' },
    ],
  },
  {
    id: 'seed-4',
    title: 'Game Jam Entry',
    status: 'Incubating',
    progress: 8,
    lastWorked: '2w ago',
    todoCount: 20,
    nextStep: 'Brainstorm core mechanic',
    goal: '72-hour game jam project',
    currentFocus: 'Concept phase',
    deadline: '2026-08-20',
    description: 'A small experimental game built within 72 hours. Theme TBD — aiming for something narrative-driven.',
    todos: [
      { id: 401, text: 'Brainstorm core mechanic', priority: 'High', done: false, createdAt: '2026-05-06T10:00:00Z' },
      { id: 402, text: 'Research game jam tools', priority: 'Medium', done: false, createdAt: '2026-05-06T10:00:00Z' },
    ],
    notes: 'Using Godot 4. Pixel art style. Theme will be announced at jam start.',
    links: [],
    assets: [],
    timeline: [
      { date: '2026-05-06T10:00:00Z', action: 'Project created' },
    ],
  },
  {
    id: 'seed-5',
    title: 'Rust CLI Tool',
    status: 'Waiting',
    progress: 90,
    lastWorked: '5d ago',
    todoCount: 3,
    nextStep: 'Write documentation',
    goal: 'File watcher + build tool',
    currentFocus: 'Polish and docs',
    deadline: '2026-05-25',
    description: 'A fast file-watching CLI tool with build pipeline integration, written in Rust.',
    todos: [
      { id: 501, text: 'Write documentation', priority: 'High', done: false, createdAt: '2026-05-15T10:00:00Z' },
      { id: 502, text: 'Publish to crates.io', priority: 'Medium', done: false, createdAt: '2026-05-15T10:00:00Z' },
      { id: 503, text: 'Add --help output', priority: 'Low', done: true, createdAt: '2026-05-15T10:00:00Z' },
    ],
    notes: 'Using clap for CLI args, notify crate for file watching.',
    links: [
      { url: 'https://crates.io', title: 'crates.io' },
    ],
    assets: [],
    timeline: [
      { date: '2026-05-15T10:00:00Z', action: 'Feature-complete milestone' },
    ],
  },
  {
    id: 'seed-6',
    title: 'Blog Engine',
    status: 'Finished',
    progress: 100,
    lastWorked: '1mo ago',
    todoCount: 2,
    nextStep: 'Deploy to production',
    goal: 'Markdown-based blog with RSS',
    currentFocus: 'Deployment',
    deadline: 'Completed',
    description: 'A lightweight markdown blog engine with RSS feed, tag system, and syntax highlighting.',
    todos: [
      { id: 601, text: 'Deploy to production', priority: 'High', done: false, createdAt: '2026-04-20T10:00:00Z' },
      { id: 602, text: 'Set up custom domain', priority: 'Medium', done: false, createdAt: '2026-04-20T10:00:00Z' },
    ],
    notes: 'Hosted on Vercel. Using next-mdx-remote for MDX rendering.',
    links: [],
    assets: [],
    timeline: [
      { date: '2026-04-20T10:00:00Z', action: 'Project completed' },
    ],
  },
  {
    id: 'seed-7',
    title: 'Synthwave Visualizer',
    status: 'Incubating',
    progress: 12,
    lastWorked: '1w ago',
    todoCount: 15,
    nextStep: 'Research WebGL audio analysis',
    goal: 'Real-time audio visualizer with retro aesthetic',
    currentFocus: 'Technical research',
    deadline: '2026-09-01',
    description: 'Browser-based music visualizer with synthwave/outrun aesthetic using WebGL and audio analysis.',
    todos: [
      { id: 701, text: 'Research WebGL audio analysis', priority: 'High', done: false, createdAt: '2026-05-13T10:00:00Z' },
      { id: 702, text: 'Set up Three.js scene', priority: 'Medium', done: false, createdAt: '2026-05-13T10:00:00Z' },
    ],
    notes: 'Using Web Audio API + Three.js. Chromatic aberration and bloom post-processing.',
    links: [],
    assets: [],
    timeline: [
      { date: '2026-05-13T10:00:00Z', action: 'Project created' },
    ],
  },
  {
    id: 'seed-8',
    title: 'API Gateway Service',
    status: 'Active',
    progress: 55,
    lastWorked: '4h ago',
    todoCount: 7,
    nextStep: 'Implement rate limiting middleware',
    goal: 'Centralized API gateway for microservices',
    currentFocus: 'Rate limiting and auth middleware',
    deadline: '2026-06-30',
    description: 'A lightweight API gateway that handles routing, authentication, rate limiting, and logging for microservice backends.',
    todos: [
      { id: 801, text: 'Implement rate limiting middleware', priority: 'High', done: false, createdAt: '2026-05-20T08:00:00Z' },
      { id: 802, text: 'Add JWT auth middleware', priority: 'High', done: false, createdAt: '2026-05-20T08:00:00Z' },
      { id: 803, text: 'Set up request logging', priority: 'Medium', done: true, createdAt: '2026-05-20T08:00:00Z' },
      { id: 804, text: 'Write integration tests', priority: 'Medium', done: false, createdAt: '2026-05-20T08:00:00Z' },
      { id: 805, text: 'Add health check endpoint', priority: 'Low', done: false, createdAt: '2026-05-20T08:00:00Z' },
    ],
    notes: 'Using Express under the hood. Rate limiting with express-rate-limit, JWT with jsonwebtoken.',
    links: [
      { url: 'https://expressjs.com', title: 'Express.js docs' },
      { url: 'https://jwt.io', title: 'JWT.io' },
    ],
    assets: [],
    timeline: [
      { date: '2026-05-20T08:00:00Z', action: 'Implemented logging middleware' },
      { date: '2026-05-19T10:00:00Z', action: 'Set up project structure' },
    ],
  },
];
