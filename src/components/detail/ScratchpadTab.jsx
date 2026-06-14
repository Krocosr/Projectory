'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { formatRelativeTime } from '@/lib/dateUtils';
import { Textarea, Button, SectionHeader } from '@/components/ui';
import { MAX_SCRATCHPAD_ENTRIES } from '@/lib/constants';

const MAX_ENTRIES = MAX_SCRATCHPAD_ENTRIES;

export default function ScratchpadTab({ project, onUpdateProject, onNotify }) {
  const [inputText, setInputText] = useState('');
  const scratchpadLog = useMemo(() => project.scratchpadLog || [], [project.scratchpadLog]);
  const entryCount = scratchpadLog.length;
  const isAtLimit = entryCount >= MAX_ENTRIES;
  const reversedLog = useMemo(() => scratchpadLog.slice().reverse(), [scratchpadLog]);

  const handleAddEntry = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const newEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      text,
      createdAt: new Date().toISOString(),
    };

    let updatedLog = [...scratchpadLog, newEntry];
    
    // FIFO: Remove oldest if exceeding limit
    if (updatedLog.length > MAX_ENTRIES) {
      updatedLog = updatedLog.slice(updatedLog.length - MAX_ENTRIES);
    }

    const updated = {
      ...project,
      scratchpadLog: updatedLog,
      lastWorked: new Date().toISOString(),
      timeline: [...(project.timeline || []), {
        date: new Date().toISOString(),
        action: 'Added scratchpad note',
      }],
    };

    onUpdateProject(updated);
    onNotify('Note added');
    setInputText('');
  };

  const handleDeleteEntry = (entryId) => {
    const updatedLog = scratchpadLog.filter((entry) => entry.id !== entryId);
    const updated = {
      ...project,
      scratchpadLog: updatedLog,
      lastWorked: new Date().toISOString(),
    };
    onUpdateProject(updated);
    onNotify('Note deleted');
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader
          icon={<svg className="w-4 h-4 text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
          label="Scratchpad Log"
          count={`${entryCount}/${MAX_ENTRIES}`}
        />

        <div className="pl-10 space-y-4">
          <form onSubmit={handleAddEntry} className="space-y-2">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Quick note or thought..."
              rows={3}
              className="px-3.5 py-2.5 rounded-xl"
              aria-label="Scratchpad note input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddEntry(e);
                }
              }}
            />
            <div className="flex items-center justify-between">
              <Button
                type="submit"
                disabled={!inputText.trim()}
                variant="gradient"
                className="px-4 py-1.5"
              >
                Add Note
              </Button>
              {isAtLimit && (
                <span className="text-xs text-[var(--accent-clay)]">
                  Max 15 notes. Adding a new note will remove the oldest.
                </span>
              )}
            </div>
          </form>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {scratchpadLog.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic py-4">
                No notes yet. Add quick thoughts, reminders, or ideas here.
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {reversedLog.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="group relative px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--accent-clay)]/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap flex-1" data-streamer>
                        {entry.text}
                      </p>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                        aria-label="Delete note"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] mt-2 block">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

ScratchpadTab.propTypes = {
  project: PropTypes.object.isRequired,
  onUpdateProject: PropTypes.func.isRequired,
  onNotify: PropTypes.func.isRequired,
};
