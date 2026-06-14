import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { rateLimitResponse } from '@/lib/rateLimit';

const DATA_FILE = path.join(process.cwd(), 'data', 'projects.json');

export async function GET() {
  try {
    const rateLimited = rateLimitResponse('projects:poll');
    if (rateLimited) return rateLimited;

    let mtime = null;
    if (fs.existsSync(DATA_FILE)) {
      const stat = fs.statSync(DATA_FILE);
      mtime = stat.mtimeMs;
    }
    return NextResponse.json({ modified: mtime, exists: mtime !== null }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check file status' }, { status: 500 });
  }
}
