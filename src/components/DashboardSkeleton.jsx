export function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <header className="shrink-0 px-6 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-[var(--border-subtle)] rounded w-28"></div>
          <div className="flex items-center justify-end gap-2">
            <div className="h-8 bg-[var(--border-subtle)] rounded w-8"></div>
            <div className="h-8 bg-[var(--border-subtle)] rounded w-8"></div>
            <div className="h-8 bg-[var(--border-subtle)] rounded w-8"></div>
            <div className="h-8 bg-[var(--border-subtle)] rounded w-8"></div>
            <div className="h-8 bg-[var(--border-subtle)] rounded w-36"></div>
          </div>
        </div>
      </header>
      <div className="flex-1 flex flex-col px-6 py-4">
        <div className="grid gap-6 flex-1 min-h-0 lg:grid-cols-[1fr_1.5fr_1fr]">
          <div className="flex flex-col h-full min-h-0">
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div className="h-4 bg-[var(--border-subtle)] rounded w-24 shrink-0"></div>
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border-2 border-[var(--border-subtle)] shrink-0"></div>
                  <div className="flex-1 h-3 bg-[var(--border-subtle)] rounded"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col h-full min-h-0">
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="h-6 bg-[var(--border-subtle)] rounded w-3/4"></div>
              <div className="h-4 bg-[var(--border-subtle)] rounded w-1/2"></div>
              <div className="h-2 bg-[var(--border-subtle)] rounded-full w-full"></div>
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border-2 border-[var(--border-subtle)] shrink-0"></div>
                  <div className="flex-1 h-3 bg-[var(--border-subtle)] rounded"></div>
                </div>
              ))}
            </div>
          </div>
           <div className="grid gap-6 h-full min-h-0 lg:grid-rows-[4fr_6fr]">
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3 overflow-hidden flex flex-col min-h-0">
              <div className="h-4 bg-[var(--border-subtle)] rounded w-16 shrink-0"></div>
              <div className="flex-1 h-20 bg-[var(--border-subtle)] rounded"></div>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-hidden min-h-0">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 space-y-1 flex flex-col items-center justify-center text-center">
                  <div className="h-6 bg-[var(--border-subtle)] rounded w-12"></div>
                  <div className="h-3 bg-[var(--border-subtle)] rounded w-8"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-4 bg-[var(--border-subtle)] rounded w-24 mb-3"></div>
          <div className="space-y-1.5">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg">
                <div className="flex-1 h-3 bg-[var(--border-subtle)] rounded"></div>
                <div className="h-3 bg-[var(--border-subtle)] rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
