import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { useStore } from '@/lib/store';
import Layout           from '@/components/layout/Layout';
import LandingPage      from '@/pages/LandingPage';
import LoginPage        from '@/pages/LoginPage';
import GeneratePage     from '@/pages/GeneratePage';
import ProjectsPage     from '@/pages/ProjectsPage';
import WorkflowPage     from '@/pages/WorkflowPage';
import BenchmarkPage    from '@/pages/BenchmarkPage';
import SettingsPage     from '@/pages/SettingsPage';
import InvitePage       from '@/pages/InvitePage';
import InstructionsPage from '@/pages/InstructionsPage';

function ThemeApplier() {
  const theme = useStore(s => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.add('theme-transition');
  }, [theme]);
  return null;
}

function ProtectedRoute({ children }) {
  const user        = useStore(s => s.user);
  const authLoading = useStore(s => s.authLoading);
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ThemeApplier />
        <Routes>
          <Route path="/"      element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app"   element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index             element={<Navigate to="/app/generate" replace />} />
            <Route path="generate"     element={<GeneratePage />} />
            <Route path="projects"     element={<ProjectsPage />} />
            <Route path="workflow"     element={<WorkflowPage />} />
            <Route path="benchmark"    element={<BenchmarkPage />} />
            <Route path="settings"     element={<SettingsPage />} />
            <Route path="invite"       element={<InvitePage />} />
            <Route path="instructions" element={<InstructionsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
