'use client';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Input, Textarea, Button, SectionHeader } from '@/components/ui';
import { AUTO_SAVE_DEBOUNCE_MS } from '@/lib/constants';
import { pickFile as desktopPickFile, isDesktop } from '@/lib/desktop';

export default function WorkspaceTab({ project, onUpdateProject, onNotify }) {
  const [noteText, setNoteText] = useState(project.notes || '');
  const [saving, setSaving] = useState(false);
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

  const mergeLinksIntoAssets = (p) => {
    const links = p.links || [];
    if (links.length === 0) return p;
    const existingAssets = p.assets || [];
    const newAssets = links.map((link) => ({
      name: link.title,
      url: link.url,
      addedAt: new Date().toISOString(),
    }));
    return { ...p, links: [], assets: [...existingAssets, ...newAssets] };
  };

  const handlePickFile = async () => {
    if (isDesktop()) {
      const result = await desktopPickFile();
      if (result) setAssetUrl(result);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files[0];
      if (file) setAssetUrl(file.name);
    };
    input.click();
  };

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!assetName.trim()) return;

    let p = projectRef.current;
    p = mergeLinksIntoAssets(p);

    const newAsset = {
      name: assetName.trim(),
      url: assetUrl.trim(),
      addedAt: new Date().toISOString(),
    };
    const updated = {
      ...p,
      assets: [...(p.assets || []), newAsset],
    };
    onUpdateRef.current(updated);
    onNotify('Asset added');
    setAssetName('');
    setAssetUrl('');
  };

  const handleRemoveAsset = (index) => {
    let p = projectRef.current;
    p = mergeLinksIntoAssets(p);
    const updated = {
      ...p,
      assets: (p.assets || []).filter((_, i) => i !== index),
    };
    onUpdateRef.current(updated);
    onNotify('Asset removed');
  };

  const isUrl = (str) => {
    try {
      new URL(str);
      return true;
    } catch { return false; }
  };

  const allAssets = [
    ...((project.links || []).map((link) => ({ name: link.title, url: link.url, addedAt: '', _isLink: true }))),
    ...(project.assets || []),
  ];

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
            data-streamer
          />
          <Button onClick={handleSaveNotes} variant="gradient" className="px-4 py-1.5">
            Save Notes
          </Button>
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
              placeholder="Name"
              className="flex-1"
              aria-label="Asset name"
            />
            <div className="flex gap-1 flex-1">
              <Input
                type="text"
                value={assetUrl}
                onChange={(e) => setAssetUrl(e.target.value)}
                placeholder="URL or path"
                aria-label="Asset URL or path"
                className="flex-1"
              />
              <button type="button" onClick={handlePickFile} className="px-2.5 py-1.5 rounded-lg bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors shrink-0">
                Browse
              </button>
            </div>
            <Button type="submit" variant="gradient" className="px-3" style={{ background: '#5A8F6C' }}>Add</Button>
          </form>
          <div className="space-y-2">
            {allAssets.length > 0 ? allAssets.map((asset, i) => (
              <div key={asset.name + (asset.url || '') + i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--border-subtle)]/40 group">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5A8F6C] shrink-0" />
                  {asset.url && isUrl(asset.url) ? (
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#5A8F6C] hover:underline truncate" data-streamer>
                      {asset.name}
                    </a>
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)] truncate" data-streamer>{asset.name}</span>
                  )}
                  {asset.url && !isUrl(asset.url) && (
                    <span className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[200px]">{asset.url}</span>
                  )}
                  {asset._isLink && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-slate)]/10 text-[var(--accent-slate)]">link</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (asset._isLink) {
                      let p = projectRef.current;
                      p = mergeLinksIntoAssets(p);
                      const idx = (p.links || []).findIndex((l) => l.url === asset.url && l.title === asset.name);
                      if (idx >= 0) {
                        const updated = { ...p, links: p.links.filter((_, j) => j !== idx) };
                        onUpdateRef.current(updated);
                        onNotify('Link removed');
                      }
                    } else {
                      handleRemoveAsset(i - (project.links || []).length);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-clay)] transition-all p-1 shrink-0"
                  aria-label="Remove asset"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )) : (
              <p className="text-xs text-[var(--text-muted)]">No assets yet — add files, designs, URLs, or paths</p>
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
