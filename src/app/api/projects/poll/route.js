import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'projects.json');

export async function GET() {
  try {
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
