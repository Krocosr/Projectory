import { NextResponse } from 'next/server';
import { readProjects, writeProjects } from '@/lib/fileStorage';
import { createTimelineEntry, recalculateProject } from '@/lib/storage';
import { UpdateTodoSchema, validateBody } from '@/lib/validation';
import { rateLimitResponse } from '@/lib/rateLimit';

const ALLOWED_FIELDS = ['text', 'priority', 'details', 'deadline', 'done'];

/**
 * PATCH /api/projects/[id]/todos/[todoId]
 * Update a todo (text, priority, details, done status)
 */
export async function PATCH(request, { params }) {
  try {
    const rateLimited = rateLimitResponse('todos:PATCH');
    if (rateLimited) return rateLimited;

    const { id, todoId } = params;
    const body = await request.json();

    // Validate body
    const validation = validateBody(UpdateTodoSchema.partial(), body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid todo data', details: validation.error },
        { status: 400 }
      );
    }

    const projects = readProjects();
    const projectIndex = projects.findIndex((p) => String(p.id) === id);

    if (projectIndex === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projects[projectIndex];
    const todoIndex = (project.todos || []).findIndex((t) => String(t.id) === todoId);

    if (todoIndex === -1) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const oldTodo = project.todos[todoIndex];
    const safeBody = Object.fromEntries(
      Object.entries(body).filter(([key]) => ALLOWED_FIELDS.includes(key))
    );
    project.todos[todoIndex] = { ...oldTodo, ...safeBody };

    // Track completion status changes in timeline
    if (body.done !== undefined && body.done !== oldTodo.done) {
      const action = body.done
        ? `Completed todo: ${oldTodo.text}`
        : `Reopened todo: ${oldTodo.text}`;
      project.todos[todoIndex] = {
        ...project.todos[todoIndex],
        completedAt: body.done ? new Date().toISOString() : null,
      };
      project.timeline = [...(project.timeline || []), createTimelineEntry(action)];
    }

    projects[projectIndex] = recalculateProject(project);
    writeProjects(projects);

    return NextResponse.json(
      { todo: project.todos[todoIndex], project: projects[projectIndex] },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/projects/[id]/todos/[todoId] error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update todo', details: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/todos/[todoId]
 * Remove a todo from a project
 */
export async function DELETE(request, { params }) {
  try {
    const rateLimited = rateLimitResponse('todos:DELETE');
    if (rateLimited) return rateLimited;

    const { id, todoId } = params;
    const projects = readProjects();
    const projectIndex = projects.findIndex((p) => String(p.id) === id);

    if (projectIndex === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projects[projectIndex];
    const todoIndex = (project.todos || []).findIndex((t) => String(t.id) === todoId);

    if (todoIndex === -1) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const removed = project.todos[todoIndex];
    project.todos.splice(todoIndex, 1);
    project.timeline = [
      ...(project.timeline || []),
      createTimelineEntry(`Removed todo: ${removed.text}`),
    ];
    projects[projectIndex] = recalculateProject(project);
    writeProjects(projects);

    return NextResponse.json({ message: 'Todo removed', project }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/projects/[id]/todos/[todoId] error:', error);
    return NextResponse.json({ error: 'Failed to remove todo', details: error.message }, { status: 500 });
  }
}
