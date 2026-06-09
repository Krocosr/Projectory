import { NextResponse } from 'next/server';
import { readProjects, writeProjects } from '@/lib/fileStorage';
import { recalculateProject } from '@/lib/storage';

const COMPUTED_FIELDS = ['progress', 'todoCount', 'currentFocus', 'nextStep', 'lastWorked'];

export async function GET() {
  try {
    const projects = readProjects();
    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { project } = body;

    if (!project) {
      return NextResponse.json({ error: 'Project data is required' }, { status: 400 });
    }

    const projects = readProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    if (existingIndex >= 0) {
      const safeBody = Object.fromEntries(
        Object.entries(project).filter(([key]) => !COMPUTED_FIELDS.includes(key))
      );
      projects[existingIndex] = recalculateProject({ ...projects[existingIndex], ...safeBody });
    } else {
      projects.push(project);
    }
    writeProjects(projects);

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { projects: newProjects } = body;

    if (!Array.isArray(newProjects)) {
      return NextResponse.json({ error: 'Projects array is required' }, { status: 400 });
    }

    const enriched = newProjects.map(recalculateProject);
    writeProjects(enriched);
    return NextResponse.json({ projects: enriched }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update projects' }, { status: 500 });
  }
}
