'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    o.type = 'sine';
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function PomodoroTimer({ project, onUpdateProject }) {
  const [phase, setPhase] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(FOCUS_SECONDS);
  const startedRef = useRef(null);
  const phaseRef = useRef(phase);
  const timeLeftRef = useRef(timeLeft);
  const projectRef = useRef(project);
  const onUpdateRef = useRef(onUpdateProject);
  const prevIdRef = useRef(project.id);

  phaseRef.current = phase;
  timeLeftRef.current = timeLeft;
  projectRef.current = project;
  onUpdateRef.current = onUpdateProject;

  useEffect(() => {
    if (prevIdRef.current !== project.id) {
      setPhase('idle');
      setTimeLeft(FOCUS_SECONDS);
      prevIdRef.current = project.id;
    }
  }, [project.id]);

  useEffect(() => {
    if (phase === 'idle') return;
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (timeLeft > 0) return;
    if (phase === 'idle') return;

    beep();

    if (phaseRef.current === 'focus') {
      const p = projectRef.current;
      const update = onUpdateRef.current;
      const log = p.pomodoroLog || [];
      update({
        ...p,
        pomodoroLog: [
          ...log,
          { startedAt: startedRef.current, duration: FOCUS_SECONDS, type: 'focus' },
        ],
      });
      setPhase('break');
      setTimeLeft(BREAK_SECONDS);
    } else if (phaseRef.current === 'break') {
      setPhase('idle');
      setTimeLeft(FOCUS_SECONDS);
    }
  }, [timeLeft, phase]);

  const handleStart = useCallback(() => {
    startedRef.current = new Date().toISOString();
    setPhase('focus');
    setTimeLeft(FOCUS_SECONDS);
  }, []);

  const handleStop = useCallback(() => {
    if (phaseRef.current === 'focus') {
      const elapsed = FOCUS_SECONDS - timeLeftRef.current;
      if (elapsed >= 60) {
        const p = projectRef.current;
        const update = onUpdateRef.current;
        const log = p.pomodoroLog || [];
        update({
          ...p,
          pomodoroLog: [
            ...log,
            { startedAt: startedRef.current, duration: elapsed, type: 'focus' },
          ],
        });
      }
    }
    setPhase('idle');
    setTimeLeft(FOCUS_SECONDS);
  }, []);

  const isActive = phase !== 'idle';
  const pct = phase === 'focus'
    ? ((FOCUS_SECONDS - timeLeft) / FOCUS_SECONDS) * 100
    : phase === 'break'
      ? ((BREAK_SECONDS - timeLeft) / BREAK_SECONDS) * 100
      : 0;

  const labelText = phase === 'focus'
    ? 'Focus Time'
    : phase === 'break'
      ? 'Break'
      : 'Pomodoro Timer';

  const accentBorder = phase === 'focus'
    ? 'border-[var(--accent-clay)]/40 bg-[var(--accent-clay)]/5'
    : phase === 'break'
      ? 'border-green-400/40 bg-green-50 dark:bg-green-900/10'
      : 'border-[var(--border-subtle)]';

  const accentIcon = phase === 'focus'
    ? 'text-[var(--accent-clay)]'
    : phase === 'break'
      ? 'text-green-500'
      : 'text-[var(--text-muted)]';

  const accentIconBg = phase === 'focus'
    ? 'bg-[var(--accent-clay)]/10'
    : phase === 'break'
      ? 'bg-green-100 dark:bg-green-900/20'
      : 'bg-[var(--border-subtle)]';

  return (
    <motion.div
      layout
      className={`rounded-xl border p-4 mb-4 transition-colors ${accentBorder}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentIconBg}`}>
            <svg className={`w-5 h-5 ${accentIcon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </div>
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider ${accentIcon}`}>
              {labelText}
            </p>
            <p className={`text-2xl font-bold tabular-nums tracking-tight ${phase === 'focus' ? 'text-[var(--accent-clay)]' : phase === 'break' ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-primary)]'}`}>
              {fmt(timeLeft)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full animate-pulse ${phase === 'focus' ? 'bg-[var(--accent-clay)]' : 'bg-green-500'}`} />
              <span className="text-xs text-[var(--text-muted)] capitalize">{phase}</span>
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={isActive ? handleStop : handleStart}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              isActive
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                : 'bg-[var(--accent-clay)] text-white hover:opacity-90'
            }`}
          >
            {isActive ? 'Stop' : 'Start Focus'}
          </motion.button>
        </div>
      </div>
      {isActive && (
        <div className="mt-3 h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${phase === 'focus' ? 'bg-[var(--accent-clay)]' : 'bg-green-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

PomodoroTimer.propTypes = {
  project: PropTypes.object.isRequired,
  onUpdateProject: PropTypes.func.isRequired,
};
