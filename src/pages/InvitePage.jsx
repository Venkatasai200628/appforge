// src/pages/InvitePage.jsx
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Mail, Link2, Copy, Check, Send, Users } from 'lucide-react';
import { getUserInviteLink } from '@/lib/appUrl';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function InvitePage() {
  const user   = useStore(s => s.user);
  const [email, setEmail]  = useState('');
  const [emails, setEmails] = useState([]);
  const [sent, setSent]    = useState(false);
  const [copied, setCopied] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  const referralLink = getUserInviteLink(user?.uid);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setTeamName(snap.data().teamName || '');
      } catch {}
    })();
  }, [user?.uid]);

  const saveTeam = async () => {
    if (!user?.uid) return;
    setSavingTeam(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        teamName: teamName.trim(),
        displayName: user.displayName || user.email?.split('@')[0],
        email: user.email,
      }, { merge: true });
    } catch {
      alert('Could not save team name. Check Firebase rules for the users collection.');
    }
    setSavingTeam(false);
  };

  const handleAdd = () => {
    const trimmed = email.trim();
    if (trimmed && trimmed.includes('@') && !emails.includes(trimmed)) {
      setEmails(e => [...e, trimmed]);
      setEmail('');
    }
  };

  const handleSend = () => {
    // In production, this would call a Firebase Cloud Function or email service
    // For now, it opens the default mail client
    const subject = encodeURIComponent('Join me on AppForge — AI App Generator');
    const body = encodeURIComponent(
      `Hey! I've been using AppForge to generate app schemas with a 6-stage AI pipeline.\n\nCheck it out: ${referralLink}\n\n— ${user?.displayName || 'Your friend'}`
    );
    window.open(`mailto:${emails.join(',')}?subject=${subject}&body=${body}`);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-auto bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 h-14 flex items-center px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Mail size={15} className="text-indigo-500 mr-2" />
        <h1 className="font-semibold text-base">Invite Friends</h1>
      </div>

      <div className="max-w-xl mx-auto p-5 space-y-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Users size={22} className="text-white" />
          </div>
          <h2 className="text-lg font-bold mb-1">Invite your team</h2>
          <p className="text-indigo-200 text-sm">Share AppForge with teammates and collaborate on app schemas.</p>
        </div>

        {/* Share link */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Your invite link</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
              <Link2 size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-300 truncate font-mono">{referralLink}</span>
            </div>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors flex-shrink-0">
              {copied ? <><Check size={13} />Copied!</> : <><Copy size={13} />Copy</>}
            </button>
          </div>
        </div>

        {/* Team */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Team name</p>
          <div className="flex gap-2">
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="e.g. Sai Team"
              className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={saveTeam}
              disabled={savingTeam || !user}
              className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              {savingTeam ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Anyone who opens your invite link will see your profile and team name on the login page.
          </p>
        </div>

        {/* Email invite */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Invite by email</p>
          <div className="flex gap-2 mb-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="friend@example.com"
              className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button onClick={handleAdd} className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Add</button>
          </div>

          {emails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {emails.map(e => (
                <div key={e} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs">
                  {e}
                  <button onClick={() => setEmails(em => em.filter(x => x !== e))} className="text-indigo-300 hover:text-indigo-500">×</button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={emails.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sent ? <><Check size={14} />Invite sent!</> : <><Send size={14} />Send Invites ({emails.length})</>}
          </button>
        </div>

        <p className="text-xs text-center text-slate-400 dark:text-slate-500">
          Invites open your email client with a pre-filled message. No data is stored.
        </p>
      </div>
    </div>
  );
}
