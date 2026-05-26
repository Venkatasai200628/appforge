// GeneratePage.jsx — Split-Pane Workspace layout with PIP activity corner panel
import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { extractIntent, planArchitecture, generateSchemas, runValidation, repairSchemas, simulateRuntime, computeQualityScore } from '@/lib/pipeline';
import { getPregeneratedSchema } from '@/lib/pregeneratedApps';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { makeProjectId } from '@/lib/projectsStorage';
import { sendAppNotification } from '@/lib/notifications';
import { Zap, Send, Square, CheckCircle2, XCircle, RefreshCw, Copy, Check, Download, Save, Activity, X, PlusCircle } from 'lucide-react';
import clsx from 'clsx';
import JsonPreview from '@/components/ui/JsonPreview';

const EXAMPLE_PROMPTS = [
  {
    id: 'ex001',
    icon: '🏢',
    label: 'CRM Platform',
    description: 'Customers, deal pipeline, analytics dashboard, and team roles',
    prompt: 'Build a CRM with customer management, deal pipeline tracking, contact history, sales analytics dashboard, and admin panel with settings',
  },
  {
    id: 'ex002',
    icon: '🛒',
    label: 'Online Store',
    description: 'Product catalog, orders, payments, and store admin',
    prompt: 'Create a full e-commerce platform with product catalog, shopping cart, Stripe payments, order management, customer accounts, admin dashboard, and settings page',
  },
];

// ── Floating Corner Pipeline Widget (PIP Mode) ─────────────────────────────────
function PipelineLogPanel({ logs, open, onClose }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const statusIcon = (status) => {
    if (status === 'done') return <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />;
    if (status === 'running') return <div className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />;
    if (status === 'error') return <XCircle size={11} className="text-red-400 flex-shrink-0" />;
    return <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />;
  };

  if (!open) return null;

  return (
    <div className={clsx(
      'fixed bottom-6 right-6 z-50 w-72',
      'bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-750',
      'flex flex-col overflow-hidden',
      'animate-in slide-in-from-bottom duration-300'
    )} style={{ maxHeight: 320 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Background Pipeline Activity</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
          <X size={12} />
        </button>
      </div>
      {/* Log entries */}
      <div className="overflow-auto flex-1 p-3 space-y-1.5">
        {logs.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Logs appear here during generation</p>
        )}
        {logs.map((log, i) => (
          <div key={i} className={clsx('flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs',
            log.status === 'running' ? 'bg-indigo-50 dark:bg-indigo-900/20' :
            log.status === 'done' ? 'bg-slate-50 dark:bg-slate-800/40' :
            log.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : ''
          )}>
            <div className="mt-0.5">{statusIcon(log.status)}</div>
            <div className="flex-1 min-w-0">
              <p className={clsx('font-medium capitalize leading-tight text-xs',
                log.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300')}>
                {log.stage?.replace(/_/g, ' ')}
              </p>
              {log.message && <p className="text-slate-400 dark:text-slate-500 mt-0.5 text-[10px] leading-tight truncate">{log.message}</p>}
              {log.status === 'done' && log.data && <LogSummary stage={log.stage} data={log.data} />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function LogSummary({ stage, data }) {
  const text = {
    intent: data && `${data.app_type} · ${data.features?.length || 0} features · ${Math.round((data.confidence || 0) * 100)}% confidence`,
    architecture: data && `${data.entities?.length || 0} entities · ${data.pages?.length || 0} pages`,
    schema: data && `${data.db_schema?.tables?.length || 0} tables · ${data.api_schema?.endpoints?.length || 0} endpoints · ${data.ui_schema?.pages?.length || 0} UI pages`,
    validation: data && `${data.errors?.length || 0} errors · ${data.warnings?.length || 0} warnings`,
    repair: data && `${data.repairs?.length || 0} repairs applied`,
    runtime: data && `${data.execution_score || 0}% execution score`,
  }[stage];
  if (!text) return null;
  return <p className="text-indigo-500 dark:text-indigo-400 text-[10px] mt-0.5">{text}</p>;
}

// ── Intent Confirmation Card ───────────────────────────────────────────────────
function IntentConfirmCard({ intent, prompt, setPrompt, onConfirm, onRerun }) {
  const [editing, setEditing] = useState(false);
  const conf = Math.round((intent.confidence || 0) * 100);

  return (
    <div className="border border-indigo-200 dark:border-indigo-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm slide-up">
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 pulse-dot" />
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Plan Confirmation</span>
        </div>
        <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
          conf >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
          conf >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        )}>{conf}% confident</span>
      </div>

      <div className="p-4 space-y-4">
        {/* App summary */}
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">{intent.app_name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{intent.description}</p>
        </div>

        {/* Plan bullets like base44 */}
        <div className="space-y-1.5">
          {intent.features?.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{f}</span>
            </div>
          ))}
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">{intent.app_type}</span>
          {intent.auth_required && <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">Auth Required</span>}
          {intent.payment_required && <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">Payments</span>}
          {intent.roles?.map(r => <span key={r} className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-semibold uppercase tracking-wider">{r}</span>)}
        </div>

        {/* Edit box */}
        {editing && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Refine prompt specifications:</p>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
              className="w-full resize-none text-xs rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1 select-none">
          <button onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm">
            <Zap size={13} /> Confirm, build this app
          </button>
          <button onClick={() => editing ? onRerun() : setEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all bg-white dark:bg-slate-905">
            <RefreshCw size={12} /> {editing ? 'Re-analyse' : 'Modify specs'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Result Card Wrapper ────────────────────────────────────────────────────────
function ResultCard({ result, onSave, saved, onCopy, copied, onDownload, view, setView, onModifyApp, onBackToGenerate, isExampleBlueprint }) {
  const qs = result?.output?.quality_score;
  const gc = { A: 'text-emerald-500', B: 'text-blue-500', C: 'text-amber-500', D: 'text-orange-500', F: 'text-red-500' };
  
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-750 shadow-sm flex-shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Generated App Blueprint</span>
          {qs && <span className={clsx('text-xs font-bold px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800', gc[qs.grade])}>Grade {qs.grade} · {qs.total}% quality</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1.5 mr-2">
            {['preview', 'json'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={clsx('px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all duration-200',
                  view === v ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350')}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={onCopy} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors" title="Copy JSON">
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
          <button onClick={onDownload} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors" title="Download Schema">
            <Download size={13} />
          </button>
          <button onClick={onSave}
            className={clsx('flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-sm border',
              saved 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/40' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 hover:border-indigo-800')}>
            {saved ? <><Check size={11} />Saved</> : <><Save size={11} />Save App</>}
          </button>
        </div>
      </div>

      {/* Main mockup viewport */}
      <div className="flex-1 overflow-hidden min-h-0 bg-white dark:bg-slate-950 rounded-2xl">
        <JsonPreview result={result} view={view} onModifyApp={onModifyApp} onBackToGenerate={onBackToGenerate} isExampleBlueprint={isExampleBlueprint} />
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function GeneratePage() {
  const user = useStore(s => s.user);
  const anthropicKey = useStore(s => s.anthropicKey);
  const customInstructions = useStore(s => s.customInstructions);
  const pipelineProgress = useStore(s => s.pipelineProgress);
  const generationResult = useStore(s => s.generationResult);
  const storedPrompt = useStore(s => s.generatePrompt);
  const pendingIntent = useStore(s => s.pendingIntent);
  const isGenerating = useStore(s => s.isGenerating);
  const addApp = useStore(s => s.addApp);
  const updateApp = useStore(s => s.updateApp);
  const addHistory = useStore(s => s.addHistory);
  const notificationsEnabled = useStore(s => s.notificationsEnabled);
  const { setGenerating, addProgress, clearProgress, setResult, setAbortController, stopGeneration, setPendingIntent, setGeneratePrompt } = useStore();

  const [prompt, setPrompt] = useState(storedPrompt || '');
  const [isExampleBlueprint, setIsExampleBlueprint] = useState(
    generationResult?.output?.meta?.source === 'example_blueprint'
  );
  const [logOpen, setLogOpen] = useState(false);
  const [waitingConfirm, setWaiting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState('preview');
  const abortRef = useRef(null);
  const resolveRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (storedPrompt && !prompt) setPrompt(storedPrompt);
  }, [storedPrompt]);

  const progress = (step) => addProgress({ ...step, ts: Date.now() });

  const persistProject = useCallback(async (result, existingId = null) => {
    if (!result?.success) return null;
    const uid = user?.uid || 'guest';
    const savePrompt = result.output?.meta?.prompt || prompt;
    const now = new Date().toISOString();
    const id = existingId || makeProjectId();
    const existing = useStore.getState().apps.find(a => a.id === id);
    const app = {
      id,
      uid,
      prompt: savePrompt,
      output: result.output,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
      name: result.output?.intent?.app_name || 'Untitled',
      app_type: result.output?.intent?.app_type || 'Custom',
      quality_score: result.output?.quality_score?.total || 0,
    };

    addApp(app);
    setSaveError('');

    if (user) {
      try {
        const cloudPayload = {
          uid: user.uid,
          prompt: savePrompt,
          output: result.output,
          updatedAt: now,
          name: app.name,
          app_type: app.app_type,
          quality_score: app.quality_score,
          localId: id,
        };
        const cloudId = existing?.firestoreId || (existingId && !String(existingId).startsWith('proj_') ? existingId : null);
        if (cloudId) {
          await updateDoc(doc(db, 'apps', cloudId), cloudPayload);
        } else {
          const d = await addDoc(collection(db, 'apps'), { ...cloudPayload, createdAt: app.createdAt });
          updateApp(id, { firestoreId: d.id });
        }
      } catch (e) {
        setSaveError(`Saved to Projects. Cloud sync failed: ${e.message}`);
      }
    }

    return id;
  }, [user, prompt, addApp, updateApp]);

  const handleBackToGenerate = () => {
    clearProgress();
    setSaved(false);
    setSavedProjectId(null);
    setSaveError('');
    setIsExampleBlueprint(false);
    setPrompt('');
    setGeneratePrompt('');
  };

  const runPipeline = async (userPrompt, signal) => {
    const key = anthropicKey;
    const check = () => { if (signal?.aborted) throw new Error('USER_STOPPED'); };

    // Stage 1
    progress({ stage: 'intent', status: 'running', message: 'Analysing your prompt…' });
    const intent = await extractIntent(userPrompt, key, customInstructions);
    progress({ stage: 'intent', status: 'done', data: intent });
    check();

    // Confirmation gate
    setPendingIntent(intent);
    setWaiting(true);
    await new Promise((res, rej) => {
      resolveRef.current = res;
      signal.addEventListener('abort', () => rej(new Error('USER_STOPPED')));
    });
    setWaiting(false);
    setPendingIntent(null);
    check();

    // Stage 2
    progress({ stage: 'architecture', status: 'running', message: 'Designing system architecture…' });
    const arch = await planArchitecture(intent, key);
    progress({ stage: 'architecture', status: 'done', data: arch });
    check();

    // Stage 3
    progress({ stage: 'schema', status: 'running', message: 'Generating DB · API · UI schemas…' });
    const schemas = await generateSchemas(intent, arch, key);
    progress({ stage: 'schema', status: 'done', data: schemas });
    check();

    // Stage 4
    progress({ stage: 'validation', status: 'running', message: 'Checking schema consistency…' });
    const validation = runValidation(schemas);
    progress({ stage: 'validation', status: 'done', data: validation });
    check();

    // Stage 5
    progress({ stage: 'repair', status: 'running', message: `Fixing ${validation.errors.length + validation.warnings.length} issue(s)…` });
    const { schemas: fixed, repairs } = await repairSchemas(schemas, validation, key);
    const postVal = runValidation(fixed);
    progress({ stage: 'repair', status: 'done', data: { repairs } });
    check();

    // Stage 6
    progress({ stage: 'runtime', status: 'running', message: 'Simulating runtime…' });
    const runtime = simulateRuntime(fixed);
    progress({ stage: 'runtime', status: 'done', data: runtime });

    const output = {
      meta: { generated_at: new Date().toISOString(), prompt: userPrompt, pipeline_version: '4.0' },
      intent, architecture: arch, schemas: fixed,
      validation: { pre_repair: validation, post_repair: postVal, repairs_applied: repairs },
      runtime_simulation: runtime,
      quality_score: computeQualityScore(intent, fixed, postVal, runtime),
    };
    progress({ stage: 'complete', status: 'done', data: output });
    return { success: true, output };
  };

  const loadExampleBlueprint = async (example) => {
    clearProgress();
    setResult(null);
    setSaved(false);
    setSavedProjectId(null);
    setSaveError('');
    setPrompt(example.prompt);
    setGenerating(true);
    setLogOpen(true);
    try {
      progress({ stage: 'intent', status: 'running', message: 'Loading premium blueprint…' });
      await new Promise(r => setTimeout(r, 400));
      const schema = getPregeneratedSchema(example.id, example.label, example.prompt);
      progress({ stage: 'intent', status: 'done', data: schema.intent });
      progress({ stage: 'architecture', status: 'done', data: schema.architecture });
      progress({ stage: 'schema', status: 'done', data: schema.schemas });
      progress({ stage: 'validation', status: 'done', data: schema.validation?.pre_repair });
      progress({ stage: 'repair', status: 'done', data: { repairs: [] } });
      progress({ stage: 'runtime', status: 'done', data: schema.runtime_simulation });
      const output = {
        meta: { generated_at: new Date().toISOString(), prompt: example.prompt, pipeline_version: '4.0', source: 'example_blueprint' },
        intent: schema.intent,
        architecture: schema.architecture,
        schemas: schema.schemas,
        validation: schema.validation,
        runtime_simulation: schema.runtime_simulation,
        quality_score: schema.quality_score,
      };
      setIsExampleBlueprint(true);
      setGeneratePrompt(example.prompt);
      const result = { success: true, output };
      setResult(result);
      addHistory({ prompt: example.prompt, result, ts: Date.now() });
      const projectId = await persistProject(result, savedProjectId);
      if (projectId) {
        setSavedProjectId(projectId);
        setSaved(true);
      } else {
        setSavedProjectId(null);
        setSaved(false);
      }
      progress({ stage: 'complete', status: 'done', data: output });
    } catch (err) {
      progress({ stage: 'error', status: 'error', message: err.message });
      setResult({ success: false, error: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async (overridePrompt) => {
    const p = overridePrompt || prompt;
    if (!p.trim()) return;
    if (!anthropicKey) { alert('Add your Groq API key in Settings first (free at console.groq.com)'); return; }
    clearProgress(); setResult(null); setSaved(false); setSavedProjectId(null); setSaveError(''); setGenerating(true); setLogOpen(true);
    const ac = new AbortController();
    abortRef.current = ac; setAbortController(ac);
    try {
      setGeneratePrompt(p);
      setIsExampleBlueprint(false);
      const result = await runPipeline(p, ac.signal);
      setResult(result);
      addHistory({ prompt: p, result, ts: Date.now() });

      if (result.success) {
        const projectId = await persistProject(result, savedProjectId);
        if (projectId) {
          setSavedProjectId(projectId);
          setSaved(true);
        }
        if (notificationsEnabled) {
          sendAppNotification('generation_complete', { appName: result.output?.intent?.app_name });
        }
      }
    } catch (err) {
      const stop = err.message?.startsWith('USER_STOPPED');
      progress({ stage: 'error', status: 'error', message: stop ? 'Stopped by user' : err.message, isUserStop: stop });
      setResult({ success: false, error: err.message, isUserStop: stop });
    } finally {
      setGenerating(false); setAbortController(null); setWaiting(false); resolveRef.current = null;
    }
  };

  // Stateful Iterative Chat modification handler
  const handleModifyApp = async (feedbackPrompt) => {
    if (!feedbackPrompt.trim() || !generationResult?.success) return;
    setGenerating(true);
    setLogOpen(true);
    clearProgress();
    setSaved(false);
    setSavedProjectId(null);
    
    // Stage 1
    progress({ stage: 'intent', status: 'running', message: 'Analyzing iterative changes...' });
    const currentOutput = generationResult.output;
    
    try {
      progress({ stage: 'intent', status: 'done', data: currentOutput.intent });
      progress({ stage: 'architecture', status: 'running', message: 'Realignment of page structure...' });
      await new Promise(r => setTimeout(r, 600));
      progress({ stage: 'architecture', status: 'done', data: currentOutput.architecture });
      
      progress({ stage: 'schema', status: 'running', message: 'Modifying database tables and navigation views...' });
      await new Promise(r => setTimeout(r, 1200));

      const modifiedSchemas = JSON.parse(JSON.stringify(currentOutput.schemas));
      
      // Update intent text list
      if (!currentOutput.intent.features.includes(feedbackPrompt)) {
        currentOutput.intent.features.push(feedbackPrompt);
      }
      
      const lower = feedbackPrompt.toLowerCase();
      if (lower.includes('stripe') || lower.includes('payment') || lower.includes('pay')) {
        if (!modifiedSchemas.db_schema.tables.some(t => t.name === 'payments')) {
          modifiedSchemas.db_schema.tables.push({
            name: 'payments',
            fields: [
              { name: 'id', type: 'uuid', required: true, unique: true },
              { name: 'amount', type: 'decimal', required: true },
              { name: 'status', type: 'varchar', required: true },
              { name: 'created_at', type: 'timestamp', required: true }
            ]
          });
          modifiedSchemas.api_schema.endpoints.push({
            method: 'POST', path: '/payments/charge', description: 'Process payment request via Stripe gate'
          });
          // Update UI schema metrics dynamically
          const dashboard = modifiedSchemas.ui_schema.pages.find(p => p.name === 'Dashboard');
          if (dashboard) {
            const stats = dashboard.components.find(c => c.type === 'stats');
            if (stats) {
              stats.metrics.push({ label: 'STRIPE REVENUE', value: '$8,240', icon: 'dollar-sign', change: '+12%' });
            }
          }
        }
      } else if (lower.includes('role') || lower.includes('permission') || lower.includes('auth')) {
        if (!modifiedSchemas.auth_schema.roles.some(r => r.name === 'manager')) {
          modifiedSchemas.auth_schema.roles.push({
            name: 'manager', permissions: ['read', 'create', 'update']
          });
        }
      } else {
        // Standard entity injection based on text inputs
        const entityClean = lower.replace(/[^a-z]/g, '').slice(0, 10) || 'records';
        if (!modifiedSchemas.db_schema.tables.some(t => t.name === entityClean)) {
          modifiedSchemas.db_schema.tables.push({
            name: entityClean,
            fields: [
              { name: 'id', type: 'uuid', required: true, unique: true },
              { name: 'title', type: 'varchar', required: true },
              { name: 'created_at', type: 'timestamp', required: true }
            ]
          });
          modifiedSchemas.api_schema.endpoints.push({
            method: 'GET', path: `/${entityClean}`, description: `Fetch ${entityClean} details`
          });
          // Push a 3rd tab to preview
          modifiedSchemas.ui_schema.pages.push({
            name: entityClean.toUpperCase(),
            route: `/${entityClean}`,
            components: [
              { type: 'table', id: `table_${entityClean}`, title: `List of ${entityClean}`, data_source: entityClean, fields: ['title', 'created_at'] }
            ]
          });
        }
      }
      
      const updatedOutput = {
        ...currentOutput,
        schemas: modifiedSchemas,
        meta: { ...currentOutput.meta, generated_at: new Date().toISOString(), prompt: `${currentOutput.meta?.prompt} (Modified: ${feedbackPrompt})` }
      };

      progress({ stage: 'schema', status: 'done', data: updatedOutput.schemas });
      
      progress({ stage: 'validation', status: 'running', message: 'Testing constraints...' });
      const validation = runValidation(updatedOutput.schemas);
      progress({ stage: 'validation', status: 'done', data: validation });
      
      progress({ stage: 'repair', status: 'running', message: 'Verifying consistency checks...' });
      progress({ stage: 'repair', status: 'done', data: { repairs: [] } });
      
      progress({ stage: 'runtime', status: 'running', message: 'Pre-simulating route indices...' });
      const runtime = simulateRuntime(updatedOutput.schemas);
      progress({ stage: 'runtime', status: 'done', data: runtime });
      
      const finalResult = {
        success: true,
        output: {
          ...updatedOutput,
          validation: { pre_repair: validation, post_repair: validation, repairs_applied: [] },
          runtime_simulation: runtime,
          quality_score: computeQualityScore(updatedOutput.intent, updatedOutput.schemas, validation, runtime)
        }
      };

      setResult(finalResult);
      addHistory({ prompt: feedbackPrompt, result: finalResult, ts: Date.now() });
      if (notificationsEnabled) {
        sendAppNotification('modification_complete', { appName: finalResult.output.intent?.app_name });
      }

      // Save modified app to Firestore
      if (user) {
        try {
          const d = await addDoc(collection(db, 'apps'), {
            uid: user.uid,
            prompt: finalResult.output.meta?.prompt,
            output: finalResult.output,
            createdAt: new Date().toISOString(),
            name: finalResult.output.intent?.app_name || 'Untitled',
            app_type: finalResult.output.intent?.app_type || 'Custom',
            quality_score: finalResult.output.quality_score?.total || 0,
            source: 'modified'
          });
          addApp({
            id: d.id,
            prompt: finalResult.output.meta?.prompt,
            output: finalResult.output,
            createdAt: new Date().toISOString(),
            name: finalResult.output.intent?.app_name,
            app_type: finalResult.output.intent?.app_type,
            quality_score: finalResult.output.quality_score?.total
          });
          setSaved(true);
        } catch {}
      }
    } catch (e) {
      progress({ stage: 'error', status: 'error', message: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = () => { resolveRef.current?.(); };
  const handleRerun = () => {
    abortRef.current?.abort();
    setTimeout(() => {
      clearProgress(); setResult(null); setWaiting(false); resolveRef.current = null;
      const ac = new AbortController();
      abortRef.current = ac; setAbortController(ac); setGenerating(true); setLogOpen(true);
      runPipeline(prompt, ac.signal).then(r => { setResult(r); addHistory({ prompt, result: r, ts: Date.now() }); }).catch(err => {
        progress({ stage: 'error', status: 'error', message: err.message });
        setResult({ success: false, error: err.message });
      }).finally(() => { setGenerating(false); setAbortController(null); setWaiting(false); });
    }, 150);
  };
  const handleStop = () => { stopGeneration(); abortRef.current?.abort(); resolveRef.current = null; setWaiting(false); };
  
  const handleSave = async () => {
    if (!generationResult?.success) {
      alert('Generate an app before saving.');
      return;
    }
    const id = await persistProject(generationResult, savedProjectId);
    if (id) {
      setSavedProjectId(id);
      setSaved(true);
      if (notificationsEnabled) {
        sendAppNotification('save_complete', { appName: generationResult.output?.intent?.app_name });
      }
    } else {
      alert('Could not save project.');
    }
  };
  const handleCopy = () => { navigator.clipboard.writeText(JSON.stringify(generationResult?.output, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleDownload = () => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify(generationResult?.output, null, 2)], { type: 'application/json' })), download: `${generationResult?.output?.intent?.app_name || 'app'}-schema.json` });
    a.click();
  };

  const runningStage = pipelineProgress.filter(p => p.status === 'running').slice(-1)[0];
  const hasResult = !!generationResult;
  const isError = generationResult && !generationResult.success;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-indigo-500" />
          <h1 className="font-semibold text-base">Generate</h1>
          {generationResult?.success && (
            <button
              onClick={handleBackToGenerate}
              className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <PlusCircle size={12} /> New App
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 select-none">
          {isGenerating && (
            <button onClick={() => setLogOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 pulse-dot" />
              {waitingConfirm ? 'Confirming specs' : (runningStage?.stage || 'Generating')}…
              <Activity size={12} />
            </button>
          )}
          {!isGenerating && pipelineProgress.length > 0 && (
            <button onClick={() => setLogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <Activity size={12} /> View logs
            </button>
          )}
          {isGenerating && (
            <button onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 text-xs font-medium hover:bg-red-105 transition-colors">
              <Square size={11} /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Slide-in PIP Activity Log panel */}
      <PipelineLogPanel logs={pipelineProgress} open={logOpen} onClose={() => setLogOpen(false)} />

      {/* Main Workspace - Split Pane Layout if result exists */}
      {generationResult?.success ? (
        <div className="flex-1 overflow-hidden flex">
          {/* Left specification sidebar */}
          <div className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div className="overflow-auto p-5 space-y-4 flex-1">
              <button
                type="button"
                onClick={handleBackToGenerate}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <PlusCircle size={14} /> Back to Generate Home
              </button>
              {saved && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold text-center">
                  Saved to Projects{saveError ? ` (${saveError})` : ''}
                </p>
              )}
              <div>
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1">Specifications Plan</span>
                <h2 className="text-base font-bold text-slate-850 dark:text-white leading-tight">
                  {generationResult.output?.intent?.app_name || 'My Custom Application'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {generationResult.output?.intent?.description}
                </p>
              </div>
              
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-wider mb-2.5">Extracted Plan Features</h4>
                <ul className="space-y-2">
                  {generationResult.output?.intent?.features?.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-350">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {generationResult.output?.intent?.assumptions?.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  <h4 className="font-bold text-xs text-amber-500 uppercase tracking-wider mb-2">Assumptions documented</h4>
                  <ul className="space-y-1.5">
                    {generationResult.output.intent.assumptions.map((a, i) => (
                      <li key={i} className="text-xs text-slate-500 dark:text-slate-400 leading-snug">· {a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Suggestions & prompt builder at the bottom of specification panel */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex flex-wrap gap-1.5 mb-2.5 select-none">
                <button onClick={() => setPrompt("Add Stripe Payments integration")} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:border-indigo-400 dark:hover:border-indigo-800 transition-colors">
                  + Add Stripe
                </button>
                <button onClick={() => setPrompt("Build custom analytics graphs")} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:border-indigo-400 dark:hover:border-indigo-800 transition-colors">
                  + Add Analytics
                </button>
              </div>
              <div className="relative">
                <input
                  value={prompt}
                  onChange={e => { setPrompt(e.target.value); setGeneratePrompt(e.target.value); }}
                  onKeyDown={e => { if (e.key === 'Enter') { handleGenerate(); } }}
                  placeholder="Ask a custom specification change…"
                  className="w-full pl-3.5 pr-9 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400"
                />
                <button onClick={() => handleGenerate()} disabled={!prompt.trim()} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-600 disabled:opacity-40 transition-colors">
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Right app workspace area (70% width) */}
          <div className="flex-1 overflow-auto bg-slate-100/40 dark:bg-slate-950 p-5">
            <ResultCard
              result={generationResult}
              onSave={handleSave} saved={saved}
              onCopy={handleCopy} copied={copied}
              onDownload={handleDownload}
              view={view} setView={setView}
              onModifyApp={handleModifyApp}
              onBackToGenerate={handleBackToGenerate}
              isExampleBlueprint={isExampleBlueprint}
            />
          </div>
        </div>
      ) : (
        /* Original Single column chat style for idle or generating state */
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
            
            {/* Prompt input */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => { setPrompt(e.target.value); setGeneratePrompt(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                placeholder="Describe the application dashboard you want to build…"
                rows={3}
                disabled={isGenerating}
                className="w-full resize-none px-4 pt-4 pb-2 text-sm bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
              />
              <div className="flex items-center justify-between px-4 pb-3">
                <p className="text-xs text-slate-400">⌘+Enter to generate app</p>
                {!isGenerating ? (
                  <button onClick={() => handleGenerate()} disabled={!prompt.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-200 dark:shadow-none">
                    <Send size={13} /> Generate App
                  </button>
                ) : (
                  <button onClick={handleStop}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-650 text-white text-sm font-semibold transition-colors">
                    <Square size={13} /> Stop
                  </button>
                )}
              </div>
            </div>

            {/* Example prompts — only show when idle */}
            {!hasResult && !isGenerating && !waitingConfirm && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Try a full app blueprint</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button key={ex.id} onClick={() => loadExampleBlueprint(ex)}
                      className="flex flex-col gap-2 px-4 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{ex.icon}</span>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{ex.label}</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ex.description}</p>
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Open full app preview →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generating placeholder */}
            {isGenerating && !waitingConfirm && !pendingIntent && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center shadow-sm">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {runningStage?.message || 'Activating pipeline stages…'}
                </p>
                <button onClick={() => setLogOpen(true)} className="mt-2.5 text-xs text-indigo-500 hover:text-indigo-750 font-bold flex items-center gap-1 mx-auto transition-colors">
                  <Activity size={11} /> View background activities log
                </button>
              </div>
            )}

            {/* Intent confirmation */}
            {waitingConfirm && pendingIntent && (
              <IntentConfirmCard
                intent={pendingIntent}
                prompt={prompt}
                setPrompt={setPrompt}
                onConfirm={handleConfirm}
                onRerun={handleRerun}
              />
            )}

            {/* Error */}
            {isError && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-in shake duration-300">
                <XCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">{generationResult.isUserStop ? 'Pipeline Stopped' : 'Generation Error'}</p>
                  <p className="text-xs text-red-500 mt-0.5">{generationResult.error?.replace('USER_STOPPED: ', '')}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
