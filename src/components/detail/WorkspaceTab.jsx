'use client';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Input, Textarea, Button, SectionHeader } from '@/components/ui';
import { AUTO_SAVE_DEBOUNCE_MS } from '@/lib/constants';

export default function WorkspaceTab({ project, onUpdateProject, onNotify }) {
  const [noteText, setNoteText] = useState(project.notes || '');
  const [saving, setSaving] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const projectRef = useRef(project);
  const onUpdateRef = useRef(onUpdateProject);
  const onNotifyRef = useRef(onNotify);
  const noteTextRef = useRef(noteText);
  projectRef.current = project;
  onUpdateRef.current = onUpdateProject;
  onNotifyRef.current = onNotify;
  noteTextRef.current = noteText;

  useEffect(() => {
    setNoteText(project.notes || '');
  }, [project.id]);

  useEffect(() => {
    if (noteText === (project.notes || '')) return;
    setSaving(true);
    const timer = setTimeout(() => {
      if (noteTextRef.current !== projectRef.current.notes) {
        onUpdateRef.current({ ...projectRef.current, notes: noteTextRef.current });
      }
      setSaving(false);
    }, AUTO_SAVE_DEBOUNCE_MS);
    return () => { clearTimeout(timer); setSaving(false); };
  }, [noteText, project.notes]);

  useEffect(() => {
    return () => {
      if (noteTextRef.current !== projectRef.current.notes) {
        onUpdateRef.current({ ...projectRef.current, notes: noteTextRef.current });
      }
    };
  }, []);

  const handleSaveNotes = () => {
    onUpdateProject({ ...project, notes: noteText });
    onNotify('Notes saved');
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!newLinkUrl.trim() || !newLinkTitle.trim()) return;
    try {
      new URL(newLinkUrl.trim());
    } catch {
      onNotify('Invalid URL');
      return;
    }
    const updated = {
      ...project,
      links: [...(project.links || []), { url: newLinkUrl.trim(), title: newLinkTitle.trim() }],
    };
    onUpdateProject(updated);
    onNotify('Link added');
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const handleRemoveLink = (index) => {
    const updated = {
      ...project,
      links: (project.links || []).filter((_, i) => i !== index),
    };
    onUpdateProject(updated);
    onNotify('Link removed');
  };

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!assetName.trim()) return;
    if (assetUrl.trim()) {
      try {
        new URL(assetUrl.trim());
      } catch {
        onNotify('Invalid asset URL');
        return;
      }
    }
    const newAsset = { name: assetName.trim(), url: assetUrl.trim(), addedAt: new Date().toISOString() };
    const updated = {
      ...project,
      assets: [...(project.assets || []), newAsset],
    };
    onUpdateProject(updated);
    onNotify('Asset added');
    setAssetName('');
    setAssetUrl('');
  };

  const handleRemoveAsset = (index) => {
    const updated = {
      ...project,
      assets: (project.assets || []).filter((_, i) => i !== index),
    };
    onUpdateProject(updated);
    onNotify('Asset removed');
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader
          icon={<svg className="w-4 h-4 text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          label="Notes"
        >
          {saving && (
            <span className="ml-auto text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </span>
          )}
        </SectionHeader>
        <div className="pl-10 space-y-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your notes here..."
            rows={6}
            className="w-full px-3.5 py-2.5 rounded-xl border border-transparent bg-transparent focus:border-[var(--accent-clay)] focus:bg-[var(--bg-card)] focus:ring-2 focus:ring-[var(--accent-clay)]/30 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all resize-none"
            aria-label="Project notes"
          />
          <Button onClick={handleSaveNotes} variant="gradient" className="px-4 py-1.5">
            Save Notes
          </Button>
        </div>
      </div>

      <div>
        <SectionHeader
          icon={<svg className="w-4 h-4 text-[var(--accent-slate)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
          label="Links"
          color="var(--accent-slate)"
        />
        <div className="pl-10 space-y-3">
          <form onSubmit={handleAddLink} className="flex gap-2">
            <Input
              type="text"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Title"
              className="flex-1"
              aria-label="Link title"
            />
            <Input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="URL"
              aria-label="Link URL"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="gradient"
              className="px-3"
              style={{ background: 'var(--accent-slate)' }}
            >
              Add
            </Button>
          </form>
          <div className="space-y-2">
            {(project.links || []).length > 0 ? project.links.map((link, i) => (
              <div key={link.url + link.title + i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--border-subtle)]/40 group">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent-slate)] hover:text-[var(--accent-slate-light)] transition-colors truncate"
                >
                  {link.title || link.url}
                </a>
                <button
                  onClick={() => handleRemoveLink(i)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-clay)] transition-all p-1"
                  aria-label="Remove link"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )) : (
              <p className="text-xs text-[var(--text-muted)]">No links saved</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <SectionHeader
          icon={<svg className="w-4 h-4" style={{ color: '#5A8F6C' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          label="Assets"
          color="#5A8F6C"
        />
        <div className="pl-10 space-y-3">
          <form onSubmit={handleAddAsset} className="flex gap-2">
            <Input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Asset name"
              className="flex-1"
              aria-label="Asset name"
            />
            <Input
              type="text"
              value={assetUrl}
              onChange={(e) => setAssetUrl(e.target.value)}
              placeholder="URL or path (optional)"
              aria-label="Asset URL"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="gradient"
              className="px-3"
              style={{ background: '#5A8F6C' }}
            >
              Add
            </Button>
          </form>
          <div className="space-y-2">
            {(project.assets || []).length > 0 ? project.assets.map((asset, i) => (
              <div key={asset.name + (asset.url || '') + i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--border-subtle)]/40 group">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5A8F6C] shrink-0" />
                  {asset.url ? (
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#5A8F6C] hover:underline truncate"
                    >
                      {asset.name}
                    </a>
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)] truncate">{asset.name}</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveAsset(i)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-clay)] transition-all p-1 shrink-0"
                  aria-label="Remove asset"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )) : (
              <p className="text-xs text-[var(--text-muted)]">No assets yet — add files, designs, or reference links</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

WorkspaceTab.propTypes = {
  project: PropTypes.object.isRequired,
  onUpdateProject: PropTypes.func.isRequired,
  onNotify: PropTypes.func.isRequired,
};
