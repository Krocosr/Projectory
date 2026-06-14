import { Button } from '@/components/ui';

/**
 * EmptyPortfolio - Empty state when no projects exist.
 * Extracted from page.js.
 */
export function EmptyPortfolio({ onNewProject }) {
  return (
    <div className="text-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-[var(--border-subtle)] flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-2">
        No projects yet
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
        Create your first project to start tracking your work.
      </p>
      <Button onClick={onNewProject} variant="gradient" className="px-5 py-2.5 rounded-xl text-sm">
        Create your first project
      </Button>
    </div>
  );
}
