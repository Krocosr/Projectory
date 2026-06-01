import { NextResponse } from 'next/server';
import { readProjects, writeProjects } from '@/lib/fileStorage';
import { recalculateProject } from '@/lib/storage';

const COMPUTED_FIELDS = ['progress', 'todoCount', 'currentFocus', 'nextStep', 'lastWorked'];

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const projects = readProjects();
    const project = projects.find((p) => String(p.id) === id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const projects = readProjects();
    const index = projects.findIndex((p) => String(p.id) === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    projects.splice(index, 1);
    writeProjects(projects);
    return NextResponse.json({ message: 'Project deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const projects = readProjects();
    const index = projects.findIndex((p) => String(p.id) === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const safeBody = Object.fromEntries(
      Object.entries(body).filter(([key]) => !COMPUTED_FIELDS.includes(key))
    );
    projects[index] = recalculateProject({ ...projects[index], ...safeBody });
    writeProjects(projects);
    return NextResponse.json({ project: projects[index] }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}
