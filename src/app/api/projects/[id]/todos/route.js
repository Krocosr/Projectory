import { NextResponse } from 'next/server';
import { readProjects, writeProjects } from '@/lib/fileStorage';
import { createTimelineEntry, recalculateProject } from '@/lib/storage';
import { CreateTodoSchema, validateBody } from '@/lib/validation';
import { rateLimitResponse } from '@/lib/rateLimit';

/**
 * POST /api/projects/[id]/todos
 * Add a todo to a project
 */
export async function POST(request, { params }) {
  try {
    const rateLimited = rateLimitResponse('todos:POST');
    if (rateLimited) return rateLimited;

    // Validate body
    const body = await request.json();
    const validation = validateBody(CreateTodoSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid todo data', details: validation.error },
        { status: 400 }
      );
    }

    const { text, priority = 'Medium', details = '' } = validation.data;
    const { id } = params;

    const projects = readProjects();
    const index = projects.findIndex((p) => String(p.id) === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const todo = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      text: text.trim(),
      priority,
      details,
      done: false,
      createdAt: new Date().toISOString(),
    };

    projects[index].todos = [...(projects[index].todos || []), todo];
    projects[index].timeline = [...(projects[index].timeline || []), createTimelineEntry(`Added todo: ${todo.text}`)];
    projects[index] = recalculateProject(projects[index]);
    writeProjects(projects);

    return NextResponse.json({ todo, project: projects[index] }, { status: 200 });
  } catch (error) {
    console.error('POST /api/projects/[id]/todos error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to add todo', details: error.message }, { status: 500 });
  }
}
