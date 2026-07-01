'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input, Textarea, Select, Button } from '@/components/ui';

export default function EditTodoModal({ todo, isOpen, onClose, onSave, onNotify }) {
  const [text, setText] = useState(todo?.text || '');
  const [priority, setPriority] = useState(todo?.priority || 'Medium');
  const [details, setDetails] = useState(todo?.details || '');
  const [deadline, setDeadline] = useState(todo?.deadline || '');
  const modalRef = useRef(null);

  useEffect(() => {
    if (todo) {
      setText(todo.text || '');
      setPriority(todo.priority || 'Medium');
      setDetails(todo.details || '');
      setDeadline(todo.deadline || '');
    }
  }, [todo]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = modalRef.current?.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (text.trim().length > 200) {
      if (onNotify) onNotify('Todo text must be 200 characters or fewer');
      return;
    }
    onSave({ ...todo, text: text.trim(), priority, details: details.trim(), deadline });
    onClose();
  };

  if (!isOpen || !todo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose} onKeyDown={handleKeyDown}>
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-md w-full p-6"
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Todo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Todo</label>
            <Input type="text" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Priority</label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Details (optional)</label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Deadline (optional)</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="gradient" className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
