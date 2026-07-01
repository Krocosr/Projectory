import { useCallback, useRef, useState } from 'react';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Custom hook for project drag-and-drop reordering.
 * Extracted from page.js to reduce complexity.
 * 
 * Handles drag-and-drop reordering of project cards with support for:
 * - Sorted views (switches to unsorted when dragging)
 * - Unsorted views (reorders in place)
 * - Visual feedback during drag
 * 
 * @param {Array} filteredProjects - Currently displayed projects
 * @param {string} projectSortBy - Current sort mode
 * @param {Function} onReorder - Callback to update projects order
 * @param {Function} onSortChange - Callback to update sort mode
 * @returns {Object} - Drag-and-drop handlers and state
 */
export function useProjectDragDrop(filteredProjects, projectSortBy, onReorder, onSortChange) {
  const [isProjectDragging, setIsProjectDragging] = useState(false);
  const filteredProjectsRef = useRef(filteredProjects);
  const sortByRef = useRef(projectSortBy);

  // Update refs on every render to avoid stale closures
  filteredProjectsRef.current = filteredProjects;
  sortByRef.current = projectSortBy;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Prevents accidental drags
    })
  );

  const handleProjectDragStart = useCallback(() => {
    setIsProjectDragging(true);
  }, []);

  const handleProjectDragEnd = useCallback((event) => {
    setIsProjectDragging(false);
    const { active, over } = event;

    // No drop target or same position
    if (!over || active.id === over.id) return;

    const currentSortBy = sortByRef.current;
    const displayed = filteredProjectsRef.current;

    const oldIndex = displayed.findIndex((p) => String(p.id) === active.id);
    const newIndex = displayed.findIndex((p) => String(p.id) === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the displayed projects
    const reordered = arrayMove(displayed, oldIndex, newIndex);

    if (currentSortBy !== 'unsorted') {
      // Coming from a sorted view - save as new unsorted baseline
      onSortChange('unsorted');
      onReorder(reordered, true); // true = merge with hidden projects
    } else {
      // Already unsorted - just reorder
      onReorder(reordered, false);
    }
  }, [onReorder, onSortChange]);

  return {
    sensors,
    isProjectDragging,
    handleProjectDragStart,
    handleProjectDragEnd,
  };
}
