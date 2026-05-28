const SCRATCHPAD_KEY = 'projectory_scratchpad';

export function loadScratchpad() {
  if (typeof window === 'undefined') return { content: '', pinned: false };
  try {
    const raw = localStorage.getItem(SCRATCHPAD_KEY);
    if (!raw) return { content: '', pinned: false };
    return JSON.parse(raw);
  } catch {
    return { content: '', pinned: false };
  }
}

export function saveScratchpad(content, pinned) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCRATCHPAD_KEY, JSON.stringify({
      content,
      pinned,
      updatedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.error('Failed to save scratchpad:', e);
  }
}
