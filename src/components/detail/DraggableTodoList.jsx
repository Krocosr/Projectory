'use client';
import { useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TodoItem } from './TodoItem';

export default function DraggableTodoList({ todos, onToggle, onRemove, onEdit, onReorder, maxHeight, timeline }) {
  const parentRef = useRef(null);

  const handleItemSizeChange = useCallback(() => {
    if (parentRef.current) {
      parentRef.current.style.overflowY = 'hidden';
      requestAnimationFrame(() => {
        if (parentRef.current) parentRef.current.style.overflowY = 'auto';
      });
    }
  }, []);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = Array.from(todos);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onReorder(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="todos">
        {(provided, snapshot) => (
          <div
            ref={(node) => {
              provided.innerRef(node);
              parentRef.current = node;
            }}
            {...provided.droppableProps}
            className={`transition-colors ${snapshot.isDraggingOver ? 'bg-[var(--accent-clay)]/5 rounded-lg' : ''}`}
            style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: maxHeight || 'none' }}
          >
            <div className="space-y-0.5">
              {todos.map((todo, index) => (
                <Draggable key={String(todo.id)} draggableId={String(todo.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-[var(--accent-clay)]/30 bg-[var(--bg-card)] rounded-lg' : ''}`}
                      style={{ ...provided.draggableProps.style, willChange: 'transform' }}
                    >
                      <TodoItem
                        todo={todo}
                        onToggle={onToggle}
                        onRemove={onRemove}
                        onEdit={onEdit}
                        dragHandleProps={provided.dragHandleProps}
                        onExpandChange={handleItemSizeChange}
                        timeline={timeline}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
