'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { defaultForm } from '@/app/data';
import { STATUSES } from '@/lib/constants';
import { Input, Textarea, Select, Button } from '@/components/ui';

function FormField({ label, children, required }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        {label}
        {required && <span className="text-[var(--accent-clay)] ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function NewProjectModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState(defaultForm);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab') {
      // Focus trap logic
      const focusableElements = document.querySelectorAll(
        'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (!isOpen) setForm(defaultForm);
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (form.title.trim().length > 100) {
      alert('Project title must be 100 characters or fewer');
      return;
    }
    onSave({
      title: form.title,
      description: form.description,
      status: form.status,
      goal: form.goal,
      deadline: form.deadline,
    });
    onClose();
  };

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
            className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-modal)] p-8 overflow-hidden"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
                New Project
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField label="Project Title" required>
                <Input
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. AI Story App"
                  className="px-3.5 py-2.5 rounded-xl"
                  autoFocus
                  required
                  aria-required="true"
                  aria-label="Project Title"
                />
              </FormField>

              <FormField label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                  className="px-3.5 py-2.5 rounded-xl"
                  aria-label="Project Description"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Status">
                  <Select
                    value={form.status}
                    onChange={(e) => update('status', e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl w-full"
                    aria-label="Project Status"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Deadline">
                  <Input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => update('deadline', e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl"
                    aria-label="Project Deadline"
                  />
                </FormField>
              </div>

              <FormField label="Goal">
                <Input
                  type="text"
                  value={form.goal}
                  onChange={(e) => update('goal', e.target.value)}
                  placeholder="What's the north star?"
                  className="px-3.5 py-2.5 rounded-xl"
                  aria-label="Project Goal"
                />
              </FormField>

              <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm">
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" className="flex-1 px-4 py-2.5 rounded-xl text-sm">
                  Create Project
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

NewProjectModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};