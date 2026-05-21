import { NextResponse } from 'next/server';

/**
 * TODO: API Routes - Currently Unused
 * 
 * These API routes exist but are NOT currently used by the application.
 * The app uses client-side localStorage via src/lib/storage.js instead.
 * 
 * Future Use Cases:
 * - Multi-device sync via backend database
 * - Collaborative project sharing
 * - Cloud backup/restore functionality
 * 
 * If implementing:
 * 1. Replace in-memory storage with database (PostgreSQL, MongoDB, etc.)
 * 2. Add authentication middleware
 * 3. Update client to use fetch() instead of localStorage
 * 4. Add proper error handling and validation
 */

// In-memory storage (for demo - in production use a database)
let projects = [];

export async function GET() {
  try {
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

    // Add or update project
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }

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

    projects = newProjects;
    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update projects' }, { status: 500 });
  }
}
