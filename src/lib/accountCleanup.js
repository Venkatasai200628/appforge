import { saveLocalProjects } from '@/lib/projectsStorage';

const USER_LOCAL_KEYS = [
  'af_key', 'af_model', 'af_instructions', 'af_notifs',
  'af_pipeline_progress', 'af_generation_result', 'af_generate_prompt',
];

export function clearUserLocalData(uid) {
  try {
    saveLocalProjects(uid || 'guest', []);
    saveLocalProjects('guest', []);
    USER_LOCAL_KEYS.forEach(k => localStorage.removeItem(k));
    if (uid) localStorage.removeItem(`af_projects_${uid}`);
  } catch {}
}

export function withTimeout(promise, ms, label = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}
