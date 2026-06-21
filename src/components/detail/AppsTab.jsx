'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { SectionHeader } from '@/components/ui';
import { pickFile as desktopPickFile, pickFolder as desktopPickFolder, isDesktop, launchItems } from '@/lib/desktop';

let nextLaunchId = Date.now();

export default function AppsTab({ project, onUpdateProject, onNotify }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const projectRef = useRef(project);
  const onUpdateRef = useRef(onUpdateProject);
  projectRef.current = project;
  onUpdateRef.current = onUpdateProject;

  const items = project.launchItems || [];

  const openAdd = () => { setEditingId(null); setShowModal(true); };
  const openEdit = (id) => { setEditingId(id); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const handleSave = (form) => {
    const p = projectRef.current;
    const onUpdate = onUpdateRef.current;
    let newItems;
    if (editingId) {
      newItems = (p.launchItems || []).map((it) =>
        String(it.id) === String(editingId) ? { ...it, ...form } : it
      );
    } else {
      newItems = [...(p.launchItems || []), { id: nextLaunchId++, ...form }];
    }
    onUpdate({ ...p, launchItems: newItems });
    onNotify(editingId ? 'Launch item updated' : 'Launch item added');
    closeModal();
  };

  const handleRemove = (id) => {
    const p = projectRef.current;
    const onUpdate = onUpdateRef.current;
    const newItems = (p.launchItems || []).filter((it) => String(it.id) !== String(id));
    onUpdate({ ...p, launchItems: newItems });
    onNotify('Launch item removed');
  };

  const handleMoveUp = (idx) => {
    if (idx <= 0) return;
    const p = projectRef.current;
    const newItems = [...(p.launchItems || [])];
    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    onUpdateRef.current({ ...p, launchItems: newItems });
  };

  const handleMoveDown = (idx) => {
    const p = projectRef.current;
    const items = p.launchItems || [];
    if (idx >= items.length - 1) return;
    const newItems = [...items];
    [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
    onUpdateRef.current({ ...p, launchItems: newItems });
  };

  const toggleKillOnStop = (id) => {
    const p = projectRef.current;
    const newItems = (p.launchItems || []).map((it) =>
      String(it.id) === String(id) ? { ...it, killOnStop: !it.killOnStop } : it
    );
    onUpdateRef.current({ ...p, launchItems: newItems });
  };

  const handleLaunchItem = useCallback(async (item) => {
    const p = projectRef.current;
    const now = new Date().toISOString();
    const entry = {
      itemId: item.id,
      itemName: item.name || 'Unknown',
      startTime: now,
      source: 'launch',
    };
    const newLog = [...(p.activityLog || []), entry];
    const newTimeline = [...(p.timeline || []), { date: now, action: `Launched ${item.name}` }];
    onUpdateRef.current({ ...p, activityLog: newLog, timeline: newTimeline });
    await launchItems([item]);
    onNotify?.(`Launched ${item.name}`);
  }, [onNotify]);

  const recentSessions = (project.activityLog || [])
    .filter((s) => s.source === 'launch')
    .slice(-5)
    .reverse();

  return (
    <div>
      <SectionHeader
        label="Launch Items"
        action={
          <button
            onClick={openAdd}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent-clay)]/10 text-[var(--accent-clay)] hover:bg-[var(--accent-clay)]/20 transition-colors font-medium"
          >
            + Add Item
          </button>
        }
      />

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[var(--text-muted)]">No launch items configured.</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Add apps or commands to launch from this project.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  item.type === 'command'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-indigo-500/10 text-indigo-400'
                }`}>
                  {item.type === 'command' ? '&gt;_' : 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate font-mono">
                    {item.type === 'command' ? item.command : item.path}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleLaunchItem(item)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[var(--accent-clay)]/10 text-[var(--accent-clay)] hover:bg-[var(--accent-clay)]/20 transition-colors font-medium"
                    title={`Launch ${item.name}`}
                  >
                    Run
                  </button>
                  <button
                    onClick={() => toggleKillOnStop(item.id)}
                    title={item.killOnStop ? 'Will kill on stop' : 'Will not kill on stop'}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                      item.killOnStop
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'
                    }`}
                  >
                    {item.killOnStop ? 'Kill' : 'No-kill'}
                  </button>
                  {idx > 0 && (
                    <button onClick={() => handleMoveUp(idx)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  )}
                  {idx < items.length - 1 && (
                    <button onClick={() => handleMoveDown(idx)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                  <button onClick={() => openEdit(item.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleRemove(item.id)} className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {item.type === 'command' && item.wait && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">Waits for completion</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {recentSessions.length > 0 && (
        <div className="mt-8">
          <SectionHeader title="Recent Activity" />
          <div className="space-y-1.5">
            {recentSessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-[var(--text-muted)] py-1">
                <span>{s.itemName}</span>
                <span>{s.duration ? `${Math.round(s.duration / 60)}m` : 'in progress'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <LaunchItemModal
            item={editingId ? items.find((it) => String(it.id) === String(editingId)) : null}
            defaultWorkingDir={project.workingDir}
            onSave={handleSave}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

AppsTab.propTypes = {
  project: PropTypes.object.isRequired,
  onUpdateProject: PropTypes.func.isRequired,
  onNotify: PropTypes.func,
};

function LaunchItemModal({ item, defaultWorkingDir, onSave, onClose }) {
  const isEdit = !!item;
  const [mode, setMode] = useState(item?.type || 'app');
  const [name, setName] = useState(item?.name || '');
  const [path, setPath] = useState(item?.path || '');
  const [command, setCommand] = useState(item?.command || '');
  const [workingDir, setWorkingDir] = useState(item?.workingDir || defaultWorkingDir || '');
  const [wait, setWait] = useState(item?.wait || false);
  const [killOnStop, setKillOnStop] = useState(item?.killOnStop ?? true);

  const handlePickFile = async () => {
    if (isDesktop()) {
      const result = await desktopPickFile();
      if (result) {
        setPath(result);
        if (!name) setName(result.split(/[\\/]/).pop().replace(/\.[^.]+$/, ''));
      }
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files[0];
      if (file) {
        setPath(file.name);
        if (!name) setName(file.name.replace(/\.[^.]+$/, ''));
      }
    };
    input.click();
  };

  const handlePickFolder = async () => {
    if (isDesktop()) {
      const result = await desktopPickFolder();
      if (result) setWorkingDir(result);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.onchange = () => {
      const file = input.files[0];
      if (file) {
        setWorkingDir(file.path || file.webkitRelativePath.split('/')[0] || '.');
      }
    };
    input.click();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: name.trim() || 'Untitled',
      type: mode,
      path: mode === 'app' ? path.trim() : (workingDir || '.'),
      command: mode === 'command' ? command.trim() : '',
      workingDir: mode === 'command' ? workingDir.trim() : '',
      wait: mode === 'command' ? wait : false,
      killOnStop,
    });
  };

  const isValid = name.trim() && (mode === 'app' ? path.trim() : command.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
        className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-modal)] max-h-[90vh] overflow-y-auto"
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {isEdit ? 'Edit Item' : 'Add Launch Item'}
            </h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors" aria-label="Close">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex mx-6 mt-4 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-0.5">
          {['app', 'command'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                mode === m
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {m === 'app' ? 'App / File' : 'Command'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {mode === 'app' ? (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="Path to executable or file..."
                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-clay)] transition-colors"
                  />
                  <button type="button" onClick={handlePickFile} className="px-3 py-2 rounded-lg bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors">
                    Browse
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Command</label>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="npm start, code ., etc."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-clay)] transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Working Directory</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={workingDir}
                      onChange={(e) => setWorkingDir(e.target.value)}
                      placeholder="."
                      className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-clay)] transition-colors font-mono"
                    />
                    <button type="button" onClick={handlePickFolder} className="px-3 py-2 rounded-lg bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors">
                      Browse
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wait}
                    onChange={(e) => setWait(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-subtle)]"
                  />
                  <span className="text-xs text-[var(--text-muted)]">Wait for command to finish before launching next</span>
                </label>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Auto-filled from selection"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-clay)] transition-colors"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={killOnStop}
                onChange={(e) => setKillOnStop(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-subtle)]"
              />
              <span className="text-xs text-[var(--text-muted)]">Kill process when stop is pressed</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 p-6 pt-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-clay)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

LaunchItemModal.propTypes = {
  item: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
