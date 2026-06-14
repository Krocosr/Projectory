/**
 * NewProjectCard - Dashed card placeholder for creating new projects.
 * Extracted from page.js.
 */
export function NewProjectCard({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-clay)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] rounded-2xl h-full"
    >
      <div className="relative h-full bg-[var(--bg-card)] rounded-2xl border-2 border-dashed border-[var(--border-subtle)] p-6 flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 hover:border-[var(--accent-clay)]/40 hover:bg-[var(--accent-clay)]/[0.02]">
        <div className="w-12 h-12 rounded-xl border-2 border-dashed border-[var(--border-subtle)] flex items-center justify-center mb-3 transition-colors duration-300 group-hover:border-[var(--accent-clay)]/40">
          <svg className="w-5 h-5 text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <span className="text-sm font-medium text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[var(--accent-clay)]">
          New Project
        </span>
      </div>
    </button>
  );
}
