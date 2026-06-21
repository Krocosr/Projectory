'use client';
import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { SectionHeader } from '@/components/ui';
import { pickFile as desktopPickFile, pickFolder as desktopPickFolder, isDesktop, launchItems as desktopLaunchItems } from '@/lib/desktop';

let nextLaunchId = Date.now();

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function playSound() {
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
  } catch {}
}

const DEFAULT_CONFIG = {
  mode: 'pomodoro', workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15,
  sessionsBeforeLongBreak: 4, soundEnabled: true, autoCycle: true,
  checkpointsEnabled: false, checkpointInterval: 15,
};

function SettingsModal({ timerMode, timerConfig, updateTimerConfig, customDuration, setCustomDuration, onClose }) {
  const { workDuration, shortBreakDuration, longBreakDuration, sessionsBeforeLongBreak, soundEnabled, autoCycle, checkpointsEnabled, checkpointInterval } = timerConfig;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/30"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
          className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-modal)] p-6 overflow-hidden"
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">Timer Settings</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors" aria-label="Close">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {timerMode === 'pomodoro' && (
            <div className="space-y-4">
              <SettingRow label="Focus (min)" value={workDuration} onChange={(v) => updateTimerConfig({ workDuration: v })} min={1} max={180} />
              <SettingRow label="Short Break (min)" value={shortBreakDuration} onChange={(v) => updateTimerConfig({ shortBreakDuration: v })} min={1} max={30} />
              <SettingRow label="Long Break (min)" value={longBreakDuration} onChange={(v) => updateTimerConfig({ longBreakDuration: v })} min={1} max={60} />
              <SettingRow label="Sessions / Long Break" value={sessionsBeforeLongBreak} onChange={(v) => updateTimerConfig({ sessionsBeforeLongBreak: v })} min={1} max={20} />
              <ToggleRow label="Auto-Cycle" enabled={autoCycle} onToggle={() => updateTimerConfig({ autoCycle: !autoCycle })} />
              <ToggleRow label="Sound" enabled={soundEnabled} onToggle={() => updateTimerConfig({ soundEnabled: !soundEnabled })} />
            </div>
          )}

          {timerMode === 'countdown' && (
            <div className="space-y-4">
              <SettingRow label="Duration (min)" value={customDuration} onChange={(v) => { setCustomDuration(v); updateTimerConfig({ workDuration: v }); }} min={1} max={180} />
              <ToggleRow label="Sound" enabled={soundEnabled} onToggle={() => updateTimerConfig({ soundEnabled: !soundEnabled })} />
            </div>
          )}

          {timerMode === 'countup' && (
            <div className="space-y-4">
              <ToggleRow label="Checkpoints" enabled={checkpointsEnabled} onToggle={() => updateTimerConfig({ checkpointsEnabled: !checkpointsEnabled })} />
              {checkpointsEnabled && (
                <SettingRow label="Every (min)" value={checkpointInterval} onChange={(v) => updateTimerConfig({ checkpointInterval: v })} min={1} max={60} />
              )}
              <ToggleRow label="Sound" enabled={soundEnabled} onToggle={() => updateTimerConfig({ soundEnabled: !soundEnabled })} />
            </div>
          )}

          <div className="flex justify-end mt-6 pt-3 border-t border-[var(--border-subtle)]">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors">
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function SettingRow({ label, value, onChange, min, max }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(min, value - 1))} className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors text-xs">−</button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
          className="w-14 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] text-center outline-none"
        />
        <button onClick={() => onChange(Math.min(max, value + 1))} className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors text-xs">+</button>
      </div>
    </div>
  );
}

function ToggleRow({ label, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <button
        onClick={onToggle}
        className={`relative w-8 h-4 rounded-full transition-colors ${enabled ? 'bg-[var(--accent-clay)]' : 'bg-[var(--border-subtle)]'}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function ActivityTab({ project, onUpdateProject, onNotify }) {
  const timerConfig = useMemo(() => {
    const tc = project.timerConfig || DEFAULT_CONFIG;
    return {
      ...DEFAULT_CONFIG,
      ...tc,
      shortBreakDuration: tc.shortBreakDuration ?? tc.breakDuration ?? DEFAULT_CONFIG.shortBreakDuration,
      longBreakDuration: tc.longBreakDuration ?? DEFAULT_CONFIG.longBreakDuration,
      sessionsBeforeLongBreak: tc.sessionsBeforeLongBreak ?? DEFAULT_CONFIG.sessionsBeforeLongBreak,
      soundEnabled: tc.soundEnabled ?? DEFAULT_CONFIG.soundEnabled,
      autoCycle: tc.autoCycle ?? DEFAULT_CONFIG.autoCycle,
      checkpointsEnabled: tc.checkpointsEnabled ?? DEFAULT_CONFIG.checkpointsEnabled,
      checkpointInterval: tc.checkpointInterval ?? DEFAULT_CONFIG.checkpointInterval,
    };
  }, [project.timerConfig]);

  const [timerMode, setTimerMode] = useState(timerConfig.mode);
  const [customDuration, setCustomDuration] = useState(timerConfig.workDuration);
  const [timerState, setTimerState] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(timerConfig.workDuration * 60);
  const [elapsed, setElapsed] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState('focus');
  const [pomodoroSessionCount, setPomodoroSessionCount] = useState(0);
  const [pomodoroCycle, setPomodoroCycle] = useState(0);
  const [checkpointCount, setCheckpointCount] = useState(0);
  const [lastCheckpoint, setLastCheckpoint] = useState(0);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [editingLaunchId, setEditingLaunchId] = useState(null);

  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const projectRef = useRef(project);
  const onUpdateRef = useRef(onUpdateProject);
  const timerModeRef = useRef(timerMode);
  const pomodoroPhaseRef = useRef(pomodoroPhase);
  const pomodoroSessionCountRef = useRef(pomodoroSessionCount);
  const pomodoroCycleRef = useRef(pomodoroCycle);
  const timerStateRef = useRef(timerState);
  const customDurationRef = useRef(customDuration);
  const checkpointCountRef = useRef(checkpointCount);
  const lastCheckpointRef = useRef(lastCheckpoint);
  projectRef.current = project;
  onUpdateRef.current = onUpdateProject;
  timerModeRef.current = timerMode;
  pomodoroPhaseRef.current = pomodoroPhase;
  pomodoroSessionCountRef.current = pomodoroSessionCount;
  pomodoroCycleRef.current = pomodoroCycle;
  timerStateRef.current = timerState;
  customDurationRef.current = customDuration;
  checkpointCountRef.current = checkpointCount;
  lastCheckpointRef.current = lastCheckpoint;

  const { workDuration, shortBreakDuration, longBreakDuration, sessionsBeforeLongBreak, soundEnabled, autoCycle, checkpointsEnabled, checkpointInterval } = timerConfig;

  useEffect(() => {
    if (timerState === 'idle') {
      if (timerMode === 'countup') {
        setTimeLeft(0);
        setElapsed(0);
        setCheckpointCount(0);
        setLastCheckpoint(0);
      } else if (timerMode === 'countdown') {
        setTimeLeft(customDuration * 60);
        setElapsed(0);
      } else {
        setTimeLeft(workDuration * 60);
        setElapsed(0);
        setPomodoroPhase('focus');
        setPomodoroSessionCount(0);
        setPomodoroCycle(0);
      }
    }
  }, [timerMode, customDuration, workDuration, timerState]);

  useEffect(() => {
    if (timerState !== 'running') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const start = Date.now() - (elapsed * 1000);
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const total = Math.floor((now - start) / 1000);
      setElapsed(total);

      if (timerModeRef.current === 'countup') {
        if (checkpointsEnabled && checkpointInterval > 0) {
          const nextCheckpoint = Math.floor(total / (checkpointInterval * 60));
          if (nextCheckpoint > lastCheckpointRef.current) {
            setCheckpointCount(nextCheckpoint);
            setLastCheckpoint(nextCheckpoint);
            if (soundEnabled) playSound();
          }
        }
        return;
      }

      const phase = pomodoroPhaseRef.current;
      const limit = timerModeRef.current === 'countdown'
        ? customDurationRef.current * 60
        : phase === 'focus' ? workDuration * 60
          : phase === 'shortBreak' ? shortBreakDuration * 60
            : longBreakDuration * 60;

      const remaining = Math.max(0, limit - total);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setTimerState('finished');
        if (soundEnabled) {
          setTimeout(playSound, 100);
          setTimeout(playSound, 400);
          setTimeout(playSound, 700);
        }
      }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [timerState, workDuration, shortBreakDuration, longBreakDuration, soundEnabled, checkpointsEnabled, checkpointInterval, elapsed]);

  useEffect(() => {
    if (timerState !== 'finished') return;

    const endTime = new Date().toISOString();
    const p = projectRef.current;
    const update = onUpdateRef.current;
    const mode = timerModeRef.current;
    const phase = pomodoroPhaseRef.current;

    if (mode === 'countdown') {
      const entry = {
        itemId: `${Date.now()}`,
        itemName: 'Countdown session',
        startTime: startedAtRef.current || endTime,
        endTime,
        duration: customDurationRef.current * 60,
        source: 'countdown',
      };
      const newLog = [...(p.activityLog || []), entry];
      const newTimeline = [...(p.timeline || []), {
        date: endTime, action: `Completed countdown session (${customDurationRef.current}m)`,
      }];
      update({ ...p, activityLog: newLog, timeline: newTimeline });
      onNotify?.(`Countdown finished: ${customDurationRef.current}m`);
      return;
    }

    if (mode === 'pomodoro') {
      if (phase === 'focus') {
        const count = pomodoroSessionCountRef.current;
        const cycle = pomodoroCycleRef.current;
        const entry = {
          itemId: `${Date.now()}`,
          itemName: `Pomodoro C${cycle + 1} #${count + 1}`,
          startTime: startedAtRef.current || endTime,
          endTime,
          duration: workDuration * 60,
          source: 'pomodoro',
        };
        const newLog = [...(p.activityLog || []), entry];
        const newTimeline = [...(p.timeline || []), {
          date: endTime, action: `Completed pomodoro C${cycle + 1} session #${count + 1}`,
        }];
        update({ ...p, activityLog: newLog, timeline: newTimeline });
        onNotify?.(`Focus session #${count + 1} complete!`);

        const nextCount = count + 1;
        setPomodoroSessionCount(nextCount);
        if (nextCount >= sessionsBeforeLongBreak) {
          setPomodoroPhase('longBreak');
          setTimeLeft(longBreakDuration * 60);
        } else {
          setPomodoroPhase('shortBreak');
          setTimeLeft(shortBreakDuration * 60);
        }
        setElapsed(0);
        setTimerState('running');
        startedAtRef.current = new Date().toISOString();
      } else {
        if (autoCycle && phase === 'longBreak') {
          setPomodoroSessionCount(0);
          setPomodoroCycle((c) => c + 1);
          setPomodoroPhase('focus');
          setTimeLeft(workDuration * 60);
          setElapsed(0);
          setTimerState('running');
          startedAtRef.current = new Date().toISOString();
          onNotify?.('Cycle complete! Starting next cycle.');
        } else {
          if (phase === 'longBreak') setPomodoroSessionCount(0);
          setPomodoroPhase('focus');
          setTimeLeft(workDuration * 60);
          setElapsed(0);
          onNotify?.('Break finished!');
        }
      }
    }
  }, [timerState, workDuration, shortBreakDuration, longBreakDuration, sessionsBeforeLongBreak, soundEnabled, autoCycle, onNotify]);

  const handleStart = () => {
    startedAtRef.current = new Date().toISOString();
    setCheckpointCount(0);
    setLastCheckpoint(0);
    if (timerMode === 'countup') {
      setElapsed(0);
    } else {
      setElapsed(0);
      if (timerMode === 'countdown') setTimeLeft(customDuration * 60);
      else {
        setTimeLeft(workDuration * 60);
        setPomodoroPhase('focus');
        setPomodoroSessionCount(0);
        setPomodoroCycle(0);
      }
    }
    setTimerState('running');
  };

  const handlePause = () => setTimerState('paused');
  const handleResume = () => setTimerState('running');

  const handleStop = useCallback(() => {
    setTimerState('idle');
    const endTime = new Date().toISOString();
    const duration = elapsed;

    if (duration >= 10) {
      const label = timerMode === 'countup' && checkpointsEnabled
        ? `CountUp (${checkpointCount} checkpoints)`
        : `${timerMode.charAt(0).toUpperCase() + timerMode.slice(1)} session`;
      const entry = {
        itemId: `${Date.now()}`,
        itemName: label,
        startTime: startedAtRef.current || endTime,
        endTime,
        duration,
        source: timerMode,
      };
      const p = projectRef.current;
      const newLog = [...(p.activityLog || []), entry];
      const newTimeline = [...(p.timeline || []), {
        date: endTime,
        action: `Completed ${timerMode} session (${formatDuration(duration)})`,
      }];
      onUpdateRef.current({ ...p, activityLog: newLog, timeline: newTimeline });
      onNotify?.(`${timerMode.charAt(0).toUpperCase() + timerMode.slice(1)} session: ${formatDuration(duration)}`);
    }
  }, [elapsed, timerMode, checkpointsEnabled, checkpointCount, onNotify]);

  const updateTimerConfig = useCallback((updates) => {
    const p = projectRef.current;
    onUpdateRef.current({
      ...p,
      timerConfig: { ...p.timerConfig, ...updates },
    });
  }, []);

  const handleRemoveLogEntry = useCallback((date, itemId) => {
    const p = projectRef.current;
    const newActivityLog = (p.activityLog || []).filter(entry => entry.itemId !== itemId);
    const newTimeline = (p.timeline || []).filter(entry => {
      if (!entry.action.startsWith('Completed') && !entry.action.startsWith('Launched')) return true; // Keep other timeline entries
      return !entry.action.includes(itemId);
    });
    onUpdateRef.current({ ...p, activityLog: newActivityLog, timeline: newTimeline });
    onNotify?.('Session entry removed');
  }, [onNotify]);

  const openAddLaunch = () => { setEditingLaunchId(null); setShowLaunchModal(true); };
  const openEditLaunch = (id) => { setEditingLaunchId(id); setShowLaunchModal(true); };
  const closeLaunchModal = () => setShowLaunchModal(false);

  const handleSaveLaunch = (form) => {
    const p = projectRef.current;
    const onUpdate = onUpdateRef.current;
    let newItems;
    if (editingLaunchId) {
      newItems = (p.launchItems || []).map((it) =>
        String(it.id) === String(editingLaunchId) ? { ...it, ...form } : it
      );
    } else {
      newItems = [...(p.launchItems || []), { id: nextLaunchId++, ...form }];
    }
    onUpdate({ ...p, launchItems: newItems });
    onNotifyRef.current(editingLaunchId ? 'Launch item updated' : 'Launch item added');
    closeLaunchModal();
  };

  const handleRemoveLaunch = (id) => {
    const p = projectRef.current;
    const newItems = (p.launchItems || []).filter((it) => String(it.id) !== String(id));
    onUpdateRef.current({ ...p, launchItems: newItems });
    onNotifyRef.current('Launch item removed');
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
    await desktopLaunchItems([item]);
    onNotifyRef.current(`Launched ${item.name}`);
  }, []);

  const launchItems = project.launchItems || [];

  const displayTime = timerMode === 'countup' ? elapsed : timeLeft;
  const displayMinutes = Math.floor(displayTime / 60);
  const displaySeconds = displayTime % 60;

  const phaseLabel = timerMode === 'pomodoro'
    ? pomodoroPhase === 'focus' ? 'Focus'
      : pomodoroPhase === 'shortBreak' ? 'Short Break'
        : 'Long Break'
    : '';

  const log = useMemo(() => project.activityLog || [], [project.activityLog]);
  const totals = useMemo(() => {
    const bySource = {};
    let totalSeconds = 0;
    log.forEach((entry) => {
      if (entry.duration) {
        totalSeconds += entry.duration;
        const src = entry.source || 'launch';
        bySource[src] = (bySource[src] || 0) + entry.duration;
      }
    });
    return { totalSeconds, bySource };
  }, [log]);

  const groupedLog = useMemo(() => {
    const groups = {};
    const sorted = [...log].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    sorted.forEach((entry) => {
      const date = new Date(entry.startTime).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  }, [log]);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <SectionHeader
            label="Apps"
            action={
              <button
                onClick={openAddLaunch}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent-clay)]/10 text-[var(--accent-clay)] hover:bg-[var(--accent-clay)]/20 transition-colors font-medium"
              >
                + Add Item
              </button>
            }
          />
          {launchItems.length === 0 ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-6">
              <p className="text-sm text-[var(--text-muted)] text-center py-8">No apps configured.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {launchItems.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      item.type === 'command' ? 'bg-green-500/10 text-green-500' : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {item.type === 'command' ? '>_' : 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate font-mono">
                        {item.type === 'command' ? item.command : item.path}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleLaunchItem(item)} className="text-xs px-2.5 py-1 rounded-lg bg-[var(--accent-clay)]/10 text-[var(--accent-clay)] hover:bg-[var(--accent-clay)]/20 transition-colors font-medium" title={`Launch ${item.name}`}>Run</button>
                      <button onClick={() => toggleKillOnStop(item.id)} title={item.killOnStop ? 'Will kill on stop' : 'Will not kill on stop'} className={`text-xs px-2 py-0.5 rounded-full transition-colors ${item.killOnStop ? 'bg-red-500/10 text-red-400' : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'}`}>{item.killOnStop ? 'Kill' : 'No-kill'}</button>
                      {idx > 0 && <button onClick={() => handleMoveUp(idx)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg></button>}
                      {idx < launchItems.length - 1 && <button onClick={() => handleMoveDown(idx)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>}
                      <button onClick={() => openEditLaunch(item.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => handleRemoveLaunch(item.id)} className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
        </div>

        <div>
          <SectionHeader label="Timer" />

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex gap-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg p-0.5">
                {['pomodoro', 'countdown', 'countup'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setTimerMode(mode); setTimerState('idle'); setShowSettings(false); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      timerMode === mode
                        ? 'bg-[var(--accent-clay)]/10 text-[var(--accent-clay)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showSettings
                    ? 'bg-[var(--accent-clay)]/10 text-[var(--accent-clay)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50'
                }`}
                title="Timer settings"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="text-center">
              {phaseLabel && (
                <p className="text-xs font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                  {phaseLabel}
                  {timerMode === 'pomodoro' && pomodoroPhase === 'focus' && (
                    <span className="ml-2 text-[var(--accent-clay)]">
                      C{pomodoroCycle + 1} #{pomodoroSessionCount + 1}
                    </span>
                  )}
                </p>
              )}
              {timerMode === 'countup' && checkpointsEnabled && checkpointCount > 0 && (
                <p className="text-xs text-[var(--text-muted)] mb-1">
                  Checkpoint #{checkpointCount}
                </p>
              )}
              <div className="text-5xl font-mono font-bold text-[var(--text-primary)] tabular-nums mb-4">
                {String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
              </div>
              <div className="flex items-center justify-center gap-2">
                {timerState === 'idle' && (
                  <button onClick={handleStart} className="px-5 py-2 rounded-lg bg-[var(--accent-clay)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                    Start
                  </button>
                )}
                {timerState === 'running' && (
                  <button onClick={handlePause} className="px-5 py-2 rounded-lg bg-yellow-500/20 text-yellow-500 text-sm font-medium hover:bg-yellow-500/30 transition-colors">
                    Pause
                  </button>
                )}
                {timerState === 'paused' && (
                  <>
                    <button onClick={handleResume} className="px-5 py-2 rounded-lg bg-[var(--accent-clay)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                      Resume
                    </button>
                    <button onClick={handleStop} className="px-5 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors">
                      Stop
                    </button>
                  </>
                )}
                {(timerState === 'running' || timerState === 'finished') && (
                  <button onClick={handleStop} className="px-5 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors">
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>

          {showSettings && (
            <SettingsModal
              timerMode={timerMode}
              timerConfig={timerConfig}
              updateTimerConfig={updateTimerConfig}
              customDuration={customDuration}
              setCustomDuration={setCustomDuration}
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-6 mb-6">
        <SectionHeader label="Totals" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatDuration(totals.totalSeconds)}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">All Time</p>
          </div>
          {Object.entries(totals.bySource).map(([source, secs]) => (
            <div key={source} className="text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatDuration(secs)}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">{source}</p>
            </div>
          ))}
        </div>
      </div>

      <SectionHeader label="Session Log" />
      {log.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-muted)]">No sessions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedLog).map(([date, entries]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-2 sticky top-0 bg-[var(--bg-secondary)] py-1">{date}</p>
              <div className="space-y-1">
                  {entries.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-[var(--border-subtle)]/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          entry.endTime ? 'bg-[var(--accent-clay)]' : 'bg-yellow-500'
                        }`} />
                        <span className="text-sm text-[var(--text-primary)]">{entry.itemName}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${
                          entry.source === 'launch' ? 'bg-indigo-500/10 text-indigo-400'
                          : entry.source === 'pomodoro' ? 'bg-green-500/10 text-green-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {entry.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)] tabular-nums">
                          {entry.duration ? formatDuration(entry.duration) : 'in progress'}
                        </span>
                        <button
                          onClick={() => handleRemoveLogEntry(date, entry.itemId)}
                          className="text-[var(--text-muted)] hover:text-red-400 p-1 rounded-md transition-colors"
                          title="Remove entry"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showLaunchModal && (
          <LaunchItemModal
            item={editingLaunchId ? launchItems.find((it) => String(it.id) === String(editingLaunchId)) : null}
            defaultWorkingDir={project.workingDir}
            onSave={handleSaveLaunch}
            onClose={closeLaunchModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

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
      if (result) { setPath(result); if (!name) setName(result.split(/[\\/]/).pop().replace(/\.[^.]+$/, '')); }
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files[0];
      if (file) { setPath(file.name); if (!name) setName(file.name.replace(/\.[^.]+$/, '')); }
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
      if (file) setWorkingDir(file.path || file.webkitRelativePath.split('/')[0] || '.');
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
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{isEdit ? 'Edit Item' : 'Add Launch Item'}</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors" aria-label="Close">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="flex mx-6 mt-4 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-0.5">
          {['app', 'command'].map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-colors ${mode === m ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>{m === 'app' ? 'App / File' : 'Command'}</button>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {mode === 'app' ? (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Path</label>
                <div className="flex gap-2">
                  <input type="text" value={path} onChange={(e) => setPath(e.target.value)} placeholder="Path to executable or file..." className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-clay)] transition-colors" />
                  <button type="button" onClick={handlePickFile} className="px-3 py-2 rounded-lg bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors">Browse</button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Command</label>
                  <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npm start, code ., etc." className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-clay)] transition-colors font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Working Directory</label>
                  <div className="flex gap-2">
                    <input type="text" value={workingDir} onChange={(e) => setWorkingDir(e.target.value)} placeholder="." className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-clay)] transition-colors font-mono" />
                    <button type="button" onClick={handlePickFolder} className="px-3 py-2 rounded-lg bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors">Browse</button>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={wait} onChange={(e) => setWait(e.target.checked)} className="w-4 h-4 rounded border-[var(--border-subtle)]" />
                  <span className="text-xs text-[var(--text-muted)]">Wait for command to finish before launching next</span>
                </label>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Auto-filled from selection" className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-clay)] transition-colors" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={killOnStop} onChange={(e) => setKillOnStop(e.target.checked)} className="w-4 h-4 rounded border-[var(--border-subtle)]" />
              <span className="text-xs text-[var(--text-muted)]">Kill process when stop is pressed</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 p-6 pt-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors">Cancel</button>
            <button type="submit" disabled={!isValid} className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-clay)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">{isEdit ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

LaunchItemModal.propTypes = {
  item: PropTypes.object,
  defaultWorkingDir: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

ActivityTab.propTypes = {
  project: PropTypes.object.isRequired,
  onUpdateProject: PropTypes.func.isRequired,
  onNotify: PropTypes.func,
};
