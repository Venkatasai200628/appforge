// src/pages/MyAppsPage.jsx
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { LayoutGrid, Trash2, ExternalLink, Calendar, Download, Search, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import JsonPreview from '@/components/ui/JsonPreview';

export default function MyAppsPage() {
  const apps = useStore(s => s.apps);
  const deleteApp = useStore(s => s.deleteApp);
  const user = useStore(s => s.user);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('json');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const filtered = apps.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.prompt?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (app) => {
    if (!confirm('Delete this app?')) return;
    setDeleting(app.id);
    try {
      await deleteDoc(doc(db, 'apps', app.id));
      deleteApp(app.id);
      if (selected?.id === app.id) setSelected(null);
    } catch (e) {
      alert('Delete failed: ' + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (app) => {
    const blob = new Blob([JSON.stringify(app.output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app.name || 'app'}-schema.json`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-slate-200 dark:border-surface-border bg-white dark:bg-surface-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} className="text-accent" />
          <h1 className="font-display font-bold text-base text-slate-900 dark:text-white">My Apps</h1>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-surface-hover px-2 py-0.5 rounded-full">{apps.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* App list */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-surface-border">
          {/* Search */}
          <div className="p-3 border-b border-slate-200 dark:border-surface-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search apps..."
                className={clsx(
                  'w-full pl-8 pr-3 py-2 rounded-lg text-xs font-mono',
                  'bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-surface-border',
                  'text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600',
                  'focus:outline-none focus:ring-1 focus:ring-accent/40',
                )}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <LayoutGrid size={24} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-mono text-slate-400 dark:text-slate-600">
                  {apps.length === 0 ? 'No apps yet. Generate one!' : 'No results found.'}
                </p>
              </div>
            ) : (
              filtered.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelected(app)}
                  className={clsx(
                    'w-full text-left px-4 py-3 border-b border-slate-100 dark:border-surface-border transition-all',
                    selected?.id === app.id
                      ? 'bg-accent/5 border-l-2 border-l-accent'
                      : 'hover:bg-slate-50 dark:hover:bg-surface-hover border-l-2 border-l-transparent'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                        {app.name || 'Untitled'}
                      </p>
                      <p className="text-xs font-mono text-slate-400 dark:text-slate-600 truncate mt-0.5">
                        {app.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-mono text-accent/70">{app.app_type}</span>
                        <span className="text-xs font-mono text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-xs font-mono text-slate-400">{app.quality_score || 0}% quality</span>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <LayoutGrid size={32} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="font-mono text-sm text-slate-400 dark:text-slate-600">Select an app to view details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200 dark:border-surface-border bg-white dark:bg-surface-card flex-shrink-0">
                <div className="flex gap-1">
                  <button onClick={() => setView('json')} className={clsx('px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all', view === 'json' ? 'bg-accent/10 text-accent' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>JSON</button>
                  <button onClick={() => setView('preview')} className={clsx('px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all', view === 'preview' ? 'bg-accent/10 text-accent' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>Preview</button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDownload(selected)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-hover transition-all">
                    <Download size={12} /> Download
                  </button>
                  <button
                    onClick={() => handleDelete(selected)}
                    disabled={deleting === selected.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-60"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto bg-slate-50 dark:bg-surface-dark">
                <JsonPreview result={{ success: true, output: selected.output }} view={view} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
