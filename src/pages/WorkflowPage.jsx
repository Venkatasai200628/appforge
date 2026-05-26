// src/pages/WorkflowPage.jsx
import { useStore } from '@/lib/store';
import { GitBranch, AlertTriangle, CheckCircle2, Wrench, Terminal, Brain, Building2, Database, Globe, Layout, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const STAGE_DOCS = [
  { key: 'intent',       icon: Brain,      title: '01 · Understanding the Prompt',        color: '#6366f1',
    description: 'The Intent Extractor analyses the raw prompt using structured Claude prompting. It identifies app type, features, user roles, and data entities. It flags assumptions where the prompt is vague, conflicts where it contradicts itself, and ambiguities where detail is missing. The output is a normalised JSON intent object with a confidence score.' },
  { key: 'architecture', icon: Building2,  title: '02 · Architecture Design',             color: '#8b5cf6',
    description: 'The Architecture Planner acts like a software architect. From the intent object it designs the system: entity relationships, page routes with role-based access, user flows (login, CRUD, checkout, etc.), and overall style (MVC, event-driven). Every entity named here must be consistent with what\'s generated in Stage 3.' },
  { key: 'schema',       icon: Database,   title: '03 · Schema Generation',               color: '#3b82f6',
    description: 'Three schemas are generated in one structured Claude call: (1) DB Schema — normalised tables with typed fields, PKs, FKs and indexes; (2) API Schema — RESTful endpoints with request/response shapes and role guards; (3) UI Schema — pages with typed components (table, form, chart) bound to data sources. All field names are enforced snake_case.' },
  { key: 'validation',   icon: CheckCircle2, title: '04 · Validation Engine',            color: '#f59e0b',
    description: 'A deterministic rule-based engine checks all three schemas. It detects: API endpoints referencing non-existent DB tables, field name mismatches between UI and DB, undefined roles used in endpoints, UI components pointing to non-existent data sources, and DB tables missing primary keys. No AI is used — pure logic.' },
  { key: 'repair',       icon: Wrench,     title: '05 · Repair Engine',                  color: '#f97316',
    description: 'Each detected issue is fixed without regenerating everything. Simple fixes (add missing table, add field, add PK, add role) are applied deterministically. Complex multi-schema inconsistencies are sent to a targeted Claude repair prompt. Every repair is logged. A second validation pass confirms the fixes worked.' },
  { key: 'runtime',      icon: Terminal,   title: '06 · Executable Output',              color: '#10b981',
    description: 'The Runtime Simulator validates that the output is executable: all routes start with "/", API endpoints generate valid mock responses based on field types, and every DB table can produce a mock row. An execution score (0–100%) is computed. The final JSON is directly usable for app generation or as a foundation for code generation.' },
];

function Row({ label, value, color }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs text-slate-400 dark:text-slate-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-xs font-semibold" style={{ color }}>{String(value)}</span>
    </div>
  );
}

function StageData({ k, data, color }) {
  if (!data) return null;
  const rows = {
    intent: [
      ['App Type', data.app_type], ['Name', data.app_name], ['Confidence', `${Math.round((data.confidence || 0) * 100)}%`],
      ['Features', data.features?.join(', ')], ['Roles', data.roles?.join(', ')], ['Entities', data.primary_entities?.join(', ')],
      ...(data.assumptions?.length ? [['Assumptions', data.assumptions.join(' · ')]] : []),
      ...(data.conflicts?.length ? [['Conflicts', data.conflicts.join(' · ')]] : []),
    ],
    architecture: [
      ['Style', data.architecture_style], ['Complexity', data.complexity],
      ['Entities', data.entities?.map(e => e.name).join(', ')], ['Modules', data.modules?.join(', ')],
      ['Pages', data.pages?.map(p => `${p.name} (${p.route})`).join(', ')],
    ],
    schema: [
      ['DB Tables', `${data.db_schema?.tables?.length || 0}: ${data.db_schema?.tables?.map(t => t.name).join(', ')}`],
      ['API Endpoints', `${data.api_schema?.endpoints?.length || 0} endpoints`],
      ['UI Pages', `${data.ui_schema?.pages?.length || 0} pages`],
      ['Auth', data.auth_schema?.type], ['Roles', data.auth_schema?.roles?.map(r => r.name).join(', ')],
    ],
    validation: [
      ['Status', data.isValid ? '✓ Valid' : `✗ ${data.errors?.length} errors`],
      ['Errors', data.errors?.length || 0], ['Warnings', data.warnings?.length || 0],
    ],
    repair: [],
    runtime: [
      ['Score', `${data.execution_score || 0}%`], ['Valid Routes', data.routes_valid?.length || 0],
      ['Endpoints Simulated', data.api_endpoints_simulated?.length || 0],
    ],
  };

  return (
    <div className="space-y-1.5 mt-3">
      {(rows[k] || []).map(([label, value]) => value !== undefined && value !== null && (
        <Row key={label} label={label} value={value} color={color} />
      ))}
      {k === 'validation' && data.errors?.map((e, i) => (
        <div key={i} className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 mt-1.5">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">{e.type}</p>
          <p className="text-xs text-red-500 mt-0.5">{e.message}</p>
        </div>
      ))}
      {k === 'repair' && (data.repairs?.length === 0
        ? <p className="text-xs text-slate-400">No repairs needed — schema was clean</p>
        : data.repairs?.map((r, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50">
            <Wrench size={10} className="text-orange-500 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-orange-700 dark:text-orange-400">{r.action}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function WorkflowPage() {
  const pipelineProgress = useStore(s => s.pipelineProgress);
  const generationResult = useStore(s => s.generationResult);

  const stageMap = {};
  pipelineProgress.forEach(p => { if (p.stage) stageMap[p.stage] = p; });

  const output = generationResult?.output;

  return (
    <div className="h-full overflow-auto bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 h-14 flex items-center gap-2 px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <GitBranch size={15} className="text-indigo-500" />
        <h1 className="font-semibold text-base">Workflow</h1>
        {!generationResult && (
          <span className="text-sm text-slate-400 dark:text-slate-500">· Generate an app to see the live workflow document</span>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-5 space-y-4">
        {/* Meta */}
        {output && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs font-medium text-slate-400 mb-1">Prompt</p>
            <p className="text-sm text-slate-800 dark:text-slate-200">"{output.meta?.prompt}"</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
              <span>{new Date(output.meta?.generated_at).toLocaleString()}</span>
              <span>·</span><span>v{output.meta?.pipeline_version}</span>
            </div>
          </div>
        )}

        {/* Stage docs */}
        {STAGE_DOCS.map(stage => {
          const step = stageMap[stage.key];
          const done = step?.status === 'done';
          const Icon = stage.icon;
          return (
            <div key={stage.key} className={clsx('bg-white dark:bg-slate-800 rounded-xl border overflow-hidden transition-all',
              done ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-50')}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: stage.color + '18' }}>
                  <Icon size={14} style={{ color: stage.color }} />
                </div>
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex-1">{stage.title}</h3>
                {done && <CheckCircle2 size={13} style={{ color: stage.color }} />}
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{stage.description}</p>
                {done && step?.data && <StageData k={stage.key} data={step.data} color={stage.color} />}
              </div>
            </div>
          );
        })}

        {/* Edge case report */}
        {output && (() => {
          const intent  = output.intent;
          const repairs = output.validation?.repairs_applied || [];
          const warnings = output.validation?.pre_repair?.warnings || [];
          const cases = [
            intent?.conflicts?.length > 0   && { label: 'Conflicts Detected',  items: intent.conflicts,   color: '#ef4444' },
            intent?.ambiguities?.length > 0  && { label: 'Ambiguities Resolved', items: intent.ambiguities, color: '#f97316' },
            intent?.assumptions?.length > 0  && { label: 'Assumptions Made',   items: intent.assumptions, color: '#f59e0b' },
            warnings.length > 0              && { label: 'Warnings Caught',    items: warnings.map(w => w.message), color: '#3b82f6' },
            repairs.length > 0               && { label: 'Auto-Repairs Applied', items: repairs.map(r => r.action), color: '#10b981' },
          ].filter(Boolean);

          if (!cases.length) return null;
          return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <AlertTriangle size={14} className="text-amber-500" />
                </div>
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Edge Cases & Handling</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                {cases.map((c, i) => (
                  <div key={i}>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: c.color }}>{c.label}</p>
                    {c.items.map((item, j) => (
                      <div key={j} className="flex items-start gap-2 py-0.5">
                        <ChevronRight size={11} style={{ color: c.color }} className="mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{item}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
