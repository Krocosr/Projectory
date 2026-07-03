const ENABLED = typeof window !== 'undefined' &&
  (process.env.NODE_ENV === 'development' || localStorage.getItem('perf_debug') === 'true');

const marks = new Map();

export const perf = {
  mark(name) {
    if (!ENABLED) return;
    performance.mark(name);
    marks.set(name, performance.now());
  },

  measure(name, startMark, endMark) {
    if (!ENABLED) return;
    try {
      performance.measure(name, startMark, endMark);
    } catch {}
  },

  time(name) {
    if (!ENABLED) return () => {};
    const start = performance.now();
    return () => {
      const elapsed = performance.now() - start;
      if (elapsed > 1) {
        console.log(`[perf] ${name}: ${elapsed.toFixed(1)}ms`);
      }
    };
  },

  log() {
    if (!ENABLED) return;
    const entries = performance.getEntriesByType('measure');
    if (entries.length === 0) { console.log('[perf] No measurements recorded'); return; }
    const table = entries
      .filter(e => e.duration > 0.5)
      .sort((a, b) => b.duration - a.duration)
      .map(e => ({ name: e.name, duration: `${e.duration.toFixed(1)}ms`, start: e.startTime.toFixed(0) }));
    console.table(table);
  },

  clear() {
    if (!ENABLED) return;
    performance.clearMarks();
    performance.clearMeasures();
    marks.clear();
  },

  traceRender(name) {
    if (!ENABLED) return () => {};
    const markName = `render-${name}-${Date.now()}`;
    performance.mark(markName);
    return () => {
      performance.measure(`render ${name}`, markName);
    };
  },
};
