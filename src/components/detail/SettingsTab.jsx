'use client';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useConfirm } from '@/components/ConfirmModal';
import { DetailRow } from './shared';
import { STATUSES, STATUS_COLORS, STATUS_BG } from '@/lib/constants';
import { formatDeadlineForDisplay, toDateInputValue } from '@/lib/dateUtils';
import { Input, Textarea, Select, Button } from '@/components/ui';
import { pickFolder as desktopPickFolder, isDesktop } from '@/lib/desktop';

export default function SettingsTab({ project, onUpdateProject, onNotify, onUnsavedChanges }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...project });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setForm({ ...project });
    setHasUnsavedChanges(false);
  }, [project]);

  useEffect(() => {
    if (editing) {
      const changed = (
        form.title !== project.title ||
        form.status !== project.status ||
        form.deadline !== project.deadline ||
        form.goal !== project.goal ||
        form.description !== project.description ||
        form.workingDir !== (project.workingDir || '')
      );
      setHasUnsavedChanges(changed);
      onUnsavedChanges?.(changed);
    } else {
      onUnsavedChanges?.(false);
    }
  }, [form, project, editing, onUnsavedChanges]);

  useEffect(() => {
    if (hasUnsavedChanges && editing) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges, editing]);

  const handlePickFolder = async () => {
    if (isDesktop()) {
      const result = await desktopPickFolder();
      if (result) setForm({ ...form, workingDir: result });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.onchange = () => {
      const file = input.files[0];
      if (file) {
        setForm({ ...form, workingDir: file.path || file.webkitRelativePath.split('/')[0] || '.' });
      }
    };
    input.click();
  };

  const handleSave = () => {
    onUpdateProject({
      ...project,
      title: form.title,
      status: form.status,
      deadline: form.deadline,
      goal: form.goal,
      description: form.description,
      workingDir: form.workingDir || '',
    });
    setEditing(false);
    setHasUnsavedChanges(false);
    onNotify('Project saved');
  };

  const handleCancel = async () => {
    if (hasUnsavedChanges) {
      const ok = await confirm('You have unsaved changes. Discard them?');
      if (!ok) return;
      setForm({ ...project });
      setEditing(false);
      setHasUnsavedChanges(false);
    } else {
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        {[
          { label: 'Project Name', value: project.title },
          { label: 'Status', value: project.status, isStatus: true },
          { label: 'Goal', value: project.goal },
          { label: 'Deadline', value: formatDeadlineForDisplay(project.deadline) },
          { label: 'Description', value: project.description },
          { label: 'Working Dir', value: project.workingDir },
        ].map((field) => (
          <div key={field.label} className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
            <span className="text-sm text-[var(--text-muted)]">{field.label}</span>
            {field.isStatus ? (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_BG[field.value] || STATUS_BG.Finished}`}>
                {field.value || '\u2014'}
              </span>
            ) : (
              <span className="text-sm font-medium text-[var(--text-primary)] text-right max-w-[60%] truncate" data-streamer>{field.value || '\u2014'}</span>
            )}
          </div>
        ))}
        <Button onClick={() => setEditing(true)} variant="gradient">
          Edit Project
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Project Name</label>
        <Input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>

      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Status</label>
        <Select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full"
          style={{ color: STATUS_COLORS[form.status] || 'inherit' }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} style={{ color: STATUS_COLORS[s] }}>{s}</option>
          ))}
        </Select>
      </div>

      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Goal</label>
        <Input type="text" value={form.goal || ''} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
      </div>

      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Deadline</label>
        <Input
          type="date"
          value={toDateInputValue(form.deadline) || ''}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        />
      </div>

      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Description</label>
        <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
      </div>

      <div className="py-2">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Working Directory</label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={form.workingDir || ''}
            onChange={(e) => setForm({ ...form, workingDir: e.target.value })}
            placeholder="Optional working directory path"
            className="flex-1"
          />
          <button type="button" onClick={handlePickFolder} className="px-3 py-2 rounded-lg bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors shrink-0">
            Browse
          </button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          You have unsaved changes
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={handleCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="gradient" className="flex-1">
          Save Changes
        </Button>
      </div>
    </div>
  );
}

SettingsTab.propTypes = {
  project: PropTypes.object.isRequired,
  onUpdateProject: PropTypes.func.isRequired,
  onNotify: PropTypes.func.isRequired,
  onUnsavedChanges: PropTypes.func,
};
