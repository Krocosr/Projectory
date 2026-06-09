import { NextResponse } from 'next/server';
import { readProjects, writeProjects } from '@/lib/fileStorage';
import { createTimelineEntry, recalculateProject } from '@/lib/storage';

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { text, priority = 'Medium', details = '' } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Todo text is required' }, { status: 400 });
    }

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
    return NextResponse.json({ error: 'Failed to add todo' }, { status: 500 });
  }
}
