// src/pages/InstructionsPage.jsx
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { BookOpen, Save, CheckCircle2, Lightbulb } from 'lucide-react';
import clsx from 'clsx';

const PRESETS = [
  { label: 'Always use TypeScript types', text: 'Always include TypeScript type definitions in the schema output.' },
  { label: 'Prefer PostgreSQL', text: 'Design DB schemas optimised for PostgreSQL. Use UUID primary keys.' },
  { label: 'Mobile-first UI', text: 'Design UI schemas with mobile-first responsive components.' },
  { label: 'Include audit fields', text: 'Always add created_at, updated_at, and created_by fields to every table.' },
];

export default function InstructionsPage() {
  const customInstructions    = useStore(s => s.customInstructions);
  const setCustomInstructions = useStore(s => s.setCustomInstructions);
  const [draft, setDraft]     = useState(customInstructions);
  const [saved, setSaved]     = useState(false);

  const handleSave = () => {
    setCustomInstructions(draft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const appendPreset = (text) => {
    setDraft(d => d ? `${d}\n${text}` : text);
    setSaved(false);
  };

  return (
    <div className="h-full overflow-auto bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 h-14 flex items-center px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <BookOpen size={15} className="text-indigo-500 mr-2" />
        <h1 className="font-semibold text-base">Custom Instructions</h1>
      </div>

      <div className="max-w-2xl mx-auto p-5 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
          <Lightbulb size={15} className="text-indigo-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Pipeline instructions</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
              These instructions are injected into every pipeline run. Use them to customise how the AI understands and generates your schemas — preferred tech stack, naming conventions, design principles, etc.
            </p>
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your Instructions</span>
            <span className="text-xs text-slate-400">{draft.length} chars</span>
          </div>
          <div className="p-4">
            <textarea
              value={draft}
              onChange={e => { setDraft(e.target.value); setSaved(false); }}
              placeholder="e.g. Always use TypeScript types. Design for PostgreSQL. Use snake_case for all field names. Include pagination in all list endpoints..."
              rows={8}
              className="w-full resize-none text-sm rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
            />
            <div className="flex justify-end mt-3">
              <button onClick={handleSave}
                className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  saved ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700')}>
                {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save Instructions</>}
              </button>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Presets</p>
            <p className="text-xs text-slate-400 mt-0.5">Click to append to your instructions</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => appendPreset(p.text)}
                className="text-left p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{p.label}</p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{p.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Current saved state */}
        {customInstructions && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Currently Active</p>
            </div>
            <pre className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans">{customInstructions}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
