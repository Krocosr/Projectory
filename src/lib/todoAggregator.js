export const TODO_SORT_OPTIONS = [
  { value: 'priority', label: 'Priority ↓' },
  { value: 'deadline', label: 'Deadline ↑' },
  { value: 'project', label: 'A → Z' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

const priorityOrder = { High: 0, Medium: 1, Low: 2 };

export function sortTodos(todos, sortBy) {
  const sorted = [...todos];
  switch (sortBy) {
    case 'priority':
      sorted.sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
        if (pDiff !== 0) return pDiff;
        const dA = a.projectDeadline ? new Date(a.projectDeadline) : null;
        const dB = b.projectDeadline ? new Date(b.projectDeadline) : null;
        if (dA && dB && !isNaN(dA) && !isNaN(dB)) return dA - dB;
        if (dA && !isNaN(dA)) return -1;
        if (dB && !isNaN(dB)) return 1;
        const byCreated = (a.createdAt || '').localeCompare(b.createdAt || '');
        if (byCreated !== 0) return byCreated;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      break;
    case 'deadline':
      sorted.sort((a, b) => {
        const dA = a.projectDeadline ? new Date(a.projectDeadline) : null;
        const dB = b.projectDeadline ? new Date(b.projectDeadline) : null;
        if (dA && dB && !isNaN(dA) && !isNaN(dB)) return dA - dB;
        if (dA && !isNaN(dA)) return -1;
        if (dB && !isNaN(dB)) return 1;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      break;
    case 'project':
      sorted.sort((a, b) => {
        const byTitle = a.projectTitle.localeCompare(b.projectTitle);
        if (byTitle !== 0) return byTitle;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      break;
    case 'newest':
      sorted.sort((a, b) => {
        const byNewest = (b.createdAt || '').localeCompare(a.createdAt || '');
        if (byNewest !== 0) return byNewest;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      break;
    case 'oldest':
      sorted.sort((a, b) => {
        const byOldest = (a.createdAt || '').localeCompare(b.createdAt || '');
        if (byOldest !== 0) return byOldest;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      break;
  }
  return sorted;
}

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

  return sortTodos(results, sortBy);
}
