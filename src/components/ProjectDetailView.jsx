'use client';
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createTodo } from '@/lib/storage';
import { STATUSES, STATUS_COLORS, STATUS_BG, PRIORITY_STYLES, AUTO_SAVE_DEBOUNCE_MS } from '@/lib/constants';
import { formatDeadlineForDisplay, formatRelativeTime } from '@/lib/dateUtils';

const TABS = ['Overview', 'Todos', 'Workspace', 'Timeline', 'Settings'];

function groupTimelineByDate(entries) {
  const groups = {};
  (entries || []).forEach((e) => {
    const key = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return groups;
}

function computeProgress(todos) {
  if (!todos || todos.length === 0) return 0;
  const done = todos.filter((t) => t.done).length;
  return Math.round((done / todos.length) * 100);
}

function getFirstActiveTodo(todos) {
  if (!todos || todos.length === 0) return null;
  return todos.find((t) => !t.done) || null;
}

function getNextHighPriorityTodo(todos) {
  if (!todos || todos.length === 0) return null;
  const activeTodos = todos.filter((t) => !t.done);
  return activeTodos.find((t) => t.priority === 'High') || null;
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-4 first:pt-0 last:pb-0 border-b border-[var(--border-subtle)] last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
        {label}
      </dt>
      <dd className="text-sm text-[var(--text-primary)] leading-relaxed">{value}</dd>
    </div>
  );
}

const TodoItem = memo(function TodoItem({ todo, onToggle, onRemove, onEdit, dragHandleProps }) {
  const [expanded, setExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e) => {
    e.preventDefault();
    const menuWidth = 140;
    const menuHeight = 120;
    let x = e.clientX;
    let y = e.clientY;
    
    // Account for scroll offset and adjust if menu would go off-screen
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    setContextMenu({ x, y });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleEdit = () => {
    closeContextMenu();
    onEdit?.(todo);
  };

  const handleDelete = () => {
    closeContextMenu();
    onRemove(todo.id);
  };

  const handleCheck = () => {
    closeContextMenu();
    onToggle(todo.id);
  };
  
  return (
    <>
      <div 
        className="rounded-lg hover:bg-[var(--border-subtle)]/40 transition-colors group bg-white/0"
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Drag handle — left of priority */}
          <div
            {...dragHandleProps}
            className="opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing p-0.5 text-[var(--text-muted)] shrink-0"
            aria-label="Drag to reorder"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
            </svg>
          </div>

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => onToggle(todo.id)}
            className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--accent-clay)] shrink-0"
          />

          {/* Text + expand button */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`text-sm transition-colors truncate ${todo.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
              {todo.text}
            </span>
            {todo.details && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5 shrink-0"
                aria-label={expanded ? 'Collapse details' : 'Expand details'}
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Priority badge — RIGHT side */}
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.Medium}`}>
            {todo.priority}
          </span>

          {/* Remove button */}
          <button
            onClick={(e) => { e.preventDefault(); onRemove(todo.id); }}
            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-clay)] transition-all p-1 shrink-0"
            aria-label="Remove todo"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Expandable details */}
        {expanded && todo.details && (
          <div className="px-3 pb-2.5 pl-12">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {todo.details}
            </p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-[var(--border-subtle)] py-1 z-50 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleEdit}
            className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/40 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={handleCheck}
            className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/40 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {todo.done ? 'Uncheck' : 'Check'}
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if todo data, handlers, or dragHandleProps change
  return (
    prevProps.todo.id === nextProps.todo.id &&
    prevProps.todo.text === nextProps.todo.text &&
    prevProps.todo.done === nextProps.todo.done &&
    prevProps.todo.priority === nextProps.todo.priority &&
    prevProps.todo.details === nextProps.todo.details &&
    prevProps.onToggle === nextProps.onToggle &&
    prevProps.onRemove === nextProps.onRemove &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.dragHandleProps === nextProps.dragHandleProps
  );
});

function AddTodoBar({ onAdd }) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [details, setDetails] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim(), priority, details.trim());
    setText('');
    setDetails('');
    setShowDetails(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Priority LEFT of input */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-2 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-xs font-medium text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 appearance-none shrink-0"
        >
          <option value="High">High</option>
          <option value="Medium">Med</option>
          <option value="Low">Low</option>
        </select>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a todo..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all"
        />
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className={`px-2 py-2 rounded-lg border transition-all shrink-0 ${showDetails ? 'border-[var(--accent-clay)] text-[var(--accent-clay)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          aria-label="Toggle details"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          type="submit"
          className="px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
        >
          Add
        </button>
      </div>
      {showDetails && (
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Add optional details..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all resize-none"
        />
      )}
    </form>
  );
}

function DraggableTodoList({ todos, onToggle, onRemove, onEdit, onReorder }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = Array.from(todos);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onReorder(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="todos">
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef} 
            {...provided.droppableProps} 
            className={`space-y-1 transition-colors ${snapshot.isDraggingOver ? 'bg-[var(--accent-clay)]/5 rounded-lg' : ''}`}
          >
            {todos.map((todo, index) => (
              <Draggable key={String(todo.id)} draggableId={String(todo.id)} index={index}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                      ...provided.draggableProps.style,
                      transform: snapshot.isDragging 
                        ? provided.draggableProps.style?.transform 
                        : 'translate(0px, 0px)',
                    }}
                    className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-[var(--accent-clay)]/30 bg-white rounded-lg' : ''}`}
                  >
                    <TodoItem
                      todo={todo}
                      onToggle={onToggle}
                      onRemove={onRemove}
                      onEdit={onEdit}
                      dragHandleProps={provided.dragHandleProps}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

function EditTodoModal({ todo, isOpen, onClose, onSave }) {
  const [text, setText] = useState(todo?.text || '');
  const [priority, setPriority] = useState(todo?.priority || 'Medium');
  const [details, setDetails] = useState(todo?.details || '');

  useEffect(() => {
    if (todo) {
      setText(todo.text || '');
      setPriority(todo.priority || 'Medium');
      setDetails(todo.details || '');
    }
  }, [todo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave({ ...todo, text: text.trim(), priority, details: details.trim() });
    onClose();
  };

  if (!isOpen || !todo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Todo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Todo</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 appearance-none"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Details (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function OverviewTab({ project, onAddTodo, onToggleTodo, onRemoveTodo, onEditTodo, onReorderTodos }) {
  // Memoize expensive computations
  const { activeTodos, recentTodos, progress, currentFocusText, nextStepText } = useMemo(() => {
    const active = (project.todos || []).filter((t) => !t.done);
    const recent = active.slice(0, 3);
    const prog = computeProgress(project.todos);
    const firstActive = getFirstActiveTodo(project.todos);
    const nextHighPriority = getNextHighPriorityTodo(project.todos);
    
    // Compute Next Step: show "-" if same as Current Focus or only 1 todo
    const currentFocus = firstActive ? firstActive.text : 'No active todos';
    let nextStep = '-';
    if (active.length > 1) {
      if (nextHighPriority && nextHighPriority.id !== firstActive?.id) {
        nextStep = nextHighPriority.text;
      } else if (active.length > 1) {
        // Find second active todo if nextHighPriority is same as firstActive
        nextStep = active[1]?.text || '-';
      }
    }
    
    return {
      activeTodos: active,
      recentTodos: recent,
      progress: prog,
      currentFocusText: currentFocus,
      nextStepText: nextStep
    };
  }, [project.todos]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-1"
    >
      <DetailRow label="Goal" value={project.goal} />
      <DetailRow label="Current Focus" value={project.currentFocus || currentFocusText} />
      <DetailRow label="Next Step" value={project.nextStep || nextStepText} />
      <DetailRow label="Deadline" value={formatDeadlineForDisplay(project.deadline)} />
      <DetailRow label="Description" value={project.description} />

      <div className="py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Progress
          </span>
          <span className="text-sm font-semibold text-[var(--text-secondary)] tabular-nums">
            {progress}%
          </span>
        </div>
        <div 
          className="h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Project progress: ${progress}%`}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--accent-clay), var(--accent-clay-light))',
            }}
          />
        </div>
      </div>

      <div className="pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Active Todos
        </h3>
        <div className="space-y-1">
          {recentTodos.length > 0 ? (
            <DraggableTodoList
              todos={recentTodos}
              onToggle={onToggleTodo}
              onRemove={onRemoveTodo}
              onEdit={onEditTodo}
              onReorder={(reordered) => {
                // merge reordered active (first 3) back into full list
                const fullActive = (project.todos || []).filter((t) => !t.done);
                const rest = fullActive.slice(3);
                const done = (project.todos || []).filter((t) => t.done);
                onReorderTodos([...reordered, ...rest, ...done]);
              }}
            />
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No active todos</p>
          )}
        </div>
        <div className="mt-3">
          <AddTodoBar onAdd={onAddTodo} />
        </div>
      </div>
    </motion.div>
  );
}

function TodosTab({ project, onAddTodo, onToggleTodo, onRemoveTodo, onEditTodo, onReorderTodos }) {
  const [section, setSection] = useState('Active');

  const activeTodos = (project.todos || []).filter((t) => !t.done);
  const doneTodos = (project.todos || []).filter((t) => t.done);
  const displayedTodos = section === 'Active' ? activeTodos : doneTodos;

  const handleReorderActive = (reordered) => {
    const done = (project.todos || []).filter((t) => t.done);
    onReorderTodos([...reordered, ...done]);
  };

  const handleReorderDone = (reordered) => {
    const active = (project.todos || []).filter((t) => !t.done);
    onReorderTodos([...active, ...reordered]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-6 mb-5 border-b border-[var(--border-subtle)] pb-3">
        {['Active', 'Done'].map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`text-xs font-medium uppercase tracking-wider pb-3 -mb-3 transition-colors ${
              section === s
                ? 'text-[var(--accent-clay)] border-b-2 border-[var(--accent-clay)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {s}
            <span className="ml-1.5 text-[10px] opacity-60">
              {s === 'Done' ? doneTodos.length : activeTodos.length}
            </span>
          </button>
        ))}
      </div>

      {displayedTodos.length > 0 ? (
        <DraggableTodoList
          todos={displayedTodos}
          onToggle={onToggleTodo}
          onRemove={onRemoveTodo}
          onEdit={onEditTodo}
          onReorder={section === 'Active' ? handleReorderActive : handleReorderDone}
        />
      ) : (
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">
          {section === 'Done' ? 'No completed todos' : 'No active todos'}
        </p>
      )}

      <div className="mt-4">
        <AddTodoBar onAdd={onAddTodo} />
      </div>
    </motion.div>
  );
}

function WorkspaceTab({ project, onUpdateProject, onNotify }) {
  const [noteText, setNoteText] = useState(project.notes || '');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const projectRef = useRef(project);
  projectRef.current = project;

  useEffect(() => {
    setNoteText(project.notes || '');
  }, [project.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (noteText !== projectRef.current.notes) {
        onUpdateProject({ ...projectRef.current, notes: noteText });
        onNotify('Notes auto-saved');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [noteText, onUpdateProject, onNotify]);

  const handleSaveNotes = () => {
    onUpdateProject({ ...project, notes: noteText });
    onNotify('Notes saved');
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!newLinkUrl.trim() || !newLinkTitle.trim()) return;
    const updated = {
      ...project,
      links: [...(project.links || []), { url: newLinkUrl.trim(), title: newLinkTitle.trim() }],
    };
    onUpdateProject(updated);
    onNotify('Link added');
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const handleRemoveLink = (index) => {
    const updated = {
      ...project,
      links: (project.links || []).filter((_, i) => i !== index),
    };
    onUpdateProject(updated);
    onNotify('Link removed');
  };

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!assetName.trim()) return;
    const newAsset = { name: assetName.trim(), url: assetUrl.trim(), addedAt: new Date().toISOString() };
    const updated = {
      ...project,
      assets: [...(project.assets || []), newAsset],
    };
    onUpdateProject(updated);
    onNotify('Asset added');
    setAssetName('');
    setAssetUrl('');
  };

  const handleRemoveAsset = (index) => {
    const updated = {
      ...project,
      assets: (project.assets || []).filter((_, i) => i !== index),
    };
    onUpdateProject(updated);
    onNotify('Asset removed');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Notes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-clay)10' }}>
            <svg className="w-4 h-4" style={{ color: 'var(--accent-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notes</h3>
        </div>
        <div className="pl-10 space-y-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your notes here..."
            rows={6}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all resize-none"
          />
          <button
            onClick={handleSaveNotes}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
          >
            Save Notes
          </button>
        </div>
      </div>

      {/* Links */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-slate)10' }}>
            <svg className="w-4 h-4" style={{ color: 'var(--accent-slate)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Links</h3>
        </div>
        <div className="pl-10 space-y-3">
          <form onSubmit={handleAddLink} className="flex gap-2">
            <input
              type="text"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Title"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm outline-none focus:ring-2 focus:ring-[var(--accent-slate)]/30 transition-all"
            />
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="URL"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm outline-none focus:ring-2 focus:ring-[var(--accent-slate)]/30 transition-all"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: 'var(--accent-slate)' }}
            >
              Add
            </button>
          </form>
          <div className="space-y-2">
            {(project.links || []).length > 0 ? project.links.map((link, i) => (
              <div key={link.url + link.title + i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--border-subtle)]/40 group">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent-slate)] hover:text-[var(--accent-slate-light)] transition-colors truncate"
                >
                  {link.title || link.url}
                </a>
                <button
                  onClick={() => handleRemoveLink(i)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-clay)] transition-all p-1"
                  aria-label="Remove link"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )) : (
              <p className="text-xs text-[var(--text-muted)]">No links saved</p>
            )}
          </div>
        </div>
      </div>

      {/* Assets — now functional */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#5A8F6C10' }}>
            <svg className="w-4 h-4" style={{ color: '#5A8F6C' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Assets</h3>
        </div>
        <div className="pl-10 space-y-3">
          <form onSubmit={handleAddAsset} className="flex gap-2">
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Asset name"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm outline-none focus:ring-2 focus:ring-[#5A8F6C]/30 transition-all"
            />
            <input
              type="text"
              value={assetUrl}
              onChange={(e) => setAssetUrl(e.target.value)}
              placeholder="URL or path (optional)"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm outline-none focus:ring-2 focus:ring-[#5A8F6C]/30 transition-all"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: '#5A8F6C' }}
            >
              Add
            </button>
          </form>
          <div className="space-y-2">
            {(project.assets || []).length > 0 ? project.assets.map((asset, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--border-subtle)]/40 group">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5A8F6C] shrink-0" />
                  {asset.url ? (
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#5A8F6C] hover:underline truncate"
                    >
                      {asset.name}
                    </a>
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)] truncate">{asset.name}</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveAsset(i)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-clay)] transition-all p-1 shrink-0"
                  aria-label="Remove asset"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )) : (
              <p className="text-xs text-[var(--text-muted)]">No assets yet — add files, designs, or reference links</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TimelineTab({ project }) {
  // Sort timeline entries by date descending (most recent first)
  const sortedTimeline = [...(project.timeline || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const grouped = groupTimelineByDate(sortedTimeline);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([date, entries]) => (
        <div key={date}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            {date}
          </h3>
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-subtle)] shrink-0" />
                <span className="flex-1">{entry.action}</span>
                <span className="text-xs text-[var(--text-muted)]">{formatRelativeTime(entry.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )) : (
        <p className="text-xs text-[var(--text-muted)] text-center py-8">No activity yet</p>
      )}
    </motion.div>
  );
}

function SettingsTab({ project, onUpdateProject, onNotify, onUnsavedChanges }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...project });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setForm({ ...project });
    setHasUnsavedChanges(false);
  }, [project]);

  useEffect(() => {
    if (editing) {
      const changed = JSON.stringify(form) !== JSON.stringify(project);
      setHasUnsavedChanges(changed);
      onUnsavedChanges?.(changed);
    } else {
      onUnsavedChanges?.(false);
    }
  }, [form, project, editing, onUnsavedChanges]);

  useEffect(() => {
    if (hasUnsavedChanges && editing) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges, editing]);

  const handleSave = () => {
    onUpdateProject({
      ...project,
      title: form.title,
      status: form.status,
      deadline: form.deadline,
      goal: form.goal,
      description: form.description,
      currentFocus: form.currentFocus,
      nextStep: form.nextStep,
    });
    setEditing(false);
    setHasUnsavedChanges(false);
    onNotify('Project saved');
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Discard them?')) {
        setForm({ ...project });
        setEditing(false);
        setHasUnsavedChanges(false);
      }
    } else {
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {[
          { label: 'Project Name', value: project.title },
          { label: 'Status', value: project.status, isStatus: true },
          { label: 'Goal', value: project.goal },
          { label: 'Current Focus', value: project.currentFocus },
          { label: 'Next Step', value: project.nextStep },
          { label: 'Deadline', value: formatDeadlineForDisplay(project.deadline) },
          { label: 'Description', value: project.description },
        ].map((field) => (
          <div key={field.label} className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
            <span className="text-sm text-[var(--text-muted)]">{field.label}</span>
            {field.isStatus ? (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_BG[field.value] || STATUS_BG.Finished}`}>
                {field.value || '—'}
              </span>
            ) : (
              <span className="text-sm font-medium text-[var(--text-primary)] text-right max-w-[60%] truncate">{field.value || '—'}</span>
            )}
          </div>
        ))}
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
        >
          Edit Project
        </button>
      </motion.div>
    );
  }

  // Edit form — correct order: Name, Status, Goal, Current Focus, Next Step, Deadline, Description
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Project Name */}
      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Project Name</label>
        <input
          type="text"
          value={form.title || ''}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all"
        />
      </div>

      {/* Status — 2nd */}
      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 appearance-none"
          style={{ color: STATUS_COLORS[form.status] || 'inherit' }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} style={{ color: STATUS_COLORS[s] }}>{s}</option>
          ))}
        </select>
      </div>

      {[
        { key: 'goal', label: 'Goal' },
        { key: 'currentFocus', label: 'Current Focus' },
        { key: 'nextStep', label: 'Next Step' },
      ].map((field) => (
        <div key={field.key} className="py-2">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{field.label}</label>
          <input
            type="text"
            value={form[field.key] || ''}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all"
          />
        </div>
      ))}

      {/* Deadline — calendar picker */}
      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Deadline</label>
        <input
          type="date"
          value={form.deadline || ''}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all"
        />
      </div>

      {/* Description */}
      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Description</label>
        <textarea
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all resize-none"
        />
      </div>

      {hasUnsavedChanges && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          You have unsaved changes
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
        >
          Save Changes
        </button>
      </div>
    </motion.div>
  );
}

export default function ProjectDetailView({ project, onBack, onUpdateProject, onDeleteProject, onNotify }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [editingTodo, setEditingTodo] = useState(null);
  const [settingsHasUnsavedChanges, setSettingsHasUnsavedChanges] = useState(false);

  const handleTabChange = (newTab) => {
    if (activeTab === 'Settings' && settingsHasUnsavedChanges) {
      if (window.confirm('You have unsaved changes in Settings. Discard them?')) {
        setActiveTab(newTab);
        setSettingsHasUnsavedChanges(false);
      }
    } else {
      setActiveTab(newTab);
    }
  };

  const handleAddTodo = (text, priority, details) => {
    const todo = createTodo(text, priority, details);
    const newTodos = [...(project.todos || []), todo];
    
    // Use memoized calculations
    const activeTodos = newTodos.filter((t) => !t.done);
    const firstActive = getFirstActiveTodo(newTodos);
    const nextHighPriority = getNextHighPriorityTodo(newTodos);
    
    // Compute Next Step: show "-" if same as Current Focus or only 1 todo
    let nextStepText = '-';
    if (activeTodos.length > 1) {
      if (nextHighPriority && nextHighPriority.id !== firstActive?.id) {
        nextStepText = nextHighPriority.text;
      } else if (activeTodos.length > 1) {
        nextStepText = activeTodos[1]?.text || '-';
      }
    }
    
    const updated = {
      ...project,
      todos: newTodos,
      todoCount: newTodos.filter((t) => !t.done).length,
      progress: computeProgress(newTodos),
      currentFocus: project.currentFocus || (firstActive ? firstActive.text : text),
      nextStep: project.nextStep || nextStepText,
      lastWorked: 'just now',
      timeline: [...(project.timeline || []), { date: new Date().toISOString(), action: `Added todo: ${text}` }],
    };
    onUpdateProject(updated);
    onNotify?.('Todo added');
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
  };

  const handleSaveEditedTodo = (editedTodo) => {
    const newTodos = (project.todos || []).map((t) =>
      t.id === editedTodo.id ? editedTodo : t
    );
    const updated = {
      ...project,
      todos: newTodos,
      lastWorked: 'just now',
      timeline: [...(project.timeline || []), { date: new Date().toISOString(), action: `Updated todo: ${editedTodo.text}` }],
    };
    onUpdateProject(updated);
    onNotify?.('Todo updated');
  };

  const handleToggleTodo = (todoId) => {
    const newTodos = (project.todos || []).map((t) =>
      t.id === todoId ? { ...t, done: !t.done } : t
    );
    const toggled = newTodos.find((t) => t.id === todoId);
    
    // Use memoized calculations
    const activeTodos = newTodos.filter((t) => !t.done);
    const firstActive = getFirstActiveTodo(newTodos);
    const nextHighPriority = getNextHighPriorityTodo(newTodos);
    
    // Compute Next Step: show "-" if same as Current Focus or only 1 todo
    let nextStepText = '-';
    if (activeTodos.length > 1) {
      if (nextHighPriority && nextHighPriority.id !== firstActive?.id) {
        nextStepText = nextHighPriority.text;
      } else if (activeTodos.length > 1) {
        nextStepText = activeTodos[1]?.text || '-';
      }
    }
    
    const updated = {
      ...project,
      todos: newTodos,
      todoCount: newTodos.filter((t) => !t.done).length,
      progress: computeProgress(newTodos),
      currentFocus: firstActive ? firstActive.text : 'All done!',
      nextStep: nextStepText,
      lastWorked: 'just now',
      timeline: [...(project.timeline || []), {
        date: new Date().toISOString(),
        action: `Marked "${toggled?.text || 'unknown'}" as ${toggled?.done ? 'done' : 'pending'}`,
      }],
    };
    onUpdateProject(updated);
    onNotify?.(toggled?.done ? 'Todo completed' : 'Todo reopened');
  };

  const handleRemoveTodo = (todoId) => {
    const removed = (project.todos || []).find((t) => t.id === todoId);
    const newTodos = (project.todos || []).filter((t) => t.id !== todoId);
    
    // Use memoized calculations
    const activeTodos = newTodos.filter((t) => !t.done);
    const firstActive = getFirstActiveTodo(newTodos);
    const nextHighPriority = getNextHighPriorityTodo(newTodos);
    
    // Compute Next Step: show "-" if same as Current Focus or only 1 todo
    let nextStepText = '-';
    if (activeTodos.length > 1) {
      if (nextHighPriority && nextHighPriority.id !== firstActive?.id) {
        nextStepText = nextHighPriority.text;
      } else if (activeTodos.length > 1) {
        nextStepText = activeTodos[1]?.text || '-';
      }
    }
    
    const updated = {
      ...project,
      todos: newTodos,
      todoCount: newTodos.filter((t) => !t.done).length,
      progress: computeProgress(newTodos),
      currentFocus: firstActive ? firstActive.text : (newTodos.length === 0 ? 'Getting started' : 'All done!'),
      nextStep: nextStepText,
      lastWorked: 'just now',
      timeline: [...(project.timeline || []), { date: new Date().toISOString(), action: `Removed todo: "${removed?.text}"` }],
    };
    onUpdateProject(updated);
    onNotify?.('Todo removed');
  };

  const handleReorderTodos = (reorderedTodos) => {
    const updated = {
      ...project,
      todos: reorderedTodos,
    };
    onUpdateProject(updated);
  };

  const handleDeleteProject = () => {
    if (window.confirm(`Delete "${project.title}"? This cannot be undone.`)) {
      onDeleteProject?.(project.id);
      onNotify?.('Project deleted');
    }
  };

  // Memoize progress calculation at component level
  const progress = useMemo(() => computeProgress(project.todos), [project.todos]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-center justify-between mb-6">
        <motion.button
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Projects
        </motion.button>
        <motion.button
          onClick={handleDeleteProject}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-red-500 transition-colors"
          aria-label="Delete project"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </motion.button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: STATUS_COLORS[project.status] || '#7A706A' }} />
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              {project.title}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {project.goal}
            </p>
          </div>
        </div>
        <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0 ml-4">
          worked {project.lastWorked}
        </span>
      </div>

      <div className="p-5 mb-6 rounded-xl border border-[var(--border-subtle)] bg-gradient-to-r from-[var(--accent-clay)]/5 to-transparent">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-clay)]/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
              Resume Project
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 mb-3">
              <span className="text-xs text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Focus:</span>{' '}
                {project.currentFocus || getFirstActiveTodo(project.todos)?.text || 'Not set'}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Next:</span>{' '}
                {project.nextStep || getFirstActiveTodo(project.todos)?.text || 'No todos yet'}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {(project.todos || []).filter((t) => !t.done).length} todos remaining
              </span>
            </div>
            {/* Dynamic progress */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--accent-clay), var(--accent-clay-light))' }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 mb-6 border-b border-[var(--border-subtle)]" role="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              role="tab"
              aria-selected={isActive}
              className={`relative px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-[var(--accent-clay)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab}
              {isActive && (
                <motion.div
                  layoutId="detail-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-clay)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        {activeTab === 'Overview' && (
          <OverviewTab
            key="overview"
            project={project}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onRemoveTodo={handleRemoveTodo}
            onEditTodo={handleEditTodo}
            onReorderTodos={handleReorderTodos}
          />
        )}
        {activeTab === 'Todos' && (
          <TodosTab
            key="todos"
            project={project}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onRemoveTodo={handleRemoveTodo}
            onEditTodo={handleEditTodo}
            onReorderTodos={handleReorderTodos}
          />
        )}
        {activeTab === 'Workspace' && (
          <WorkspaceTab
            key="workspace"
            project={project}
            onUpdateProject={onUpdateProject}
            onNotify={onNotify}
          />
        )}
        {activeTab === 'Timeline' && <TimelineTab key="timeline" project={project} />}
        {activeTab === 'Settings' && (
          <SettingsTab
            key="settings"
            project={project}
            onUpdateProject={onUpdateProject}
            onNotify={onNotify}
            onUnsavedChanges={setSettingsHasUnsavedChanges}
          />
        )}
      </AnimatePresence>

      <EditTodoModal
        todo={editingTodo}
        isOpen={!!editingTodo}
        onClose={() => setEditingTodo(null)}
        onSave={handleSaveEditedTodo}
      />
    </motion.div>
  );
}
