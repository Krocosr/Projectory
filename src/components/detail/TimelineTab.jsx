'use client';
import PropTypes from 'prop-types';
import { groupTimelineByDate } from './shared';
import { formatRelativeTime } from '@/lib/dateUtils';

export default function TimelineTab({ project }) {
  const sortedTimeline = [...(project.timeline || [])].sort((a, b) => b.date.localeCompare(a.date));
  const grouped = groupTimelineByDate(sortedTimeline);

  return (
    <div className="space-y-6">
      {Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([date, entries]) => (
        <div key={date}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            {date}
          </h3>
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <div key={`${entry.action}-${entry.date}-${idx}`} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-subtle)] shrink-0" />
                <span className="flex-1" data-streamer>{entry.action}</span>
                <span className="text-xs text-[var(--text-muted)]">{formatRelativeTime(entry.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )) : (
        <p className="text-xs text-[var(--text-muted)] text-center py-8">No activity yet</p>
      )}
    </div>
  );
}

TimelineTab.propTypes = {
  project: PropTypes.object.isRequired,
};
