// src/lib/store.js
import { create } from 'zustand';
import { loadLocalProjects, saveLocalProjects } from '@/lib/projectsStorage';

const safe = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; }
  catch { return fallback; }
};

const safeJson = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const useStore = create((set, get) => ({
  // ── Theme ──────────────────────────────────────────────────────
  theme: safe('theme', 'light'),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', next); } catch {}
    set({ theme: next });
  },

  // ── Auth ───────────────────────────────────────────────────────
  user: null,
  authLoading: true,
  setUser: (user) => set({ user }),
  setAuthLoading: (v) => set({ authLoading: v }),

  // ── API Key — works for Groq (gsk_...) or Anthropic (sk-ant-...) ──
  anthropicKey: safe('af_key', ''),
  setAnthropicKey: (key) => {
    try { localStorage.setItem('af_key', key); } catch {}
    set({ anthropicKey: key });
  },

  // ── Groq model override (default: llama-3.3-70b-versatile) ────
  groqModel: safe('af_model', 'llama-3.3-70b-versatile'),
  setGroqModel: (m) => {
    try { localStorage.setItem('af_model', m); } catch {}
    set({ groqModel: m });
  },

  // ── Custom pipeline instructions ───────────────────────────────
  customInstructions: safe('af_instructions', ''),
  setCustomInstructions: (v) => {
    try { localStorage.setItem('af_instructions', v); } catch {}
    set({ customInstructions: v });
  },

  // ── Pipeline / generation state (persisted across refresh) ───
  isGenerating: false,
  pipelineProgress: safeJson('af_pipeline_progress', []),
  generationResult: safeJson('af_generation_result', null),
  generatePrompt: safe('af_generate_prompt', ''),
  abortController: null,
  pendingIntent: null,
  registeredUsers: [],

  setGenerating: (v) => set({ isGenerating: v }),
  addProgress: (step) => set(s => {
    const pipelineProgress = [...s.pipelineProgress, { ...step, ts: Date.now() }];
    try { localStorage.setItem('af_pipeline_progress', JSON.stringify(pipelineProgress)); } catch {}
    return { pipelineProgress };
  }),
  clearProgress: () => {
    try {
      localStorage.removeItem('af_pipeline_progress');
      localStorage.removeItem('af_generation_result');
      localStorage.removeItem('af_generate_prompt');
    } catch {}
    set({ pipelineProgress: [], generationResult: null, pendingIntent: null, generatePrompt: '' });
  },
  setResult: (r) => {
    try { localStorage.setItem('af_generation_result', JSON.stringify(r)); } catch {}
    set({ generationResult: r });
  },
  setGeneratePrompt: (prompt) => {
    try { localStorage.setItem('af_generate_prompt', prompt); } catch {}
    set({ generatePrompt: prompt });
  },
  setRegisteredUsers: (users) => set({ registeredUsers: users }),
  setAbortController: (ac) => set({ abortController: ac }),
  stopGeneration: () => {
    get().abortController?.abort();
    set({ isGenerating: false, abortController: null });
  },
  setPendingIntent: (intent) => set({ pendingIntent: intent }),

  // ── Projects (saved locally + Firestore when available) ───────
  apps: [],
  setApps: (apps) => {
    const uid = get().user?.uid || 'guest';
    saveLocalProjects(uid, apps);
    set({ apps });
  },
  addApp: (app) => set(s => {
    const apps = [app, ...s.apps.filter(a => a.id !== app.id)];
    saveLocalProjects(get().user?.uid || 'guest', apps);
    return { apps };
  }),
  updateApp: (id, patch) => set(s => {
    const apps = s.apps.map(a => (a.id === id ? { ...a, ...patch, id } : a));
    saveLocalProjects(get().user?.uid || 'guest', apps);
    return { apps };
  }),
  deleteApp: (id) => set(s => {
    const apps = s.apps.filter(a => a.id !== id);
    saveLocalProjects(get().user?.uid || 'guest', apps);
    return { apps };
  }),
  hydrateAppsFromLocal: (uid) => {
    const apps = loadLocalProjects(uid || 'guest');
    set({ apps });
    return apps;
  },

  // ── Session history ────────────────────────────────────────────
  history: [],
  addHistory: (item) => set(s => ({ history: [item, ...s.history].slice(0, 50) })),
  clearHistory: () => set({ history: [] }),

  // ── Browser notifications ──────────────────────────────────────
  notificationsEnabled: safe('af_notifs', 'false') === 'true',
  setNotifications: (v) => {
    try { localStorage.setItem('af_notifs', String(v)); } catch {}
    set({ notificationsEnabled: v });
  },

  // ── Benchmark ─────────────────────────────────────────────────
  benchmarkResults: [],
  benchmarkRunning: false,
  benchmarkRunningId: null,   // id of single prompt being run
  setBenchmarkResults: (r) => set({ benchmarkResults: r }),
  addBenchmarkResult: (r) => set(s => {
    const existing = s.benchmarkResults.filter(x => x.id !== r.id);
    return { benchmarkResults: [...existing, r] };
  }),
  setBenchmarkRunning: (v) => set({ benchmarkRunning: v }),
  setBenchmarkRunningId: (id) => set({ benchmarkRunningId: id }),
}));
