// src/components/layout/Layout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import {
  Zap, FolderOpen, GitBranch, BarChart2, Settings,
  Moon, Sun, LogOut, Mail, BookOpen, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/app/generate',      icon: Zap,       label: 'Generate' },
  { to: '/app/projects',      icon: FolderOpen, label: 'Projects' },
  { to: '/app/workflow',      icon: GitBranch,  label: 'Workflow' },
  { to: '/app/benchmark',     icon: BarChart2,  label: 'Benchmark' },
  { to: '/app/instructions',  icon: BookOpen,   label: 'Instructions' },
  { to: '/app/invite',        icon: Mail,       label: 'Invite' },
];

export default function Layout() {
  const { logout }   = useAuth();
  const theme        = useStore(s => s.theme);
  const toggleTheme  = useStore(s => s.toggleTheme);
  const user         = useStore(s => s.user);
  const navigate     = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={clsx(
      'flex h-screen overflow-hidden',
      'bg-slate-50 dark:bg-slate-900',
      'text-slate-900 dark:text-slate-100'
    )}>
      {/* Sidebar */}
      <aside className={clsx(
        'w-52 flex-shrink-0 flex flex-col',
        'bg-white dark:bg-slate-900',
        'border-r border-slate-100 dark:border-slate-800'
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-base text-slate-900 dark:text-white">AppForge</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-100',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
          {/* Settings */}
          <NavLink
            to="/app/settings"
            className={({ isActive }) => clsx(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-100',
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
            )}
          >
            <Settings size={15} strokeWidth={2} />
            <span>Settings</span>
          </NavLink>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 font-medium transition-all duration-100"
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* User */}
          {user && (
            <div className="flex items-center gap-2 px-3 py-2 mt-1">
              <img
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=6366f1&color=fff&size=64`}
                alt="avatar"
                className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors flex-shrink-0"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
