// Local project persistence — works even when Firestore is unavailable

function projectsKey(uid) {
  return uid ? `af_projects_${uid}` : 'af_projects_guest';
}

export function loadLocalProjects(uid) {
  try {
    const raw = localStorage.getItem(projectsKey(uid));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLocalProjects(uid, apps) {
  try {
    localStorage.setItem(projectsKey(uid), JSON.stringify(apps));
  } catch {}
}

export function upsertLocalProject(uid, app) {
  const list = loadLocalProjects(uid);
  const next = [app, ...list.filter(a => a.id !== app.id)];
  saveLocalProjects(uid, next);
  return next;
}

export function removeLocalProject(uid, id) {
  const next = loadLocalProjects(uid).filter(a => a.id !== id);
  saveLocalProjects(uid, next);
  return next;
}

export function makeProjectId() {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
