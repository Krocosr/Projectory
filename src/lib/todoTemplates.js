const TEMPLATES_KEY = 'projectory_todo_templates';

function getStorage() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStorage(data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save templates:', e);
  }
}

export function saveTemplate(name, todos) {
  const templates = getStorage();
  templates[name] = todos.map(({ text, priority, details }) => ({
    text,
    priority: priority || 'Medium',
    details: details || '',
  }));
  setStorage(templates);
}

export function getTemplates() {
  return getStorage();
}

export function deleteTemplate(name) {
  const templates = getStorage();
  delete templates[name];
  setStorage(templates);
}

export function applyTemplateToProject(project, templateName) {
  const templates = getStorage();
  const template = templates[templateName];
  if (!template) return project;
  const newTodos = template.map((t) => ({
    id: Date.now() + Math.floor(Math.random() * 1000),
    text: t.text,
    priority: t.priority || 'Medium',
    details: t.details || '',
    deadline: '',
    done: false,
    createdAt: new Date().toISOString(),
  }));
  return {
    ...project,
    todos: [...(project.todos || []), ...newTodos],
  };
}

export function exportTemplates() {
  const templates = getStorage();
  if (Object.keys(templates).length === 0) return;
  const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `projectory-templates-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importTemplates(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (typeof data !== 'object' || Array.isArray(data)) {
      return { success: false, error: 'Expected an object of named template arrays' };
    }
    const templates = getStorage();
    for (const [name, todos] of Object.entries(data)) {
      if (!Array.isArray(todos)) continue;
      templates[name] = todos.map((t) => ({
        text: t.text || '',
        priority: t.priority || 'Medium',
        details: t.details || '',
      }));
    }
    setStorage(templates);
    return { success: true };
  } catch {
    return { success: false, error: 'Invalid JSON file' };
  }
}
