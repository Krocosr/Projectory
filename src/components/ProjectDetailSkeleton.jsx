/**
 * ProjectDetailSkeleton - Loading placeholder for project detail view.
 * Extracted from page.js.
 */
export function ProjectDetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-[var(--border-subtle)] rounded-xl"></div>
        <div className="flex-1">
          <div className="h-8 bg-[var(--border-subtle)] rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-[var(--border-subtle)] rounded w-1/4"></div>
        </div>
      </div>

      {/* Resume card */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 mb-6">
        <div className="space-y-3">
          <div className="h-5 bg-[var(--border-subtle)] rounded w-3/4"></div>
          <div className="h-4 bg-[var(--border-subtle)] rounded w-full"></div>
          <div className="h-4 bg-[var(--border-subtle)] rounded w-5/6"></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border-subtle)] pb-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-[var(--border-subtle)] rounded w-24"></div>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 min-h-[400px]">
        <div className="space-y-4">
          <div className="h-4 bg-[var(--border-subtle)] rounded w-full"></div>
          <div className="h-4 bg-[var(--border-subtle)] rounded w-5/6"></div>
          <div className="h-4 bg-[var(--border-subtle)] rounded w-4/5"></div>
        </div>
      </div>
    </div>
  );
}
