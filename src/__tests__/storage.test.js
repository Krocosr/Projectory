import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  recalculateProject, 
  createTodo, 
  createTimelineEntry 
} from '@/lib/storage';

describe('storage.js - Project Calculations', () => {
  describe('recalculateProject', () => {
    it('should calculate progress correctly with no todos', () => {
      const project = {
        id: 1,
        title: 'Test Project',
        todos: [],
      };

      const result = recalculateProject(project);
      expect(result.progress).toBe(0);
      expect(result.todoCount).toBe(0);
    });

    it('should calculate progress correctly with mixed todos', () => {
      const project = {
        id: 1,
        title: 'Test Project',
        todos: [
          { id: 1, text: 'Task 1', done: true },
          { id: 2, text: 'Task 2', done: true },
          { id: 3, text: 'Task 3', done: false },
          { id: 4, text: 'Task 4', done: false },
        ],
      };

      const result = recalculateProject(project);
      expect(result.progress).toBe(50);
      expect(result.todoCount).toBe(2); // Only active (not done) todos
    });

    it('should calculate 100% progress when all todos done', () => {
      const project = {
        id: 1,
        title: 'Test Project',
        todos: [
          { id: 1, text: 'Task 1', done: true },
          { id: 2, text: 'Task 2', done: true },
        ],
      };

      const result = recalculateProject(project);
      expect(result.progress).toBe(100);
    });

    it('should set currentFocus to first pending todo', () => {
      const project = {
        id: 1,
        title: 'Test Project',
        todos: [
          { id: 1, text: 'Done task', done: true },
          { id: 2, text: 'Next task', done: false },
          { id: 3, text: 'Later task', done: false },
        ],
      };

      const result = recalculateProject(project);
      expect(result.currentFocus).toBe('Next task');
    });

    it('should set currentFocus to "All done!" when all done', () => {
      const project = {
        id: 1,
        title: 'Test Project',
        todos: [
          { id: 1, text: 'Task 1', done: true },
        ],
      };

      const result = recalculateProject(project);
      expect(result.currentFocus).toBe('All done!');
    });

    it('should set nextStep based on priority', () => {
      const project = {
        id: 1,
        title: 'Test Project',
        todos: [
          { id: 1, text: 'Low priority', done: false, priority: 'Low' },
          { id: 2, text: 'High priority', done: false, priority: 'High' },
          { id: 3, text: 'Medium priority', done: false, priority: 'Medium' },
        ],
      };

      const result = recalculateProject(project);
      expect(result.nextStep).toBe('High priority');
    });

    it('should not modify lastWorked field', () => {
      const project = {
        id: 1,
        title: 'Test Project',
        todos: [],
        lastWorked: '2h ago',
      };

      const result = recalculateProject(project);
      expect(result.lastWorked).toBe('2h ago');
    });
  });

  describe('createTodo', () => {
    it('should create todo with required fields', () => {
      const todo = createTodo('Test todo', 'Medium');
      
      expect(todo).toHaveProperty('id');
      expect(todo.text).toBe('Test todo');
      expect(todo.priority).toBe('Medium');
      expect(todo.done).toBe(false);
      expect(todo.details).toBe('');
      expect(todo).toHaveProperty('createdAt');
    });

    it('should create todo with default priority', () => {
      const todo = createTodo('Test todo');
      expect(todo.priority).toBe('Medium');
    });

    it('should generate unique IDs', () => {
      const todo1 = createTodo('Todo 1');
      const todo2 = createTodo('Todo 2');
      
      expect(todo1.id).not.toBe(todo2.id);
    });

    it('should create valid ISO timestamp', () => {
      const todo = createTodo('Test');
      const date = new Date(todo.createdAt);
      
      expect(date.toString()).not.toBe('Invalid Date');
      expect(todo.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('createTimelineEntry', () => {
    it('should create timeline entry with action', () => {
      const entry = createTimelineEntry('Project created');
      
      expect(entry).toHaveProperty('date');
      expect(entry.action).toBe('Project created');
    });

    it('should create valid ISO date', () => {
      const entry = createTimelineEntry('Test action');
      const date = new Date(entry.date);
      
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });
});
