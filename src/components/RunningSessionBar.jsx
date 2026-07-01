'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

function formatElapsed(startedAt, timerMode, limit) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  
  let displaySec = sec;
  if (timerMode === 'countdown' || timerMode === 'pomodoro') {
    displaySec = Math.max(0, limit - sec);
  }

  const m = Math.floor(displaySec / 60);
  const s = displaySec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RunningSessionBar({ runningSessions, projects, onNavigate, onStopSession }) {
  const timersRef = useRef({});
  const intervalRef = useRef(null);

  const entries = Object.entries(runningSessions).filter(([, s]) => s.status === 'running');

  useEffect(() => {
    if (entries.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        Object.keys(timersRef.current).forEach((id) => {
          const el = document.getElementById(`timer-${id}`);
          const s = timersRef.current[id];
          if (el && s) {
            el.textContent = formatElapsed(s.startedAt, s.timerMode, s.limit);
          }
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current && entries.length === 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [entries.length]);

  entries.forEach(([id, s]) => { timersRef.current[id] = s; });

  if (entries.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[var(--z-fab)] space-y-2" style={{ zIndex: 40 }}>
      <AnimatePresence>
        {entries.map(([projectId, session]) => {
          const project = projects.find((p) => String(p.id) === String(projectId));
          return (
            <motion.div
              key={projectId}
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -80, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="flex items-center gap-3 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl shadow-xl px-4 py-3 cursor-pointer hover:border-[var(--accent-clay)]/30 transition-colors group min-w-[240px]"
              onClick={() => onNavigate(projectId)}
              title={project?.title || 'Unknown project'}
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {project?.title || 'Unknown'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)]">{session.launchItemIds?.length || 0} apps</span>
                  <span id={`timer-${projectId}`} className="text-[10px] font-mono tabular-nums text-[var(--accent-clay)]">
                    {session.startedAt ? formatElapsed(session.startedAt, session.timerMode, session.limit) : '00:00'}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onStopSession(projectId); }}
                className="shrink-0 w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                title="Stop tracking"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

RunningSessionBar.propTypes = {
  runningSessions: PropTypes.object.isRequired,
  projects: PropTypes.array.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onStopSession: PropTypes.func.isRequired,
};
