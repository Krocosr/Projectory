export const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'priority-high', label: 'Priority ↓' },
  { value: 'priority-low', label: 'Priority ↑' },
  { value: 'deadline-asc', label: 'Deadline ↑' },
  { value: 'deadline-desc', label: 'Deadline ↓' },
  { value: 'alpha-asc', label: 'A → Z' },
  { value: 'alpha-desc', label: 'Z → A' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

const priorityRank = { High: 0, Medium: 1, Low: 2 };

function resolveDeadline(todo) {
  const d = todo.deadline || todo.projectDeadline;
  if (!d) return null;
  const date = new Date(d);
  return isNaN(date) ? null : date;
}

export function sortTodos(todos, sortBy = 'default') {
  if (sortBy === 'default') return [...todos];

  const sorted = [...todos];

  switch (sortBy) {
    case 'priority':
    case 'priority-high':
      sorted.sort((a, b) => {
        const pDiff = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
        if (pDiff !== 0) return pDiff;

        const dA = resolveDeadline(a);
        const dB = resolveDeadline(b);
        if (dA && dB) return dA - dB;
        if (dA) return -1;
        if (dB) return 1;

        const byCreated = (a.createdAt || '').localeCompare(b.createdAt || '');
        if (byCreated !== 0) return byCreated;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      break;

    case 'priority-low':
      sorted.sort((a, b) => {
        const rank = { High: 2, Medium: 1, Low: 0 };
        return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
      });
      break;

    case 'deadline':
    case 'deadline-asc':
      sorted.sort((a, b) => {
        const dA = resolveDeadline(a);
        const dB = resolveDeadline(b);
        if (dA && dB) return dA - dB;
        if (dA) return -1;
        if (dB) return 1;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      break;

    case 'deadline-desc':
      sorted.sort((a, b) => {
        const dA = resolveDeadline(a);
        const dB = resolveDeadline(b);
        if (dA && dB) return dB - dA;
        if (dA) return -1;
        if (dB) return 1;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      break;

    case 'project':
      sorted.sort((a, b) => {
        const byTitle = (a.projectTitle || '').localeCompare(b.projectTitle || '');
        if (byTitle !== 0) return byTitle;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      break;

    case 'alpha-asc':
      sorted.sort((a, b) => a.text.localeCompare(b.text));
      break;

    case 'alpha-desc':
      sorted.sort((a, b) => b.text.localeCompare(a.text));
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
        order: todo.order,
        projectId: project.id,
        projectTitle: project.title,
        projectStatus: project.status,
        projectDeadline: project.deadline,
      });
    }
  }

  return sortTodos(results, sortBy);
}

function getLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function groupTodosByDeadline(todos) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msDay = 1000 * 60 * 60 * 24;

  const groups = {
    overdue: [],
    today: [],
    thisWeek: [],
    nextMonth: [],
    noDeadline: [],
  };

  for (const todo of todos) {
    if (!todo.deadline) {
      groups.noDeadline.push(todo);
      continue;
    }

    const deadlineDate = getLocalDate(todo.deadline);
    if (isNaN(deadlineDate.getTime())) {
      groups.noDeadline.push(todo);
      continue;
    }

    const diffDays = Math.round((deadlineDate - today) / msDay);

    if (diffDays < 0) {
      groups.overdue.push(todo);
    } else if (diffDays === 0) {
      groups.today.push(todo);
    } else if (diffDays <= 7) {
      groups.thisWeek.push(todo);
    } else {
      groups.nextMonth.push(todo);
    }
  }

  for (const key of Object.keys(groups)) {
    if (key === 'noDeadline') continue;
    groups[key].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  }

  return groups;
}
