import { z } from 'zod';

/**
 * Zod validation schemas for API routes.
 * Ensures type safety and input validation across all endpoints.
 */

// Status enum
const ProjectStatus = z.enum(['Active', 'Paused', 'Incubating', 'Waiting', 'Finished', 'Archived']);

// Priority enum
const TodoPriority = z.enum(['High', 'Medium', 'Low']);

// Todo schema
const DateTimeString = z.string().datetime({ offset: true });

export const TodoSchema = z.object({
  id: z.union([z.number(), z.string()]),
  text: z.string().min(1, 'Todo text is required').max(500, 'Todo text too long'),
  priority: TodoPriority.optional().default('Medium'),
  details: z.string().max(2000, 'Details too long').optional().default(''),
  done: z.boolean().default(false),
  createdAt: DateTimeString.optional(),
  completedAt: DateTimeString.nullable().optional(),
  deadline: z.string().optional(),
  dependsOn: z.array(z.union([z.number(), z.string()])).nullable().optional(),
});

// Link schema
const LinkSchema = z.object({
  url: z.string().url('Invalid URL'),
  title: z.string().min(1, 'Link title is required').max(200, 'Title too long'),
});

// Asset schema
const AssetSchema = z.object({
  name: z.string().min(1, 'Asset name is required').max(200, 'Name too long'),
  url: z.string().max(2000).optional().default(''),
  addedAt: DateTimeString,
});

// Timeline entry schema
const TimelineEntrySchema = z.object({
  date: DateTimeString,
  action: z.string().min(1, 'Action is required').max(500, 'Action too long'),
});

// Scratchpad log entry schema
const ScratchpadLogSchema = z.object({
  id: z.union([z.number(), z.string()]),
  text: z.string(),
  createdAt: DateTimeString,
});

// Pomodoro log entry schema
const PomodoroLogSchema = z.object({
  startedAt: DateTimeString,
  finishedAt: DateTimeString.nullable().optional(),
  duration: z.number().optional(),
  type: z.enum(['focus', 'break']),
});

// Timer config schema
const TimerConfigSchema = z.object({
  mode: z.enum(['pomodoro', 'countdown', 'countup']).default('pomodoro'),
  workDuration: z.number().min(1).max(180).default(25),
  shortBreakDuration: z.number().min(1).max(30).default(5),
  longBreakDuration: z.number().min(1).max(60).default(15),
  sessionsBeforeLongBreak: z.number().min(1).max(20).default(4),
  soundEnabled: z.boolean().default(true),
  autoCycle: z.boolean().default(true),
  checkpointsEnabled: z.boolean().default(false),
  checkpointInterval: z.number().min(1).max(60).default(15),
});

// Launch item schema
const LaunchItemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().min(1).max(200),
  type: z.enum(['app', 'command']),
  path: z.string().max(2000).default(''),
  command: z.string().max(2000).optional().default(''),
  workingDir: z.string().max(2000).optional().default(''),
  wait: z.boolean().default(false),
  killOnStop: z.boolean().default(true),
});

// Activity log entry schema
const ActivityLogSchema = z.object({
  itemId: z.union([z.number(), z.string()]),
  itemName: z.string().max(200),
  startTime: DateTimeString,
  endTime: DateTimeString.nullable().optional(),
  duration: z.number().optional(),
  source: z.enum(['launch', 'pomodoro', 'countdown', 'countup']).default('launch'),
});

// Project schema (full)
export const ProjectSchema = z.object({
  id: z.union([z.number(), z.string()]),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  status: ProjectStatus,
  goal: z.string().max(500, 'Goal too long').optional().default(''),
  deadline: z.string().optional().default(''),
  description: z.string().max(2000, 'Description too long').optional().default(''),
  notes: z.string().max(50000, 'Notes too long').optional().default(''),
  todos: z.array(TodoSchema).optional().default([]),
  links: z.array(LinkSchema).optional().default([]),
  assets: z.array(AssetSchema).optional().default([]),
  timeline: z.array(TimelineEntrySchema).optional().default([]),
  scratchpadLog: z.array(ScratchpadLogSchema).optional().default([]),
  pomodoroLog: z.array(PomodoroLogSchema).optional().default([]),
  launchItems: z.array(LaunchItemSchema).optional().default([]),
  activityLog: z.array(ActivityLogSchema).optional().default([]),
  timerConfig: TimerConfigSchema.optional().default({ mode: 'pomodoro', workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4, soundEnabled: true, autoCycle: true, checkpointsEnabled: false, checkpointInterval: 15 }),
  tags: z.array(z.string()).optional().default([]),
  archivedAt: DateTimeString.optional(),
  sortState: z.string().optional(),
  workingDir: z.string().max(2000).optional().default(''),
  // Computed fields (excluded from input validation)
  progress: z.number().min(0).max(100).optional(),
  todoCount: z.number().min(0).optional(),
  currentFocus: z.string().optional(),
  nextStep: z.string().optional(),
  lastWorked: z.string().optional(),
});

// Partial project schema for updates (all fields optional except id)
export const PartialProjectSchema = ProjectSchema.partial().required({ id: true });

// Create project schema (no id, no computed fields)
export const CreateProjectSchema = ProjectSchema.omit({ 
  id: true, 
  progress: true, 
  todoCount: true, 
  currentFocus: true, 
  nextStep: true, 
  lastWorked: true 
});

// Update project schema (partial, excludes computed fields on server)
export const UpdateProjectSchema = ProjectSchema.omit({
  progress: true,
  todoCount: true,
  currentFocus: true,
  nextStep: true,
  lastWorked: true,
}).partial().required({ id: true });

// Create todo schema (no id, no completedAt)
export const CreateTodoSchema = TodoSchema.omit({ 
  id: true, 
  createdAt: true,
  completedAt: true 
});

// Update todo schema (partial)
export const UpdateTodoSchema = TodoSchema.partial().required({ id: true });

// Query params validation
export const ProjectIdParamSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
});

export const TodoIdParamSchema = z.object({
  todoId: z.string().min(1, 'Todo ID is required'),
});

/**
 * Helper function to validate and parse request body.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateBody(schema, body) {
  try {
    const parsed = schema.parse(body);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      const messages = issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return {
        success: false,
        error: messages.join(', '),
        details: issues,
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Helper function to validate request params.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateParams(schema, params) {
  return validateBody(schema, params);
}
