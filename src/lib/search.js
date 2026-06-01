'use client';

export function searchProjects(projects, query) {
  if (!query || !query.trim()) return projects;
  const q = query.toLowerCase().trim();
  return projects.filter((p) => {
    const fields = [
      p.title,
      p.description,
      p.goal,
      p.notes,
      ...(p.tags || []),
      ...(p.todos || []).map((t) => t.text),
      ...(p.links || []).map((l) => l.title),
      ...(p.scratchpadLog || []).map((e) => e.text),
    ].filter(Boolean);
    return fields.some((f) => f.toLowerCase().includes(q));
  });
}
