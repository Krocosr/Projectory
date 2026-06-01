'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function inLastWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  return Date.now() - d <= SEVEN_DAYS;
}

export default function WeeklySummary({ projects }) {
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    const completedTodos = [];
    const pomodoroSessions = [];
    const timelineEvents = [];

    (projects || []).forEach((p) => {
      (p.todos || []).forEach((t) => {
        if (t.done && t.createdAt && inLastWeek(t.createdAt)) {
          completedTodos.push({ project: p.title, text: t.text });
        }
      });

      (p.pomodoroLog || []).forEach((log) => {
        if (inLastWeek(log.date)) {
          pomodoroSessions.push({ project: p.title, ...log });
        }
      });

      (p.timeline || []).forEach((entry) => {
        if (inLastWeek(entry.date)) {
          timelineEvents.push({ project: p.title, ...entry });
        }
      });
    });

    const totalFocusMinutes = pomodoroSessions
      .filter((s) => s.type === 'focus')
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      completedCount: completedTodos.length,
      completedTodos,
      pomodoroCount: pomodoroSessions.length,
      totalFocusMinutes,
      timelineCount: timelineEvents.length,
      timelineEvents,
    };
  }, [projects]);

  if (stats.completedCount === 0 && stats.pomodoroCount === 0 && stats.timelineCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--border-subtle)]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text-primary)]">This Week</span>
          <span className="text-xs text-[var(--text-muted)]">
            {stats.completedCount} done &middot; {stats.pomodoroCount} sessions &middot; {stats.timelineCount} updates
          </span>
        </div>
        <motion.svg
          animate={{ rotate: expanded ? 180 : 0 }}
          className="w-4 h-4 text-[var(--text-muted)]"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 border-t border-[var(--border-subtle)] space-y-4">
              <div className="grid grid-cols-3 gap-4 pt-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.completedCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Todos Done</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.pomodoroCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Pomodoro</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalFocusMinutes}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Focus Min</div>
                </div>
              </div>

              {stats.completedTodos.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Completed Todos</h4>
                  <ul className="space-y-1">
                    {stats.completedTodos.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[var(--text-muted)] truncate max-w-[120px]">{item.project}:</span>
                        <span className="truncate">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stats.timelineEvents.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Activity</h4>
                  <ul className="space-y-1">
                    {stats.timelineEvents.slice(0, 10).map((evt, i) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                        <span className="text-[var(--text-muted)]">{evt.project}:</span>
                        <span>{evt.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
