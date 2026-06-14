import { NextResponse } from 'next/server';
import { readProjects, writeProjects } from '@/lib/fileStorage';
import { recalculateProject } from '@/lib/storage';
import { ProjectIdParamSchema, UpdateProjectSchema, validateBody, validateParams } from '@/lib/validation';
import { rateLimitResponse } from '@/lib/rateLimit';

const COMPUTED_FIELDS = ['progress', 'todoCount', 'currentFocus', 'nextStep', 'lastWorked'];

/**
 * GET /api/projects/[id]
 * Returns a single project by ID
 */
export async function GET(request, { params }) {
  try {
    const rateLimited = rateLimitResponse('projects:GET:byId');
    if (rateLimited) return rateLimited;

    // Validate params
    const paramValidation = validateParams(ProjectIdParamSchema, params);
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid project ID', details: paramValidation.error }, 
        { status: 400 }
      );
    }

    const { id } = paramValidation.data;
    const projects = readProjects();
    const project = projects.find((p) => String(p.id) === id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: error.message }, 
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Deletes a project by ID
 */
export async function DELETE(request, { params }) {
  try {
    const rateLimited = rateLimitResponse('projects:DELETE');
    if (rateLimited) return rateLimited;

    // Validate params
    const paramValidation = validateParams(ProjectIdParamSchema, params);
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid project ID', details: paramValidation.error }, 
        { status: 400 }
      );
    }

    const { id } = paramValidation.data;
    const projects = readProjects();
    const index = projects.findIndex((p) => String(p.id) === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Project not found' }, 
        { status: 404 }
      );
    }

    projects.splice(index, 1);
    writeProjects(projects);
    
    return NextResponse.json(
      { message: 'Project deleted' }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: error.message }, 
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]
 * Partially updates a project (excludes computed fields)
 */
export async function PATCH(request, { params }) {
  try {
    const rateLimited = rateLimitResponse('projects:PATCH');
    if (rateLimited) return rateLimited;

    // Validate params
    const paramValidation = validateParams(ProjectIdParamSchema, params);
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid project ID', details: paramValidation.error }, 
        { status: 400 }
      );
    }

    const { id } = paramValidation.data;
    const body = await request.json();
    
    // Validate body
    const bodyValidation = validateBody(UpdateProjectSchema.partial(), body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: bodyValidation.error }, 
        { status: 400 }
      );
    }

    const projects = readProjects();
    const index = projects.findIndex((p) => String(p.id) === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Project not found' }, 
        { status: 404 }
      );
    }

    // Filter out computed fields from request body
    const safeBody = Object.fromEntries(
      Object.entries(body).filter(([key]) => !COMPUTED_FIELDS.includes(key))
    );
    
    projects[index] = recalculateProject({ 
      ...projects[index], 
      ...safeBody 
    });
    
    writeProjects(projects);
    
    return NextResponse.json(
      { project: projects[index] }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/projects/[id] error:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update project', details: error.message }, 
      { status: 500 }
    );
  }
}
