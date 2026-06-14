/**
 * CardSkeleton - Loading placeholder for project cards.
 * Extracted from page.js.
 */
export function CardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 min-h-[220px] animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-6 bg-[var(--border-subtle)] rounded w-2/3"></div>
        <div className="h-5 w-5 bg-[var(--border-subtle)] rounded"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-[var(--border-subtle)] rounded w-full"></div>
        <div className="h-4 bg-[var(--border-subtle)] rounded w-4/5"></div>
      </div>
      <div className="flex items-center justify-between mt-auto pt-4">
        <div className="h-4 bg-[var(--border-subtle)] rounded w-20"></div>
        <div className="h-4 bg-[var(--border-subtle)] rounded w-16"></div>
      </div>
    </div>
  );
}
