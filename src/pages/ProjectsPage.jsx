// src/pages/ProjectsPage.jsx
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { loadLocalProjects } from '@/lib/projectsStorage';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { FolderOpen, Trash2, Download, Search, ChevronRight, Calendar, Star } from 'lucide-react';
import clsx from 'clsx';
import JsonPreview from '@/components/ui/JsonPreview';

export default function ProjectsPage() {
  const apps      = useStore(s => s.apps);
  const setApps   = useStore(s => s.setApps);
  const deleteApp = useStore(s => s.deleteApp);
  const user      = useStore(s => s.user);

  useEffect(() => {
    const uid = user?.uid || 'guest';
    const local = loadLocalProjects(uid);
    if (local.length > 0) {
      const byId = new Map();
      [...apps, ...local].forEach(a => byId.set(a.id, a));
      setApps([...byId.values()].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      ));
    }
  }, [user?.uid]);
  const [selected, setSelected] = useState(null);
  const [view, setView]         = useState('preview');
  const [search, setSearch]     = useState('');
  const [deleting, setDeleting] = useState(null);

  const ownerUid = user?.uid || 'guest';
  const filtered = apps
    .filter(a => !a.uid || a.uid === ownerUid)
    .filter(a =>
      !search || (a.name + a.prompt + a.app_type).toLowerCase().includes(search.toLowerCase())
    );

  const handleDelete = async (app) => {
    if (!confirm(`Delete "${app.name}"?`)) return;
    setDeleting(app.id);
    try {
      await deleteDoc(doc(db, 'apps', app.id));
      deleteApp(app.id);
      if (selected?.id === app.id) setSelected(null);
    } catch (e) { alert('Delete failed: ' + e.message); }
    finally { setDeleting(null); }
  };

  const handleDownload = (app) => {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(app.output, null, 2)], { type: 'application/json' })),
      download: `${app.name || 'app'}-schema.json`
    });
    a.click();
  };

  const gradeColor = { A: 'text-emerald-500', B: 'text-blue-500', C: 'text-amber-500', D: 'text-orange-500', F: 'text-red-500' };

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen size={15} className="text-indigo-500" />
          <h1 className="font-semibold text-base">Projects</h1>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-500">{apps.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* List */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-100 dark:border-slate-800">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search projects…"
                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  {apps.length === 0 ? 'No projects yet' : 'No results'}
                </p>
                {apps.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Generate an app and save it</p>
                )}
              </div>
            ) : (
              filtered.map(app => {
                const grade = app.output?.quality_score?.grade || '?';
                return (
                  <button key={app.id} onClick={() => setSelected(app)}
                    className={clsx('w-full text-left px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 transition-all',
                      selected?.id === app.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-2 border-l-transparent'
                    )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{app.name || 'Untitled'}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{app.prompt}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-indigo-500 font-medium">{app.app_type}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className={clsx('text-xs font-bold', gradeColor[grade] || 'text-slate-400')}>Grade {grade}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
              <div className="text-center">
                <FolderOpen size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Select a project to view</p>
              </div>
            </div>
          ) : (
            <>
              <div className="h-12 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                <div className="flex gap-1">
                  {['preview', 'json'].map(v => (
                    <button key={v} onClick={() => setView(v)}
                      className={clsx('px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                        view === v ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
                      {v === 'json' ? 'JSON' : 'Preview'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleDownload(selected)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Download size={12} /> Download
                  </button>
                  <button onClick={() => handleDelete(selected)} disabled={deleting === selected.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
                <JsonPreview result={{ success: true, output: selected.output }} view={view} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
