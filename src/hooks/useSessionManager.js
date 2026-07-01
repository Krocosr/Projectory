'use client';
import { useCallback } from 'react';
import useProjectStore from '@/store/useProjectStore';
import { stopItem as desktopStopItem } from '@/lib/desktop';

export function useSessionManager() {
  const runningSessions = useProjectStore((s) => s.runningSessions);
  const removeRunningSession = useProjectStore((s) => s.removeRunningSession);

  const stopSession = useCallback((project, onUpdateProject, addToast) => {
    const session = runningSessions[project.id];
    if (!session) return 0;

    const now = new Date().toISOString();
    const duration = session?.startedAt
      ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
      : 0;

    if (duration > 0) {
      const updatedLog = (project.activityLog || []).map((entry) =>
        !entry.endTime && entry.source === 'launch'
          ? { ...entry, endTime: now, duration }
          : entry
      );
      const newTimeline = [...(project.timeline || []), {
        date: now,
        action: `Stopped session (${Math.round(duration / 60)}m)`,
      }];
      onUpdateProject({ ...project, activityLog: updatedLog, timeline: newTimeline });
    }

    (session?.launchItemIds || []).forEach((id) => {
      const item = project.launchItems?.find(it => it.id === id);
      if (item && item.killOnStop) desktopStopItem(item.name);
    });

    removeRunningSession(project.id);
    addToast?.('Session stopped');

    return duration;
  }, [runningSessions, removeRunningSession]);

  return { stopSession };
}
