// src/pages/LoginPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/lib/store';
import { Zap, ArrowLeft, Chrome } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail } = useAuth();
  const user        = useStore(s => s.user);
  const authLoading = useStore(s => s.authLoading);
  const navigate    = useNavigate();
  const location    = useLocation();
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [invite, setInvite]   = useState(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate('/app/generate', { replace: true });
  }, [user, authLoading]);

  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref');
    if (!ref) { setInvite(null); return; }
    try { sessionStorage.setItem('af_invite_ref', ref); } catch {}
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', ref));
        if (!snap.exists()) { setInvite(null); return; }
        const data = snap.data();
        setInvite({
          uid: ref,
          name: data.displayName || data.email?.split('@')[0] || 'A user',
          email: data.email || '',
          teamName: data.teamName || '',
        });
      } catch {
        setInvite(null);
      }
    })();
  }, [location.search]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/app/generate');
    } catch (e) {
      setError(e.code === 'auth/popup-closed-by-user'
        ? 'Sign-in popup was closed. Please try again.'
        : e.message || 'Sign-in failed. Check your Firebase config.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        const ref = new URLSearchParams(location.search).get('ref');
        await signUpWithEmail(email, password, { invitedBy: ref || undefined });
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/app/generate');
    } catch (e) {
      setError(e.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-900">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-indigo-600 p-12 text-white">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg">AppForge</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-snug mb-4">
            Generate production-grade app schemas<br />in under 60 seconds.
          </h2>
          <div className="space-y-3">
            {['6-stage AI pipeline — not a single prompt', 'Automatic validation & repair engine', 'DB + API + UI schemas, all consistent', '20-prompt benchmark framework'].map(t => (
              <div key={t} className="flex items-center gap-2.5 text-indigo-100">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-300 text-sm">© 2025 AppForge</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-8 transition-colors">
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">AppForge</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            {isSignUp ? 'Sign up to start building projects' : 'Sign in to access your app projects'}
          </p>

          {invite && (
            <div className="mb-5 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
              <p className="font-semibold">
                You were invited by {invite.name}{invite.teamName ? ` to join ${invite.teamName}` : ''}.
              </p>
              {invite.email && <p className="text-xs mt-0.5 opacity-80">{invite.email}</p>}
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="e.g. you@example.com"
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-450 transition-all placeholder:text-slate-450"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="e.g. ••••••••••"
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-450 transition-all placeholder:text-slate-450"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-60 uppercase tracking-wide"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative px-3 text-xs bg-white dark:bg-slate-900 text-slate-400 font-bold uppercase tracking-wider select-none">
              or
            </span>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              : <Chrome size={16} className="text-slate-500" />
            }
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 font-semibold">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(s => !s)}
              className="text-indigo-500 hover:underline font-bold"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
