/** Public app URL — set VITE_APP_URL in Vercel (e.g. https://your-app.vercel.app) */
export function getAppBaseUrl() {
  const env = import.meta.env.VITE_APP_URL;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://appforge.app';
}

export function getUserInviteLink(uid) {
  const base = getAppBaseUrl();
  return uid ? `${base}/login?ref=${uid}` : `${base}/login`;
}

export function getUserAppShareLink(uid, appName) {
  const slug = (appName || 'app').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const base = getAppBaseUrl();
  return uid ? `${base}/app/${uid}/${slug}` : `${base}/app/${slug}`;
}
