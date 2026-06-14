import { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProjectCard from '@/components/ProjectCard';

/**
 * SortableProjectCard - Wrapper for ProjectCard with drag-and-drop support.
 * Extracted from page.js.
 */
export function SortableProjectCard({ 
  project, 
  onClick, 
  onUpdateProject, 
  onDeleteProject, 
  onDeletePermanent, 
  onNotify 
}) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id: String(project.id) });
  
  const nodeRef = useRef(null);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition,
    zIndex: isDragging ? 999 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      <ErrorBoundary
        context={`ProjectCard-${project.id}`}
        errorMessage="Failed to render this project card."
      >
        <ProjectCard
          ref={nodeRef}
          project={project}
          onClick={onClick}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
          onDeletePermanent={onDeletePermanent}
          onNotify={onNotify}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </ErrorBoundary>
    </div>
  );
}
