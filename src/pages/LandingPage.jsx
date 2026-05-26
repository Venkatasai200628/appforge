// src/pages/LandingPage.jsx
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '@/lib/store';
import {
  Zap, GitBranch, Shield, Wrench, BarChart2,
  ArrowRight, CheckCircle, ChevronRight, Layers, Terminal
} from 'lucide-react';

const FEATURES = [
  { icon: GitBranch, title: '6-Stage Pipeline',      desc: 'Intent → Architecture → Schema → Validation → Repair → Runtime. Not a single prompt.' },
  { icon: Shield,    title: 'Validation Engine',      desc: 'Automatically detects field mismatches, missing tables, undefined roles across all schemas.' },
  { icon: Wrench,    title: 'Auto-Repair Engine',     desc: 'Fixes broken schemas without regenerating everything. Compiler-grade reliability.' },
  { icon: Layers,    title: 'Executable JSON Output', desc: 'DB schema + API schema + UI schema. Consistent snake_case across all layers.' },
  { icon: Terminal,  title: 'Runtime Simulation',     desc: 'Mock data generation, route validation, execution scoring before you ship.' },
  { icon: BarChart2, title: 'Benchmark Framework',    desc: '20 test prompts (10 normal + 10 edge cases) to measure pipeline quality.' },
];

const STEPS = [
  { n: '01', title: 'Enter your prompt',    desc: '"Build a CRM with customer management and Stripe payments"' },
  { n: '02', title: 'Confirm AI understanding', desc: 'Review what the AI understood. Edit or approve before proceeding.' },
  { n: '03', title: 'Pipeline runs',        desc: 'Architecture → Schemas → Validation → Repair — all automatic.' },
  { n: '04', title: 'Get executable JSON',  desc: 'Download a validated, consistent app schema ready for generation.' },
];

export default function LandingPage() {
  const user        = useStore(s => s.user);
  const authLoading = useStore(s => s.authLoading);
  const navigate    = useNavigate();

  // If already logged in, skip landing
  useEffect(() => {
    if (!authLoading && user) navigate('/app/generate', { replace: true });
  }, [user, authLoading]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">AppForge</span>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            Get Started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-medium mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 pulse-dot" />
          AI-Powered App Schema Generator
        </div>

        <h1 className="text-5xl md:text-6xl font-bold leading-tight text-slate-900 dark:text-white mb-6">
          Turn any idea into a<br />
          <span className="text-indigo-600">validated app schema</span>
        </h1>

        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10">
          AppForge runs a 6-stage AI pipeline — not just one prompt. It extracts intent,
          designs architecture, generates DB + API + UI schemas, validates consistency,
          repairs errors, and simulates runtime. All automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/login"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900"
          >
            <Zap size={16} /> Build My App Schema
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* Pipeline preview */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max mx-auto w-fit">
            {['Intent Extract', 'Architecture', 'Schema Gen', 'Validation', 'Repair', 'Runtime'].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{s}</span>
                </div>
                {i < arr.length - 1 && <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 mb-4" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-3">
          Built for engineering maturity
        </h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-10">
          Not "Prompt → GPT → Random JSON". A real compiler-like pipeline.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                  <Icon size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-10">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map(s => (
            <div key={s.n} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="text-3xl font-bold text-indigo-100 dark:text-indigo-900 mb-3">{s.n}</div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{s.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-2xl bg-indigo-600 p-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Ready to generate your app schema?</h2>
          <p className="text-indigo-200 mb-6">Sign in with Google and get your first schema in under 60 seconds.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors"
          >
            <Zap size={16} /> Start for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-800 py-8 text-center text-sm text-slate-400">
        © 2025 AppForge · Built with React + Firebase + Anthropic
      </footer>
    </div>
  );
}
