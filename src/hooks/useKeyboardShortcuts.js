import { useEffect } from 'react';

/**
 * Custom hook for global keyboard shortcuts.
 * Extracted from page.js to reduce complexity.
 * 
 * Handles:
 * - 'n' key to open new project modal
 * - '/' key to focus search input (only on dashboard)
 * 
 * Shortcuts are disabled when user is typing in input/textarea/select.
 * 
 * @param {boolean} isDetailView - Whether currently viewing a project detail
 * @param {Function} onNewProject - Callback to open new project modal
 */
export function useKeyboardShortcuts(isDetailView, onNewProject) {
  useEffect(() => {
    const handleKey = (e) => {
      const tag = e.target.tagName;
      
      // Don't intercept when user is typing
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // 'n' - New project (works everywhere)
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onNewProject();
      }

      // '/' - Focus search (only on dashboard)
      if (e.key === '/' && !isDetailView) {
        e.preventDefault();
        const searchInput = document.querySelector('input[aria-label="Search projects"]');
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDetailView, onNewProject]);
}
