import { NextResponse } from 'next/server';

// In-memory storage (shared with parent route)
let projects = [];

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const project = projects.find((p) => p.id === Number(id));

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
    const index = projects.findIndex((p) => p.id === Number(id));

    if (index === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    projects.splice(index, 1);
    return NextResponse.json({ message: 'Project deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const index = projects.findIndex((p) => p.id === Number(id));

    if (index === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    projects[index] = { ...projects[index], ...body };
    return NextResponse.json({ project: projects[index] }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}
