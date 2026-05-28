import { NextResponse } from 'next/server';
import { readProjects, writeProjects } from '@/lib/fileStorage';
import { createTimelineEntry } from '@/lib/storage';

export async function PATCH(request, { params }) {
  try {
    const { id, todoId } = params;
    const body = await request.json();
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
    project.todos[todoIndex] = { ...oldTodo, ...body };

    if (body.done !== undefined && body.done !== oldTodo.done) {
      const action = body.done ? `Completed todo: ${oldTodo.text}` : `Reopened todo: ${oldTodo.text}`;
      project.timeline = [...(project.timeline || []), createTimelineEntry(action)];
    }

    writeProjects(projects);

    return NextResponse.json({ todo: project.todos[todoIndex], project }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
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
    project.timeline = [...(project.timeline || []), createTimelineEntry(`Removed todo: ${removed.text}`)];
    writeProjects(projects);

    return NextResponse.json({ message: 'Todo removed', project }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove todo' }, { status: 500 });
  }
}
