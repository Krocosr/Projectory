'use client';
import { useState } from 'react';
import { EMPTY_ERROR_TIMEOUT_MS } from '@/lib/constants';
import { Input, Textarea, Select, Button } from '@/components/ui';

export default function AddTodoBar({ onAdd, onNotify }) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [details, setDetails] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [emptyError, setEmptyError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setEmptyError(true);
      setTimeout(() => setEmptyError(false), EMPTY_ERROR_TIMEOUT_MS);
      return;
    }
    if (text.trim().length > 200) {
      if (onNotify) onNotify('Todo text must be 200 characters or fewer');
      return;
    }
    onAdd(text.trim(), priority, details.trim(), deadline);
    setText('');
    setDetails('');
    setDeadline('');
    setShowDetails(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-2 py-2 text-xs font-medium text-[var(--text-secondary)] shrink-0 w-auto"
        >
          <option value="High">High</option>
          <option value="Medium">Med</option>
          <option value="Low">Low</option>
        </Select>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a todo..."
          className={`flex-1 px-3 py-2 rounded-lg border bg-[var(--bg-card)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all ${emptyError ? 'border-red-400 animate-shake' : 'border-[var(--border-subtle)]'}`}
        />
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className={`px-2 py-2 rounded-lg border transition-all shrink-0 ${showDetails ? 'border-[var(--accent-clay)] text-[var(--accent-clay)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          aria-label="Toggle details"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Button type="submit" variant="gradient" className="px-3 shrink-0">
          Add
        </Button>
      </div>
      {showDetails && (
        <div className="space-y-2">
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add optional details..."
            rows={2}
          />
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="text-xs text-[var(--text-secondary)]"
            aria-label="Todo deadline"
          />
        </div>
      )}
    </form>
  );
}
