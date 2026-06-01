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
    case 'priority-high':
      sorted.sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
        if (pDiff !== 0) return pDiff;
        const dA = a.projectDeadline ? new Date(a.projectDeadline) : null;
        const dB = b.projectDeadline ? new Date(b.projectDeadline) : null;
        if (dA && dB && !isNaN(dA) && !isNaN(dB)) return dA - dB;
        if (dA && !isNaN(dA)) return -1;
        if (dB && !isNaN(dB)) return 1;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      break;
    case 'priority-low':
      sorted.sort((a, b) => {
        const pDiff = (priorityOrder[b.priority] ?? 1) - (priorityOrder[a.priority] ?? 1);
        if (pDiff !== 0) return pDiff;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      break;
    case 'deadline':
    case 'deadline-asc':
      sorted.sort((a, b) => {
        const dA = a.projectDeadline ? new Date(a.projectDeadline) : null;
        const dB = b.projectDeadline ? new Date(b.projectDeadline) : null;
        if (dA && dB && !isNaN(dA) && !isNaN(dB)) return dA - dB;
        if (dA && !isNaN(dA)) return -1;
        if (dB && !isNaN(dB)) return 1;
        return 0;
      });
      break;
    case 'deadline-desc':
      sorted.sort((a, b) => {
        const dA = a.projectDeadline ? new Date(a.projectDeadline) : null;
        const dB = b.projectDeadline ? new Date(b.projectDeadline) : null;
        if (dA && dB && !isNaN(dA) && !isNaN(dB)) return dB - dA;
        if (dA && !isNaN(dA)) return 1;
        if (dB && !isNaN(dB)) return -1;
        return 0;
      });
      break;
    case 'project':
    case 'alpha-asc':
      sorted.sort((a, b) => (a.projectTitle || a.text || '').localeCompare(b.projectTitle || b.text || ''));
      break;
    case 'alpha-desc':
      sorted.sort((a, b) => (b.projectTitle || b.text || '').localeCompare(a.projectTitle || a.text || ''));
      break;
    case 'newest':
      sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      break;
    case 'oldest':
      sorted.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      break;
  }
  return sorted;
}

export function groupTodosByDeadline(todos) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const today = new Date(now);
  const tonight = new Date(now);
  tonight.setHours(23, 59, 59, 999);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);

  const groups = {
    overdue: [],
    today: [],
    thisWeek: [],
    nextMonth: [],
    noDeadline: []
  };

  for (const todo of todos) {
    if (!todo.deadline) {
      groups.noDeadline.push(todo);
      continue;
    }

    const d = new Date(todo.deadline);
    if (isNaN(d.getTime())) {
      groups.noDeadline.push(todo);
      continue;
    }

    if (d < today) groups.overdue.push(todo);
    else if (d <= tonight) groups.today.push(todo);
    else if (d <= nextWeek) groups.thisWeek.push(todo);
    else if (d <= nextMonth) groups.nextMonth.push(todo);
    else groups.noDeadline.push(todo);
  }

  return groups;
}

export const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'priority-high', label: 'Priority \u2193' },
  { value: 'priority-low', label: 'Priority \u2191' },
  { value: 'deadline-asc', label: 'Deadline \u2191' },
  { value: 'deadline-desc', label: 'Deadline \u2193' },
  { value: 'alpha-asc', label: 'A \u2192 Z' },
  { value: 'alpha-desc', label: 'Z \u2192 A' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

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
