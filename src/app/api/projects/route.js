import { NextResponse } from 'next/server';
import { readProjects, writeProjects } from '@/lib/fileStorage';
import { recalculateProject } from '@/lib/storage';
import { ProjectSchema, validateBody } from '@/lib/validation';
import { rateLimitResponse } from '@/lib/rateLimit';
import { z } from 'zod';

const COMPUTED_FIELDS = ['progress', 'todoCount', 'currentFocus', 'nextStep', 'lastWorked'];

/**
 * GET /api/projects
 * Returns all projects
 */
export async function GET() {
  try {
    const rateLimited = rateLimitResponse('projects:GET');
    if (rateLimited) return rateLimited;

    const projects = readProjects();
    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error.message }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create or update a single project
 */
export async function POST(request) {
  try {
    const rateLimited = rateLimitResponse('projects:POST');
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { project } = body;

    if (!project) {
      return NextResponse.json(
        { error: 'Project data is required' }, 
        { status: 400 }
      );
    }

    // Validate project data
    const validation = validateBody(ProjectSchema, project);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid project data', details: validation.error }, 
        { status: 400 }
      );
    }

    const projects = readProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    
    if (existingIndex >= 0) {
      // Update existing - filter out computed fields
      const safeBody = Object.fromEntries(
        Object.entries(project).filter(([key]) => !COMPUTED_FIELDS.includes(key))
      );
      projects[existingIndex] = recalculateProject({ 
        ...projects[existingIndex], 
        ...safeBody 
      });
    } else {
      // Create new
      projects.push(recalculateProject(project));
    }
    
    writeProjects(projects);

    const savedIndex = existingIndex >= 0 ? existingIndex : projects.length - 1;
    return NextResponse.json(
      { project: projects[savedIndex] }, 
      { status: existingIndex >= 0 ? 200 : 201 }
    );
  } catch (error) {
    console.error('POST /api/projects error:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save project', details: error.message }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects
 * Replace all projects (bulk sync)
 */
export async function PUT(request) {
  try {
    const rateLimited = rateLimitResponse('projects:PUT');
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { projects: newProjects } = body;

    if (!Array.isArray(newProjects)) {
      return NextResponse.json(
        { error: 'Projects array is required' }, 
        { status: 400 }
      );
    }

    // Validate each project
    const validation = validateBody(z.array(ProjectSchema), newProjects);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid projects data', details: validation.error }, 
        { status: 400 }
      );
    }

    const enriched = newProjects.map(recalculateProject);
    writeProjects(enriched);
    
    return NextResponse.json({ projects: enriched }, { status: 200 });
  } catch (error) {
    console.error('PUT /api/projects error:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update projects', details: error.message }, 
      { status: 500 }
    );
  }
}
