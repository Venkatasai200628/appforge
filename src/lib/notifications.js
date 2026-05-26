// Browser notifications — welcome only once; event-based messages thereafter

const WELCOME_KEY = 'af_notif_welcome_sent';

export function isNotificationsEnabled() {
  try {
    return localStorage.getItem('af_notifs') === 'true';
  } catch {
    return false;
  }
}

export function canSendNotification() {
  return (
    isNotificationsEnabled() &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  );
}

const MESSAGES = {
  welcome: {
    title: 'AppForge',
    body: 'Notifications are on. You will be alerted when an app finishes building or is saved.',
  },
  generation_complete: {
    title: 'App build complete',
    body: (d) => (d.appName ? `"${d.appName}" is ready — open Projects to view it.` : 'Your app schema finished generating.'),
  },
  save_complete: {
    title: 'App saved',
    body: (d) => (d.appName ? `"${d.appName}" was saved to Projects.` : 'Your app was saved to Projects.'),
  },
  generation_error: {
    title: 'Build failed',
    body: (d) => d.message || 'Generation stopped or failed. Check the pipeline log.',
  },
  modification_complete: {
    title: 'App updated',
    body: (d) => (d.appName ? `"${d.appName}" was updated with your changes.` : 'Your app was updated.'),
  },
};

/** Send a typed notification. Welcome type only fires once per browser. */
export function sendAppNotification(type, details = {}) {
  if (!canSendNotification()) return false;

  if (type === 'welcome') {
    try {
      if (localStorage.getItem(WELCOME_KEY) === 'true') return false;
      localStorage.setItem(WELCOME_KEY, 'true');
    } catch {
      return false;
    }
  }

  const def = MESSAGES[type];
  if (!def) return false;

  const body = typeof def.body === 'function' ? def.body(details) : def.body;
  try {
    new Notification(def.title, { body, tag: `appforge-${type}` });
    return true;
  } catch {
    return false;
  }
}

export function clearWelcomeNotificationFlag() {
  try {
    localStorage.removeItem(WELCOME_KEY);
  } catch {}
}
