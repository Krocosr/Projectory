/**
 * Search projects by query string.
 * Searches across title, description, goal, notes, tags, todo text, link titles, and scratchpad.
 */
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
      ...(p.scratchpadLog || []), // scratchpadLog is an array of strings
    ].filter(Boolean);
    return fields.some((f) => f.toLowerCase().includes(q));
  });
}
