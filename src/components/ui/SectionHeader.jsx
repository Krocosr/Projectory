'use client';

export function SectionHeader({ icon, label, color = 'var(--accent-clay)', count, children, className = '' }) {
  return (
    <div className={`flex items-center gap-2 mb-3 ${className}`}>
      {icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}10` }}>
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{label}</h3>
      {count !== undefined && (
        <span className="text-xs text-[var(--text-muted)] tabular-nums">{count}</span>
      )}
      {children}
    </div>
  );
}
