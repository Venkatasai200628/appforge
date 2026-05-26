// src/components/pipeline/PipelineStages.jsx
import clsx from 'clsx';
import { CheckCircle2, XCircle, Loader2, Circle, Clock } from 'lucide-react';

const STAGES = [
  { key: 'intent',       label: 'Intent Extraction',    desc: 'Parse & structure prompt',   color: '#6366f1' },
  { key: 'architecture', label: 'Architecture',          desc: 'Entities, pages & flows',    color: '#8b5cf6' },
  { key: 'schema',       label: 'Schema Generation',     desc: 'DB · API · UI schemas',      color: '#3b82f6' },
  { key: 'validation',   label: 'Validation',            desc: 'Cross-check consistency',    color: '#f59e0b' },
  { key: 'repair',       label: 'Repair Engine',         desc: 'Auto-fix issues',            color: '#f97316' },
  { key: 'runtime',      label: 'Runtime Simulation',    desc: 'Verify & score output',      color: '#10b981' },
];

function Icon({ status, color }) {
  if (status === 'done')    return <CheckCircle2 size={15} style={{ color }} />;
  if (status === 'running') return <Loader2 size={15} style={{ color }} className="animate-spin" />;
  if (status === 'error')   return <XCircle size={15} className="text-red-400" />;
  if (status === 'waiting') return <Clock size={15} className="text-amber-400" />;
  return <Circle size={15} className="text-slate-300 dark:text-slate-600" />;
}

function StageSummary({ k, data }) {
  const map = {
    intent:       data && `${data.app_type} · ${data.features?.length || 0} features · ${Math.round((data.confidence || 0) * 100)}% conf`,
    architecture: data && `${data.entities?.length || 0} entities · ${data.pages?.length || 0} pages`,
    schema:       data && `${data.db_schema?.tables?.length || 0} tables · ${data.api_schema?.endpoints?.length || 0} endpoints`,
    validation:   data && `${data.errors?.length || 0} errors · ${data.warnings?.length || 0} warnings`,
    repair:       data && `${data.repairs?.length || 0} repairs applied`,
    runtime:      data && `${data.execution_score || 0}% execution score`,
  };
  const text = map[k];
  if (!text) return null;
  return <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{text}</p>;
}

export default function PipelineStages({ progress, isGenerating, waitingConfirm }) {
  const stageMap = {};
  progress.forEach(p => { if (p.stage && !['complete', 'error'].includes(p.stage)) stageMap[p.stage] = p; });

  const errorStep    = progress.find(p => p.stage === 'error');
  const completeStep = progress.find(p => p.stage === 'complete');

  if (!progress.length && !isGenerating) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">Pipeline Stages</p>
        {STAGES.map(s => (
          <div key={s.key} className="flex items-center gap-3 py-2 opacity-30">
            <Circle size={15} className="text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">Pipeline Stages</p>

      {/* Progress bar */}
      {isGenerating && (
        <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 overflow-hidden">
          <div className="h-full pipeline-bar rounded-full" style={{ width: `${Math.min(100, Object.keys(stageMap).length / 6 * 100)}%`, transition: 'width 0.5s' }} />
        </div>
      )}

      <div className="space-y-1">
        {STAGES.map((stage, idx) => {
          const step   = stageMap[stage.key];
          const status = step?.status || 'idle';
          const isCurrentlyWaiting = waitingConfirm && stage.key === 'intent' && status === 'done';

          return (
            <div key={stage.key}>
              <div className={clsx(
                'flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                status === 'running' && 'bg-indigo-50 dark:bg-indigo-900/20',
                status === 'done' && !isCurrentlyWaiting && 'opacity-70',
                status === 'idle' && 'opacity-30',
              )}>
                <div className="mt-0.5 flex-shrink-0">
                  <Icon status={isCurrentlyWaiting ? 'waiting' : status} color={stage.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm', status !== 'idle' ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-500')}>
                    {stage.label}
                  </p>
                  {status === 'running' && step?.message && (
                    <p className="text-xs mt-0.5" style={{ color: stage.color }}>{step.message}</p>
                  )}
                  {isCurrentlyWaiting && (
                    <p className="text-xs text-amber-500 mt-0.5">Waiting for your confirmation →</p>
                  )}
                  {status === 'done' && !isCurrentlyWaiting && (
                    <StageSummary k={stage.key} data={step?.data} />
                  )}
                </div>
              </div>
              {idx < STAGES.length - 1 && (
                <div className="ml-[1.3rem] w-px h-2 bg-slate-100 dark:bg-slate-800" />
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {errorStep && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <XCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                {errorStep.isUserStop ? 'Stopped by user' : 'Pipeline error'}
              </p>
              <p className="text-xs text-red-500 mt-0.5">{errorStep.message?.replace('USER_STOPPED: ', '')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quality score */}
      {completeStep?.data?.quality_score && (() => {
        const qs = completeStep.data.quality_score;
        const gc = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
        const c = gc[qs.grade] || '#94a3b8';
        return (
          <div className="mt-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">Quality Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold" style={{ color: c }}>{qs.grade}</span>
                <span className="text-xs text-slate-400">{qs.total}/100</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${qs.total}%`, backgroundColor: c }} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
