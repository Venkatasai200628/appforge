// src/pages/SettingsPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import {
  Settings, Bell, BellOff, LogOut, Trash2,
  History, Eye, EyeOff, CheckCircle2, Key, ExternalLink,
  Clock, X, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { sendAppNotification, clearWelcomeNotificationFlag } from '@/lib/notifications';

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, desc, children, danger }) {
  return (
    <div className={clsx('flex items-center justify-between px-5 py-4 gap-4', danger && 'bg-red-50/50 dark:bg-red-900/10')}>
      <div className="flex items-center gap-3 min-w-0">
        <Icon size={15} className={clsx('flex-shrink-0', danger ? 'text-red-400' : 'text-slate-400')} />
        <div className="min-w-0">
          <p className={clsx('text-sm font-medium', danger ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300')}>{label}</p>
          {desc && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// Masked key field — never shows full key
function ApiKeyField({ value, onChange, placeholder = 'paste key here…' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const [saved, setSaved]     = useState(false);

  const provider = value?.startsWith('gsk_') ? 'Groq' : value?.startsWith('sk-ant') ? 'Anthropic' : value ? 'Unknown' : null;
  const masked = value
    ? value.slice(0, 8) + '•'.repeat(18) + value.slice(-4)
    : 'Not set';

  const handleSave = () => {
    if (draft.trim()) {
      onChange(draft.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setEditing(false);
    setDraft('');
  };

  if (editing) return (
    <div className="flex gap-2 items-center">
      <input
        type="password"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        placeholder={placeholder}
        autoFocus
        className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 w-52 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700">Save</button>
      <button onClick={() => { setEditing(false); setDraft(''); }} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={14} /></button>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      {provider && <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', provider === 'Groq' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : provider === 'Anthropic' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-slate-100 text-slate-500')}>{provider}</span>}
      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
        {saved ? <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> Saved</span> : masked}
      </span>
      <button onClick={() => setEditing(true)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
        {value ? 'Update' : 'Add key'}
      </button>
    </div>
  );
}

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (recommended, free)' },
  { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B (fastest, free)' },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B (free)' },
  { id: 'gemma2-9b-it',            label: 'Gemma 2 9B (free)' },
];

export default function SettingsPage() {
  const user                 = useStore(s => s.user);
  const theme                = useStore(s => s.theme);
  const toggleTheme          = useStore(s => s.toggleTheme);
  const anthropicKey         = useStore(s => s.anthropicKey);
  const setAnthropicKey      = useStore(s => s.setAnthropicKey);
  const groqModel            = useStore(s => s.groqModel);
  const setGroqModel         = useStore(s => s.setGroqModel);
  const notificationsEnabled = useStore(s => s.notificationsEnabled);
  const setNotifications     = useStore(s => s.setNotifications);
  const history              = useStore(s => s.history);
  const clearHistory         = useStore(s => s.clearHistory);
  const { logout, deleteAccount } = useAuth();
  const setApps                   = useStore(s => s.setApps);
  const navigate                  = useNavigate();

  const [showHistory, setShowHistory]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError]       = useState('');

  const handleNotifications = async () => {
    if (!notificationsEnabled) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotifications(true);
          sendAppNotification('welcome');
        } else {
          alert('Permission denied. Enable notifications in your browser settings.');
        }
      } catch {}
    } else {
      setNotifications(false);
      clearWelcomeNotificationFlag();
    }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setDeleteError('');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(deletePassword);
      setApps([]);
      navigate('/', { replace: true });
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg === 'REAUTH_PASSWORD_NEEDED') {
        setDeleteError('Enter your current password below, then click Yes, delete again.');
      } else if (msg.toLowerCase().includes('requires-recent-login') || msg.toLowerCase().includes('credential')) {
        setDeleteError('For security, sign out, sign in again, then delete your account.');
      } else if (msg.toLowerCase().includes('popup-closed')) {
        setDeleteError('Google sign-in was cancelled. Try again to confirm deletion.');
      } else {
        setDeleteError(msg);
      }
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const provider = anthropicKey?.startsWith('gsk_') ? 'groq' : anthropicKey?.startsWith('sk-ant') ? 'anthropic' : null;

  return (
    <div className="h-full overflow-auto bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 h-14 flex items-center px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Settings size={15} className="text-indigo-500 mr-2" />
        <h1 className="font-semibold text-base">Settings</h1>
      </div>

      <div className="max-w-xl mx-auto p-5 space-y-4">

        {/* Profile */}
        <Section title="Profile">
          <div className="px-5 py-4">
            {user ? (
              <div className="flex items-center gap-4">
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=6366f1&color=fff&size=80`}
                  alt="avatar"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-100 dark:ring-indigo-900"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{user.displayName || 'User'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Joined {user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Not signed in</p>
            )}
          </div>
        </Section>

        {/* API Key */}
        <Section title="AI API Key">
          <Row icon={Key} label="API Key" desc="Supports Groq (free) or Anthropic. Stored locally, never sent to our servers.">
            <ApiKeyField value={anthropicKey} onChange={setAnthropicKey} placeholder="gsk_... or sk-ant-..." />
          </Row>

          {/* Groq model selector — only shown if Groq key */}
          {provider === 'groq' && (
            <Row icon={ChevronDown} label="Groq Model" desc="Choose which free Groq model to use">
              <select
                value={groqModel}
                onChange={e => setGroqModel(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-52"
              >
                {GROQ_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Row>
          )}

          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50">
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <p>
                <span className="font-semibold text-orange-500">Groq (free):</span>{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-0.5">console.groq.com/keys <ExternalLink size={10} /></a>
                {' '}→ Create API Key → starts with <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">gsk_</code>
              </p>
              <p>
                <span className="font-semibold text-purple-500">Anthropic (paid):</span>{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-0.5">console.anthropic.com <ExternalLink size={10} /></a>
                {' '}→ starts with <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">sk-ant-</code>
              </p>
            </div>
          </div>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <Row icon={theme === 'dark' ? Eye : EyeOff} label="Theme" desc={`Currently ${theme} mode`}>
            <button onClick={toggleTheme} className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </Row>
          <Row icon={notificationsEnabled ? Bell : BellOff} label="Browser Notifications" desc={notificationsEnabled ? 'Enabled — notified when pipeline completes' : 'Disabled'}>
            <button onClick={handleNotifications}
              className={clsx('relative inline-flex h-5 w-9 rounded-full transition-colors duration-200',
                notificationsEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600')}>
              <span className={clsx('inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5',
                notificationsEnabled ? 'translate-x-4' : 'translate-x-0.5')} />
            </button>
          </Row>
        </Section>

        {/* History */}
        <Section title="Generation History">
          <Row icon={History} label="Session History" desc={`${history.length} generation(s) this session (resets on reload)`}>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowHistory(s => !s)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">{showHistory ? 'Hide' : 'View'}</button>
              {history.length > 0 && <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-600 font-medium">Clear</button>}
            </div>
          </Row>
          {showHistory && (
            <div className="px-5 pb-4 space-y-2">
              {history.length === 0
                ? <p className="text-xs text-slate-400 py-2">No history yet.</p>
                : history.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600">
                    <Clock size={11} className="text-slate-300 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{h.prompt}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(h.ts).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Account */}
        <Section title="Account">
          <Row icon={LogOut} label="Sign Out" desc="Sign out of your AppForge account">
            <button onClick={handleLogout} className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Sign out</button>
          </Row>
          <Row icon={Trash2} label="Delete Account" desc="Permanently delete your account and all saved projects" danger>
            {deleteConfirm ? (
              <div className="flex flex-col items-end gap-2 min-w-[200px]">
                <span className="text-xs text-red-500 font-medium">Are you sure? This cannot be undone.</span>
                {user?.providerData?.[0]?.providerId === 'password' && (
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800"
                  />
                )}
                {user?.providerData?.[0]?.providerId === 'google.com' && (
                  <span className="text-[10px] text-slate-500 text-right">Google will ask you to sign in again to confirm.</span>
                )}
                {deleteError && <p className="text-[10px] text-red-600 text-right max-w-[220px]">{deleteError}</p>}
                <div className="flex items-center gap-2">
                  <button onClick={handleDeleteAccount} disabled={deleting} className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-60">
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={cancelDelete} disabled={deleting} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={handleDeleteAccount} className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors">Delete</button>
            )}
          </Row>
        </Section>

      </div>
    </div>
  );
}
