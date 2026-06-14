import { useEffect, useRef } from 'react';
import { recalculateProject } from '@/lib/storage';
import { POLL_INTERVAL_MS } from '@/lib/constants';

/**
 * Custom hook for polling the API for external project changes.
 * Extracted from page.js to reduce complexity.
 * 
 * Polls /api/projects/poll every 3 seconds (when tab is visible) and
 * automatically updates projects when external changes are detected.
 * 
 * @param {boolean} ready - Whether the app is ready to start polling
 * @param {Function} onProjectsUpdate - Callback to update projects state
 * @param {Object|null} selectedProject - Currently selected project (to sync after update)
 * @param {Function} onSelectedProjectUpdate - Callback to update selected project
 */
export function useProjectPolling(ready, onProjectsUpdate, selectedProject, onSelectedProjectUpdate) {
  const lastPollMtimeRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const selectedProjectRef = useRef(selectedProject);
  selectedProjectRef.current = selectedProject;

  useEffect(() => {
    if (!ready) return;

    const poll = async () => {
      // Don't poll when tab is hidden (saves resources)
      if (document.hidden) return;

      try {
        // Check if file has been modified
        const res = await fetch('/api/projects/poll');
        if (!res.ok) return;
        
        const { modified } = await res.json();
        if (modified === null) return;

        // If mtime changed, fetch fresh data
        if (lastPollMtimeRef.current !== null && modified !== lastPollMtimeRef.current) {
          const dataRes = await fetch('/api/projects');
          if (!dataRes.ok) return;
          
          const { projects: serverProjects } = await dataRes.json();
          if (serverProjects && serverProjects.length > 0) {
            const enriched = serverProjects.map(recalculateProject);
            
            // Update projects in store
            onProjectsUpdate(enriched);

            // Sync selected project if it still exists
            const currentSelected = selectedProjectRef.current;
            if (currentSelected) {
              const updated = enriched.find(p => p.id === currentSelected.id);
              if (updated) {
                onSelectedProjectUpdate(updated);
              }
            }
          }
        }

        lastPollMtimeRef.current = modified;
      } catch {
        // Server may not be running - silently ignore
      }
    };

    // Poll immediately on visibility change
    const handleVisibility = () => {
      if (!document.hidden) poll();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    
    // Initial poll
    poll();
    
    // Set up interval
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [ready, onProjectsUpdate, onSelectedProjectUpdate]);
}
