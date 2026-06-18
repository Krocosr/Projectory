/**
 * ProjectFAB - Dynamic floating action button.
 * Dashboard: + to create project
 * Detail with apps: ▶ Launch
 * Session running: ⏹ Stop
 */
export function NewProjectButton({ onClick, mode, onLaunch, onStop }) {
  if (mode === 'launch') {
    return (
      <button
        onClick={onLaunch}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg z-40 flex items-center justify-center text-white"
        style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
        aria-label="Launch apps"
        title="Launch all apps"
      >
        <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    );
  }

  if (mode === 'stop') {
    return (
      <button
        onClick={onStop}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg z-40 flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-colors"
        aria-label="Stop session"
        title="Stop tracking"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg z-40 flex items-center justify-center text-white"
      style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
      aria-label="New Project"
      title="New project"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  );
}
