export function getActiveTodos(projects, sortBy = 'priority') {
  const results = [];

  for (const project of projects) {
    if (project.status === 'Archived') continue;
    if (!project.todos || project.todos.length === 0) continue;

    for (const todo of project.todos) {
      if (todo.done) continue;
      results.push({
        id: todo.id,
        text: todo.text,
        priority: todo.priority || 'Medium',
        details: todo.details || '',
        done: todo.done,
        createdAt: todo.createdAt,
        projectId: project.id,
        projectTitle: project.title,
        projectStatus: project.status,
        projectDeadline: project.deadline,
      });
    }
  }

  const priorityOrder = { High: 0, Medium: 1, Low: 2 };

  results.sort((a, b) => {
    if (sortBy === 'priority') {
      const pDiff = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
      if (pDiff !== 0) return pDiff;

      const dA = a.projectDeadline ? new Date(a.projectDeadline) : null;
      const dB = b.projectDeadline ? new Date(b.projectDeadline) : null;
      if (dA && dB && !isNaN(dA) && !isNaN(dB)) return dA - dB;
      if (dA && !isNaN(dA)) return -1;
      if (dB && !isNaN(dB)) return 1;

      return (a.createdAt || '').localeCompare(b.createdAt || '');
    }

    if (sortBy === 'deadline') {
      const dA = a.projectDeadline ? new Date(a.projectDeadline) : null;
      const dB = b.projectDeadline ? new Date(b.projectDeadline) : null;
      if (dA && dB && !isNaN(dA) && !isNaN(dB)) return dA - dB;
      if (dA && !isNaN(dA)) return -1;
      if (dB && !isNaN(dB)) return 1;
      return 0;
    }

    if (sortBy === 'project') {
      return a.projectTitle.localeCompare(b.projectTitle);
    }

    if (sortBy === 'created') {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }

    return 0;
  });

  return results;
}
