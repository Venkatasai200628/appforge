// src/components/ui/JsonPreview.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { resolveTableKeyForPage } from '@/lib/mockData';
import { buildEmptyRecordsFromSchema, loadAppRecords, saveAppRecords } from '@/lib/appData';
import { getAppBaseUrl, getUserAppShareLink, getUserInviteLink } from '@/lib/appUrl';
import { useStore } from '@/lib/store';
import { 
  Database, Globe, Layout, Shield, Terminal, CheckCircle2, XCircle, 
  ChevronDown, ChevronRight, Settings, Plus, Trash2, 
  Users, Briefcase, DollarSign, TrendingUp, Sparkles, Send, Share2, 
  ExternalLink, Lock, Link2, 
  Maximize2, RefreshCw, Check, Copy, Pencil, LogIn, LogOut, CheckSquare, Search, FileText, AlertCircle, Zap, ShieldAlert, Chrome
} from 'lucide-react';
import clsx from 'clsx';

// Collapsible JSON node
function JsonNode({ data, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);

  if (data === null)            return <span className="text-slate-400">null</span>;
  if (typeof data === 'boolean') return <span className="text-amber-500">{String(data)}</span>;
  if (typeof data === 'number')  return <span className="text-blue-400">{data}</span>;
  if (typeof data === 'string')  return <span className="text-emerald-400">"{data}"</span>;

  if (Array.isArray(data)) {
    if (!data.length) return <span className="text-slate-500">[]</span>;
    return (
      <span>
        <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-slate-200">
          {open ? '[' : `[ …${data.length} ]`}
        </button>
        {open && (
          <>
            {data.map((item, i) => (
              <div key={i} style={{ paddingLeft: 16 }}>
                <JsonNode data={item} depth={depth + 1} />
                {i < data.length - 1 && <span className="text-slate-500">,</span>}
              </div>
            ))}
            <span>]</span>
          </>
        )}
      </span>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (!keys.length) return <span className="text-slate-500">{'{}'}</span>;
    return (
      <span>
        <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-slate-200">
          {open ? '{' : `{ …${keys.length} }`}
        </button>
        {open && (
          <>
            {keys.map((key, i) => (
              <div key={key} style={{ paddingLeft: 16 }}>
                <span className="text-violet-400">"{key}"</span>
                <span className="text-slate-500">: </span>
                <JsonNode data={data[key]} depth={depth + 1} />
                {i < keys.length - 1 && <span className="text-slate-500">,</span>}
              </div>
            ))}
            <span>{'}'}</span>
          </>
        )}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

// Visual App Preview
function AppPreview({ output, onModifyApp, onBackToGenerate, isExampleBlueprint = false }) {
  const intent = output?.intent;
  const schemas = output?.schemas;
  const firebaseUser = useStore(s => s.user);
  const registeredUsers = useStore(s => s.registeredUsers);
  const appInstanceId = output?.meta?.generated_at || schemas?.ui_schema?.design_system?.app_name || 'app';
  
  // App variables
  const primaryColor = schemas?.ui_schema?.design_system?.primary_color || '#6366f1';
  const rawAppName = schemas?.ui_schema?.design_system?.app_name || intent?.app_name || 'AppForge Studio';
  const rawDescription = intent?.description || 'A premium generated custom dashboard application.';
  const appType = intent?.app_type || 'Custom';
  const authProviders = schemas?.auth_schema?.providers || ['email', 'google'];
  const hasGoogleAuth = authProviders.includes('google');
  const hasEmailAuth = authProviders.includes('email');
  
  // Custom Dynamic State
  const [workspaceTab, setWorkspaceTab] = useState('preview'); // 'preview' or 'dashboard'
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [requireLogin, setRequireLogin] = useState(true);
  const [visibility, setVisibility] = useState('Public');
  const [adminActiveTab, setAdminActiveTab] = useState('Overview');
  const [chatPrompt, setChatPrompt] = useState('');
  const [connectedIntegrations, setConnectedIntegrations] = useState({ slack: false, stripe: false, zapier: false, sheets: false });
  const [integrationAccounts, setIntegrationAccounts] = useState({});
  const [connectModal, setConnectModal] = useState(null);
  const [connectForm, setConnectForm] = useState({ email: '', password: '', apiKey: '' });
  const [securityControls, setSecurityControls] = useState({ ssl: true, twoFactor: false, intrusion: true });
  const [appDeployed, setAppDeployed] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [twoFactorModal, setTwoFactorModal] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  
  // Real Mock Login and Editable Name states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [appName, setAppName] = useState(rawAppName);
  const [appDescription, setAppDescription] = useState(rawDescription);
  const [editingName, setEditingName] = useState(false);
  const [tempAppName, setTempAppName] = useState(rawAppName);
  
  const [isEnlarged, setIsEnlarged] = useState(false);
  
  // CRM Deals Toggle: 'kanban' or 'list'
  const [crmDealsView, setCrmDealsView] = useState('kanban');
  
  const initRecords = () => {
    // Never seed sample rows — only show what the user creates.
    const loaded = loadAppRecords(appInstanceId, schemas?.db_schema, false);
    if (loaded) return loaded;
    return buildEmptyRecordsFromSchema(schemas?.db_schema);
  };

  const [dbRecords, setDbRecords] = useState(initRecords);

  const [selectedExplorerTable, setSelectedExplorerTable] = useState(() => Object.keys(dbRecords || {})[0] || 'items');

  useEffect(() => {
    if (dbRecords && !Object.keys(dbRecords).includes(selectedExplorerTable)) {
      setSelectedExplorerTable(Object.keys(dbRecords)[0] || 'items');
    }
  }, [dbRecords, selectedExplorerTable]);

  const [searchTerm, setSearchTerm] = useState('');
  const loginSectionRef = useRef(null);
  const adminPanelRef = useRef(null);
  
  // Form add-record state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFields, setNewFields] = useState({});

  const platformUsers = useMemo(() => {
    const list = (registeredUsers || []).map(u => ({
      id: u.id,
      name: u.name || u.email?.split('@')[0] || 'User',
      email: u.email || '',
      role: u.role === 'admin' ? 'Admin' : 'Member',
      status: u.status || 'Active',
    }));
    if (firebaseUser && !list.some(u => u.id === firebaseUser.uid)) {
      list.unshift({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'You',
        email: firebaseUser.email || '',
        role: 'Owner',
        status: 'Active',
      });
    }
    return list;
  }, [registeredUsers, firebaseUser]);

  const dashboardUsers = platformUsers;

  // Sync emails automatically when rawAppName updates
  useEffect(() => {
    setLoginEmail(`admin@${rawAppName.toLowerCase().replace(/\s+/g, '')}.com`);
    setLoginPassword('password');
  }, [rawAppName]);

  const userInviteLink = getUserInviteLink(firebaseUser?.uid);
  const appShareLink = getUserAppShareLink(firebaseUser?.uid, appName);

  useEffect(() => {
    setDbRecords(initRecords());
    setAppName(rawAppName);
    setAppDescription(rawDescription);
    setActivePageIndex(0);
    setIsLoggedIn(false);
    setAdminActiveTab('Overview');
    setWorkspaceTab('preview');
    setSearchTerm('');
    setConnectedIntegrations({ slack: false, stripe: false, zapier: false, sheets: false });
    setIntegrationAccounts({});
  }, [output?.meta?.generated_at, rawAppName, isExampleBlueprint]);

  useEffect(() => {
    saveAppRecords(appInstanceId, dbRecords);
  }, [dbRecords, appInstanceId]);

  useEffect(() => {
    if (workspaceTab === 'preview' && requireLogin && !isLoggedIn) {
      loginSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [workspaceTab, requireLogin, isLoggedIn]);

  useEffect(() => {
    adminPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [adminActiveTab, workspaceTab]);

  const pageList = schemas?.ui_schema?.pages || [{ name: 'Dashboard', route: '/' }];
  const appPages = pageList.filter(p => !/login/i.test(p.name));
  const activePage = appPages[activePageIndex] || appPages[0];
  const pageComponents = activePage?.components || [];
  const statsComponent = pageComponents.find(c => c.type === 'stats');
  const isSettingsPage = /setting/i.test(activePage?.name || '') || pageComponents.some(c => c.type === 'settings');
  const pageNameLower = (activePage?.name || '').toLowerCase();
  const isAdminAppPage = pageNameLower === 'admin' || activePage?.route === '/admin';
  const isProgressPage = pageNameLower.includes('progress');
  const isDashboardLayout = !isSettingsPage && !isAdminAppPage && !isProgressPage && (
    /dashboard|home|overview/i.test(pageNameLower) ||
    (activePageIndex === 0 && !isAdminAppPage && !isProgressPage)
  ) && pageComponents.some(c => c.type === 'stats' || c.type === 'chart');

  // Auto-switch Deals vs Kanban view based on active page name
  useEffect(() => {
    if (activePage) {
      const pageName = activePage.name.toLowerCase();
      if (pageName.includes('pipeline') || pageName.includes('stage')) {
        setCrmDealsView('kanban');
      } else if (pageName.includes('deal')) {
        setCrmDealsView('list');
      }
    }
  }, [activePageIndex, activePage]);
  
  const activeTableKey = isSettingsPage
    ? null
    : resolveTableKeyForPage(activePage, dbRecords, Object.keys(dbRecords)[0] || 'items');
  const activeTableSchema = schemas?.db_schema?.tables?.find(t => t.name === activeTableKey);
  const activeColumns = activeTableSchema?.fields || [];
  const showKanban = activeTableKey === 'deals' && (
    pageComponents.some(c => c.type === 'kanban') || crmDealsView === 'kanban'
  );

  // Handle renaming of Mock App Name
  const saveAppName = () => {
    if (tempAppName.trim()) {
      setAppName(tempAppName);
      setEditingName(false);
    }
  };

  // Log in to Preview Dashboard
  const handleMockLogin = (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter mock credentials');
      return;
    }
    setIsLoggedIn(true);
    setLoginError('');
    setActivePageIndex(0);
  };

  // Handle iterative chat feedback
  const handleSendPrompt = () => {
    if (chatPrompt.trim() && onModifyApp) {
      onModifyApp(chatPrompt.trim());
      setChatPrompt('');
    }
  };

  // Handle copy sharing link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(appShareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Add record dynamic form submit
  const handleAddRecord = (e) => {
    e.preventDefault();
    const newRow = {
      id: 'row_' + Math.random().toString(36).slice(2, 7),
      ...newFields
    };
    if (activeTableKey === 'habits') {
      if (newRow.completed_today === undefined) newRow.completed_today = false;
      if (newRow.streak === undefined) newRow.streak = 0;
      if (!newRow.frequency) newRow.frequency = 'Daily';
    }
    if (activeTableKey === 'deals' && !newRow.stage) newRow.stage = 'Lead';
    if (activeTableKey === 'customers' && !newRow.status) newRow.status = 'Active';
    if (!newRow.created_at && !newRow.date) {
      newRow.date = new Date().toISOString().split('T')[0];
      newRow.created_at = new Date().toISOString().split('T')[0];
    }
    setDbRecords(prev => ({
      ...prev,
      [activeTableKey]: [newRow, ...(prev[activeTableKey] || [])]
    }));
    setShowAddModal(false);
    setNewFields({});
  };

  // Delete dynamic record row
  const handleDeleteRecord = (id) => {
    setDbRecords(prev => ({
      ...prev,
      [activeTableKey]: prev[activeTableKey].filter(row => row.id !== id)
    }));
  };

  const handleConnectIntegration = (e) => {
    e.preventDefault();
    if (!connectModal) return;
    if (!connectForm.email.trim() || !connectForm.password.trim()) {
      alert('Enter the integration account email and password (or API secret) to connect.');
      return;
    }
    if (connectModal.id === 'stripe' && !connectForm.apiKey.trim()) {
      alert('Stripe requires an API key — paste your test secret key (sk_test_...).');
      return;
    }
    setConnectedIntegrations(prev => ({ ...prev, [connectModal.id]: true }));
    setIntegrationAccounts(prev => ({
      ...prev,
      [connectModal.id]: { email: connectForm.email.trim(), masked: connectForm.email.slice(0, 3) + '••••' },
    }));
    setConnectModal(null);
    setConnectForm({ email: '', password: '', apiKey: '' });
  };

  const handleDisconnectIntegration = (id) => {
    setConnectedIntegrations(prev => ({ ...prev, [id]: false }));
    setIntegrationAccounts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setSettingsMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSettingsMessage('Passwords do not match.');
      return;
    }
    setSettingsMessage('Password updated successfully.');
    setPasswordModal(false);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSettingsMessage(''), 3000);
  };

  const handleEnable2FASubmit = (e) => {
    e.preventDefault();
    if (twoFactorCode.trim().length !== 6) {
      setSettingsMessage('Enter the 6-digit verification code.');
      return;
    }
    setTwoFactorEnabled(true);
    setSecurityControls(prev => ({ ...prev, twoFactor: true }));
    setSettingsMessage('Two-factor authentication enabled.');
    setTwoFactorModal(false);
    setTwoFactorCode('');
    setTimeout(() => setSettingsMessage(''), 3000);
  };

  const activeCustomerCount = dbRecords.customers?.length ?? dbRecords.habits?.length ?? dbRecords.appointment_scheduling?.length ?? 0;
  const activeRecordCount = dbRecords.deals?.length ?? dbRecords.medical_records?.length ?? dbRecords.tasks?.length ?? dbRecords.habit_logs?.length ?? 0;
  const activeBillingCount = dbRecords.billing || dbRecords.orders || [];
  const calculatedRevenueValue = activeBillingCount.reduce((sum, item) => sum + parseFloat(item.amount || item.total || 0), 0);
  const revenueDisplay = calculatedRevenueValue > 0 ? `$${calculatedRevenueValue.toLocaleString()}` : '0';
  const pipelineValueDisplay = dbRecords.deals?.length
    ? `$${dbRecords.deals.reduce((sum, item) => sum + parseFloat(item.value || 0), 0).toLocaleString()}`
    : '0';
  const habitsCompletedToday = (dbRecords.habits || []).filter(h => h.completed_today).length;

  return (
    <div className={clsx(
      'flex flex-col bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300',
      isEnlarged 
        ? 'fixed inset-4 z-50 rounded-2xl overflow-hidden' 
        : 'h-full rounded-2xl overflow-hidden'
    )}>
      
      {/* 1. Viewport Browser Header Mockup */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 select-none">
        {/* Left: Window Dots */}
        <div className="flex items-center gap-1.5 w-24">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>

        {/* Center: Tabs switcher (PREVIEW vs ADMIN PANEL) */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
          <button
            onClick={() => setWorkspaceTab('preview')}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200',
              workspaceTab === 'preview'
                ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Layout size={12} />
            Preview App
          </button>
          <button
            onClick={() => setWorkspaceTab('dashboard')}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200',
              workspaceTab === 'dashboard'
                ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Settings size={12} />
            Dashboard
          </button>
        </div>

        {/* Right: Enlarge control */}
        <div className="flex items-center gap-3 w-28 justify-end">
          <button 
            onClick={() => setIsEnlarged(e => !e)}
            title={isEnlarged ? "Exit Fullscreen" : "Enlarge Workspace Preview"}
            className={clsx('p-1 rounded transition-colors', isEnlarged ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-600')}
          >
            <Maximize2 size={13} className="cursor-pointer" />
          </button>
        </div>
      </div>

      {/* 2. Mock URL Bar Address Strip */}
      <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/80 flex-shrink-0">
        <div className="flex items-center gap-1 text-slate-400">
          <ChevronRight size={14} className="rotate-180" />
          <ChevronRight size={14} />
          <RefreshCw size={11} className="ml-1 cursor-pointer hover:text-slate-600" />
        </div>
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 flex items-center gap-2 text-xs font-medium font-mono text-slate-500 dark:text-slate-400">
          <Lock size={10} className="text-emerald-500 flex-shrink-0" />
          <span className="truncate">
            {getAppBaseUrl().replace(/^https?:\/\//, '')}{workspaceTab === 'dashboard' ? `/admin/${adminActiveTab.toLowerCase()}` : !isLoggedIn && requireLogin ? '/login' : activePage?.route || '/'}
          </span>
        </div>
      </div>

      {/* 3. Main Viewport App Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* ==================== A: PREVIEW TAB (device frame applies here only) ==================== */}
        {workspaceTab === 'preview' && (
          <div className="flex-1 min-h-0 overflow-auto bg-slate-100 dark:bg-slate-900 flex justify-center p-3">
            <div
              className={clsx(
                'bg-white dark:bg-slate-950 flex flex-col border border-slate-200/60 dark:border-slate-800/80 shadow-md transition-all duration-300 rounded-xl overflow-hidden min-h-[min(100%,640px)]',
                'w-full max-w-full min-h-[560px]'
              )}
            >
              {/* Mock Login Page with beautiful design */}
              {requireLogin && !isLoggedIn ? (
                <div ref={loginSectionRef} className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-900 flex items-start justify-center p-6 sm:p-8 select-none animate-in fade-in duration-200">
                  <div className="w-full max-w-sm bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-6">
                    {/* Brand Header */}
                    <div className="text-center space-y-2">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md mx-auto"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)` }}
                      >
                        {appName[0]}
                      </div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Sign In to {appName}</h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Security Gate active. Enter mock credentials below.</p>
                    </div>

                    {/* Form */}
                    {hasEmailAuth && (
                    <form onSubmit={handleMockLogin} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-450 uppercase">Email Address</label>
                        <input 
                          type="email" 
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-450 uppercase">Password</label>
                        <input 
                          type="password" 
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          required
                        />
                      </div>

                      {loginError && <p className="text-[10px] font-semibold text-red-500">{loginError}</p>}

                      <button 
                        type="submit" 
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm tracking-wide uppercase transition-colors"
                      >
                        Sign in with Email
                      </button>
                    </form>
                    )}

                    {hasGoogleAuth && (
                      <>
                        {hasEmailAuth && (
                          <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
                            <span className="relative px-2 text-[10px] bg-white dark:bg-slate-850 text-slate-400 font-bold uppercase">or</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => { setIsLoggedIn(true); setLoginError(''); setActivePageIndex(0); }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                        >
                          <Chrome size={14} /> Continue with Google
                        </button>
                      </>
                    )}

                    {hasEmailAuth && (
                      <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-center">
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-450 font-semibold leading-normal">
                          Preview credentials: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[9px]">{loginEmail}</code> / <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[9px]">password</code>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Authenticated Application UI Panel */
                <div className="flex-1 flex overflow-hidden min-h-0">
                  {/* Left navigation sidebar */}
                  <aside className="w-52 bg-slate-50 dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between flex-shrink-0 select-none">
                    <div className="flex-1 flex flex-col">
                      {/* Brand */}
                      <div 
                        onClick={() => onBackToGenerate?.()} 
                        className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5 cursor-pointer hover:bg-slate-105 dark:hover:bg-slate-800 transition-colors"
                        title="Back to Generate — create another app"
                      >
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md"
                          style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)` }}
                        >
                          {appName[0]}
                        </div>
                        <span className="font-bold text-sm text-slate-800 dark:text-white truncate">{appName}</span>
                      </div>
                      
                      {/* Page items */}
                      <nav className="p-2 space-y-0.5">
                        {appPages.map((p, i) => (
                          <button
                            key={p.name}
                            onClick={() => {
                              setActivePageIndex(i);
                              setSearchTerm('');
                            }}
                            className={clsx(
                              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all duration-200',
                              activePageIndex === i
                                ? 'bg-slate-200/60 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200'
                            )}
                          >
                            {/setting/i.test(p.name) ? (
                              <Settings size={13} style={{ color: activePageIndex === i ? primaryColor : undefined }} />
                            ) : (
                              <Layout size={13} style={{ color: activePageIndex === i ? primaryColor : undefined }} />
                            )}
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Sidebar bottom (Developer logout) */}
                    <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => setIsLoggedIn(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                      >
                        <LogOut size={13} />
                        Log Out (Mock Mode)
                      </button>
                    </div>
                  </aside>

                  {/* Main Content Pane */}
                  <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-955 flex flex-col">
                    {/* Page header banner */}
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between flex-shrink-0 select-none">
                      <div>
                        <h1 className="font-bold text-base text-slate-850 dark:text-white">{activePage?.name || 'Dashboard'}</h1>
                        <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">Customized layouts for {appName}</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-450 border border-slate-200/50 dark:border-slate-700/50">
                        Path: {activePage?.route || '/'}
                      </span>
                    </div>

                    {/* Dynamic Page Views rendering */}
                    <div className="flex-1 p-5 space-y-5 overflow-auto">
                      
                      {isSettingsPage && (
                        <div className="space-y-5">
                          {(pageComponents.find(c => c.type === 'settings')?.sections || [
                            { title: 'Profile', description: 'Display name, email, and role' },
                            { title: 'Notifications', description: 'Email and push alert preferences' },
                            { title: 'Security', description: 'Password and two-factor authentication' },
                          ]).map((section, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm space-y-3">
                              <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">{section.title}</h3>
                              <p className="text-[11px] text-slate-450 dark:text-slate-500">{section.description}</p>
                              {section.title === 'Profile' && (
                                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Display name</label>
                                    <input defaultValue={appName} className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                                    <input defaultValue={loginEmail} className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                                  </div>
                                </div>
                              )}
                              {section.title === 'Notifications' && (
                                <div className="space-y-2">
                                  {['Email digests', 'New record alerts', 'Weekly summary'].map(label => (
                                    <label key={label} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-350">
                                      <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                                      {label}
                                    </label>
                                  ))}
                                </div>
                              )}
                              {section.title === 'Security' && (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => { setPasswordModal(true); setSettingsMessage(''); }} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-bold">Change password</button>
                                    <button type="button" onClick={() => { setTwoFactorModal(true); setSettingsMessage(''); }} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                      {twoFactorEnabled ? '2FA enabled' : 'Enable 2FA'}
                                    </button>
                                  </div>
                                  {settingsMessage && <p className="text-[10px] font-semibold text-emerald-600">{settingsMessage}</p>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {isAdminAppPage && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Platform users (admin)</h3>
                            <p className="text-[11px] text-slate-450 mt-0.5">Only accounts that have signed in to AppForge</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold">
                                  <th className="px-4 py-2.5">Name</th>
                                  <th className="px-4 py-2.5">Email</th>
                                  <th className="px-4 py-2.5">Role</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dashboardUsers.map(u => (
                                  <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{u.name}</td>
                                    <td className="px-4 py-3 font-mono text-[11px]">{u.email}</td>
                                    <td className="px-4 py-3 text-indigo-500 font-bold">{u.role}</td>
                                  </tr>
                                ))}
                                {dashboardUsers.length === 0 && (
                                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No data present</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {isProgressPage && (
                        <div className="space-y-4">
                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm">
                            <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
                              {pageComponents.find(c => c.type === 'chart')?.title || 'Progress overview'}
                            </h3>
                            <div className="h-44 w-full">
                              <svg className="w-full h-full" viewBox="0 0 500 150">
                                <path d="M0 130 C 80 90, 160 110, 250 70 C 340 40, 420 55, 500 30" fill="none" stroke={primaryColor} strokeWidth="2.5" />
                              </svg>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2">Charts update when you log habit or health check completions.</p>
                          </div>
                        </div>
                      )}

                      {/* Dashboard / analytics layout (from schema stats when available) */}
                      {!isSettingsPage && !isAdminAppPage && !isProgressPage && isDashboardLayout && (
                        <>
                          {/* Dynamic Metric Cards Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 select-none">
                            {(statsComponent?.metrics || [
                              { label: dbRecords.habits ? 'TOTAL HABITS' : appType.includes('HEALTH') ? 'TOTAL APPOINTMENTS' : 'TOTAL RECORDS', value: String(activeCustomerCount), change: '', icon: 'users' },
                              { label: dbRecords.habits ? 'COMPLETED TODAY' : appType.includes('HEALTH') ? 'ACTIVE CASES' : 'ACTIVE RECORDS', value: dbRecords.habits ? String(habitsCompletedToday) : String(activeRecordCount), change: '', icon: 'briefcase' },
                              { label: 'REVENUE', value: revenueDisplay, change: '', icon: 'dollar-sign' },
                              { label: appType.includes('CRM') ? 'PIPELINE VALUE' : 'THIS WEEK', value: appType.includes('CRM') ? pipelineValueDisplay : String(activeRecordCount), icon: 'trending-up' },
                            ]).map((item, idx) => {
                              const iconMap = { users: Users, briefcase: Briefcase, 'dollar-sign': DollarSign, 'trending-up': TrendingUp, activity: TrendingUp, zap: Zap, 'file-text': FileText, 'alert-circle': AlertCircle };
                              const MetricIcon = iconMap[item.icon] || Users;
                              const colorClasses = ['text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20', 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'];
                              return (
                                <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group">
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase leading-none">{item.label}</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white mt-2 group-hover:scale-105 transition-transform origin-left">{item.value}</p>
                                    {item.change && <p className="text-[10px] font-bold text-emerald-500 mt-0.5">{item.change}</p>}
                                  </div>
                                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colorClasses[idx % colorClasses.length])}>
                                    <MetricIcon size={18} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Analytic Sales Canvas Line Chart */}
                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4 select-none">
                              <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Historical Analytics Timeline</h3>
                              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">+24% operational speed increase</span>
                            </div>
                            
                            {/* Premium SVG Line graph */}
                            <div className="h-44 w-full relative">
                              <svg className="w-full h-full" viewBox="0 0 500 150">
                                <defs>
                                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={primaryColor} stopOpacity="0.25"/>
                                    <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0"/>
                                  </linearGradient>
                                </defs>
                                <line x1="0" y1="20" x2="500" y2="20" stroke="#f1f5f9" className="dark:stroke-slate-800" strokeWidth="1" />
                                <line x1="0" y1="65" x2="500" y2="65" stroke="#f1f5f9" className="dark:stroke-slate-800" strokeWidth="1" />
                                <line x1="0" y1="110" x2="500" y2="110" stroke="#f1f5f9" className="dark:stroke-slate-800" strokeWidth="1" />
                                
                                <path 
                                  d="M0 130 C 50 115, 100 100, 150 65 C 200 45, 250 80, 300 50 C 350 15, 400 35, 500 20 L 500 150 L 0 150 Z" 
                                  fill="url(#chartGrad)" 
                                />
                                <path 
                                  d="M0 130 C 50 115, 100 100, 150 65 C 200 45, 250 80, 300 50 C 350 15, 400 35, 500 20" 
                                  fill="none" 
                                  stroke={primaryColor} 
                                  strokeWidth="2.5" 
                              />
                              
                              <circle cx="150" cy="65" r="4.5" fill={primaryColor} stroke="#fff" strokeWidth="1.5" className="animate-pulse" />
                              <circle cx="300" cy="50" r="4.5" fill={primaryColor} stroke="#fff" strokeWidth="1.5" />
                              <circle cx="500" cy="20" r="4.5" fill={primaryColor} stroke="#fff" strokeWidth="1.5" />
                            </svg>
                            
                            <div className="absolute top-10 left-[135px] bg-slate-900 text-white rounded-lg px-2 py-0.5 text-[9px] font-bold shadow-md border border-slate-700 select-none animate-bounce">
                              Active Index Peak
                            </div>
                          </div>
                        </div>

                        {/* Recent Activity Live Datatable */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between select-none">
                            <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Live System Logs</h3>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Real-time DB Active</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 select-none">
                                  <th className="px-4 py-2.5">Identifier</th>
                                  <th className="px-4 py-2.5">Summary Details</th>
                                  <th className="px-4 py-2.5">Timestamp</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(dbRecords[activeTableKey] || []).slice(0, 3).map((row, idx) => (
                                  <tr key={idx} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 text-slate-655 dark:text-slate-350 font-medium">
                                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{row.id || 'id_val'}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">
                                      {row.name || row.title || row.patient || row.customer_name || 'System Record Listing'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{row.date || row.created_at || 'Today'}</td>
                                  </tr>
                                ))}
                                {(dbRecords[activeTableKey] || []).length === 0 && (
                                  <tr>
                                    <td colSpan="3" className="px-4 py-8 text-center text-slate-400">No logs seeded yet. Try adding a record!</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Entity pages: tables, kanban, CRUD */}
                    {!isDashboardLayout && !isSettingsPage && !isAdminAppPage && !isProgressPage && activeTableKey && (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1">
                        
                        {/* Table controls strip */}
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between select-none bg-slate-50/20 dark:bg-slate-900/40">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder={`Search database...`}
                                className="pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 w-44"
                              />
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400 font-bold font-mono">
                              {(dbRecords[activeTableKey] || []).length} items
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* CRM Toggle List vs Kanban Viewports directly addressing "deal list and pipeline stages look same" */}
                            {activeTableKey === 'deals' && (
                              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 mr-2">
                                <button 
                                  onClick={() => setCrmDealsView('kanban')}
                                  className={clsx('px-2 py-1 rounded text-[10px] font-bold uppercase transition-all', crmDealsView === 'kanban' ? 'bg-white dark:bg-slate-600 text-indigo-500 shadow-xs' : 'text-slate-400 hover:text-slate-700')}
                                >
                                  Pipeline Kanban
                                </button>
                                <button 
                                  onClick={() => setCrmDealsView('list')}
                                  className={clsx('px-2 py-1 rounded text-[10px] font-bold uppercase transition-all', crmDealsView === 'list' ? 'bg-white dark:bg-slate-600 text-indigo-500 shadow-xs' : 'text-slate-400 hover:text-slate-700')}
                                >
                                  Deals List
                                </button>
                              </div>
                            )}

                            <button 
                              onClick={() => setShowAddModal(true)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[11px] transition-all shadow-sm"
                            >
                              <Plus size={11} /> Add New Record
                            </button>
                          </div>
                        </div>

                        {/* CRM Pipeline Kanban viewport logic */}
                        {showKanban ? (
                          <div className="p-4 bg-slate-50/40 dark:bg-slate-950/20 overflow-x-auto">
                            <div className="grid grid-cols-4 gap-3 min-w-[680px]">
                              {[
                                { title: 'Lead / Inbound', color: 'border-l-indigo-400', stage: 'Lead' },
                                { title: 'Contacted', color: 'border-l-blue-400', stage: 'Contacted' },
                                { title: 'Proposal Sent', color: 'border-l-purple-400', stage: 'Proposal' },
                                { title: 'Negotiation / Closing', color: 'border-l-amber-400', stage: 'Negotiation' }
                              ].map((col, idx) => {
                                const colDeals = (dbRecords.deals || []).filter(d => 
                                  d.stage?.toLowerCase().includes(col.stage.toLowerCase())
                                );
                                return (
                                  <div key={idx} className="bg-slate-100 dark:bg-slate-900 rounded-xl p-3 space-y-2 border border-slate-200/30 dark:border-slate-800 min-h-[260px] flex flex-col justify-start">
                                    <div className="flex items-center justify-between border-l-2 pl-2 mb-2 select-none border-indigo-500 leading-tight">
                                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{col.title}</p>
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-450">{colDeals.length}</span>
                                    </div>
                                    <div className="space-y-2 overflow-y-auto flex-1 max-h-[220px]">
                                      {colDeals.map((c) => (
                                        <div key={c.id} className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200/60 dark:border-slate-700/60 shadow-xs space-y-1 hover:shadow-sm transition-all group relative">
                                          <p className="text-[11px] font-bold text-slate-850 dark:text-slate-150 leading-snug group-hover:text-indigo-500 transition-colors pr-4">{c.title}</p>
                                          <p className="text-[10px] text-slate-450 font-medium">{c.customer}</p>
                                          <p className="text-[10px] font-black text-indigo-500">${parseFloat(c.value).toLocaleString()}</p>
                                          <button 
                                            onClick={() => handleDeleteRecord(c.id)}
                                            className="absolute right-1 bottom-1 text-slate-350 hover:text-red-500 opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                                            title="Delete Deal Card"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </div>
                                      ))}
                                      {colDeals.length === 0 && (
                                        <div className="text-[10px] text-slate-400 text-center py-6 border border-dashed border-slate-200 dark:border-slate-850 rounded-lg">Empty Column</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* standard Registry list view */
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 select-none">
                                  <th className="px-4 py-2.5">Identifier</th>
                                  {activeColumns.filter(c => c.name !== 'id').map(col => (
                                    <th key={col.name} className="px-4 py-2.5 capitalize">{col.name.replace(/_/g, ' ')}</th>
                                  ))}
                                  <th className="px-4 py-2.5 text-right">Database Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(dbRecords[activeTableKey] || [])
                                  .filter(row => {
                                    if (!searchTerm.trim()) return true;
                                    const search = searchTerm.toLowerCase();
                                    return Object.values(row).some(val => 
                                      String(val).toLowerCase().includes(search)
                                    );
                                  })
                                  .map((row, idx) => (
                                    <tr key={row.id || idx} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 text-slate-655 dark:text-slate-350 font-medium animate-in slide-in-from-left-1 duration-150">
                                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{row.id}</td>
                                      
                                      {activeColumns.filter(c => c.name !== 'id').map(col => {
                                        const val = row[col.name];
                                        const isBool = (col.type || '').toLowerCase().includes('bool') || typeof val === 'boolean';
                                        
                                        return (
                                          <td key={col.name} className="px-4 py-3">
                                            {isBool ? (
                                              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                                                val ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-150 text-slate-500'
                                              )}>
                                                {val ? 'Yes' : 'No'}
                                              </span>
                                            ) : col.name.includes('status') ? (
                                              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                                                val === 'Confirmed' || val === 'Paid' || val === 'Active' || val === 'Completed' || val === 'Won' ? 'bg-emerald-100 text-emerald-700' :
                                                val === 'Pending' || val === 'Contacted' || val === 'Proposal' || val === 'Lead' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-500'
                                              )}>
                                                {String(val || '')}
                                              </span>
                                            ) : col.name.includes('price') || col.name.includes('amount') || col.name.includes('total') || col.name.includes('value') ? (
                                              <span className="font-bold text-slate-800 dark:text-white">
                                                {typeof val === 'number' || !isNaN(Number(val)) ? `$${Number(val).toLocaleString()}` : String(val || '')}
                                              </span>
                                            ) : (
                                              <span className={clsx(
                                                col.name === 'name' || col.name === 'title' || col.name === 'patient' ? 'font-semibold text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-355'
                                              )}>
                                                {String(val !== undefined ? val : '')}
                                              </span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      
                                      {/* Action button: Delete Record Row */}
                                      <td className="px-4 py-3 text-right">
                                        <button 
                                          onClick={() => handleDeleteRecord(row.id)}
                                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                                          title="Delete Record Row"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                {(dbRecords[activeTableKey] || []).length === 0 && (
                                  <tr>
                                    <td colSpan={activeColumns.length || 3} className="px-4 py-8 text-center text-slate-400 select-none">
                                      No data present. Click **Add New Record** above to seed this table!
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                </main>
              </div>
            )}
            </div>
          </div>
        )}

        {/* ==================== B: ADMIN PANEL (full workspace — not inside device frame) ==================== */}
        {workspaceTab === 'dashboard' && (
          <div className="flex-1 min-h-[480px] flex overflow-hidden bg-white dark:bg-slate-950">
            {/* Admin Center Left Sidebar */}
            <aside className="w-48 bg-slate-50 dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col flex-shrink-0 select-none">
              <nav className="flex-1 p-3 space-y-0.5">
                {[
                  { name: 'Overview', icon: Layout },
                  { name: 'Users', icon: Users },
                  { name: 'Data', icon: Database },
                  { name: 'Settings', icon: Settings },
                  { name: 'Domains', icon: Globe },
                  { name: 'Integrations', icon: Link2 },
                  { name: 'Security', icon: Shield },
                  { name: 'Code', icon: Terminal },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = adminActiveTab === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setAdminActiveTab(item.name)}
                      className={clsx(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all duration-200',
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200'
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon size={13} style={{ color: isActive ? primaryColor : undefined }} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-650 dark:text-indigo-400 font-extrabold text-[8px] uppercase tracking-wide">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Admin Center Main Panel (Stateful tabs direct response to user complaint!) */}
            <main ref={adminPanelRef} className="flex-1 overflow-auto bg-slate-50/40 dark:bg-slate-955 p-5 min-h-0">
              
              {/* STATEFUL TAB 1: OVERVIEW PAGE */}
              {adminActiveTab === 'Overview' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* App Overview Top Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm flex items-start gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold flex-shrink-0 shadow-lg select-none"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)` }}
                    >
                      {appName[0]}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {editingName ? (
                          <div className="flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-150">
                            <input
                              type="text"
                              value={tempAppName}
                              onChange={e => setTempAppName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveAppName(); }}
                              className="text-xs font-bold px-2.5 py-1 border border-indigo-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white w-48"
                              placeholder="App Name"
                              autoFocus
                            />
                            <button onClick={saveAppName} className="px-2 py-1 rounded bg-indigo-600 text-white font-bold text-[10px]">Save</button>
                            <button onClick={() => setEditingName(false)} className="px-2 py-1 rounded border text-[10px] text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <h2 className="font-extrabold text-base text-slate-850 dark:text-white leading-none">{appName}</h2>
                            <button 
                              onClick={() => {
                                setTempAppName(appName);
                                setEditingName(true);
                              }}
                              className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-350 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" 
                              title="Rename Generated App"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1.5 select-none">
                        {appDeployed ? 'Deployed · Live preview' : 'Not deployed · Preview mode only'}
                      </p>
                      {!appDeployed && (
                        <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                          <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                            This app is not deployed yet. Deploy to get a public URL, custom domain, and live integrations.
                          </p>
                          <button
                            type="button"
                            onClick={() => setAppDeployed(true)}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase"
                          >
                            Deploy app
                          </button>
                        </div>
                      )}
                      
                      <textarea
                        value={appDescription}
                        onChange={e => setAppDescription(e.target.value)}
                        rows={2}
                        className="w-full text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed max-w-xl bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none rounded p-1 transition-all resize-none font-medium"
                        placeholder="Enter short application description here..."
                      />
                      
                      <div className="flex items-center gap-2 mt-4 select-none">
                        <button onClick={() => setWorkspaceTab('preview')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200/40 dark:border-slate-700">
                          <ExternalLink size={11} />
                          Open App Preview
                        </button>
                        <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold transition-all border border-slate-200/40 dark:border-slate-700/60">
                          <Share2 size={11} />
                          {copiedLink ? 'Link copied!' : 'Share App Link'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Grid Widgets (Visibility, Invite, Workspaces matching Image 3) */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* App Visibility Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm space-y-4">
                      <div>
                        <h3 className="font-bold text-xs text-slate-800 dark:text-white">App Visibility Settings</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Control who can access your application</p>
                      </div>

                      <div className="relative select-none">
                        <select
                          value={visibility}
                          onChange={e => setVisibility(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer animate-in duration-200"
                        >
                          <option>Public</option>
                          <option>Private</option>
                          <option>Password Protected</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={requireLogin}
                          onChange={e => setRequireLogin(e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-400 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-650 dark:text-slate-400 group-hover:text-slate-850 dark:group-hover:text-slate-200">
                          Require login to access (Force mock credentials gate)
                        </span>
                      </label>
                    </div>

                    {/* Invite Users Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-xs text-slate-800 dark:text-white">Invite Users</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Grow your user base by inviting others</p>
                        </div>
                        <Users size={14} className="text-slate-300" />
                      </div>

                      <div className="flex gap-2 select-all">
                        <div className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-slate-500 font-medium truncate">
                          <span className="truncate">{userInviteLink}</span>
                          <button onClick={handleCopyLink} className="text-slate-400 hover:text-slate-650 p-0.5 rounded ml-1 transition-colors">
                            {copiedLink ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </div>
                        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex-shrink-0">
                          Send Invites
                        </button>
                      </div>
                    </div>

                    {/* Move to Workspace Widget */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm space-y-4 col-span-2 select-none">
                      <div>
                        <h3 className="font-bold text-xs text-slate-800 dark:text-white">Move to Workspace</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Move this app to another workspace</p>
                      </div>

                      <div className="flex gap-2">
                        <select
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                        >
                          <option>Venkata's Workspace (Current)</option>
                          <option>Team Platform Workspace</option>
                          <option>Archived Projects</option>
                        </select>
                        <button className="px-4 py-2.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl transition-all">
                          Move App
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STATEFUL TAB 2: MEMBERS & USERS DIRECTORY */}
              {adminActiveTab === 'Users' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 select-none">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Registered Users</h3>
                      <p className="text-xs text-slate-400 mt-0.5">All users who signed in to AppForge (live from your project)</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 select-none">
                          <th className="px-4 py-2.5">Name</th>
                          <th className="px-4 py-2.5">Email Address</th>
                          <th className="px-4 py-2.5">Role</th>
                          <th className="px-4 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardUsers.map((u) => (
                          <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 text-slate-655 dark:text-slate-300 font-medium">
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-350">
                                {u.name[0]}
                              </div>
                              {u.name}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px]">{u.email}</td>
                            <td className="px-4 py-3 font-bold text-indigo-500">{u.role}</td>
                            <td className="px-4 py-3">
                              <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                                u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              )}>
                                {u.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {dashboardUsers.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                              No data present — no users have signed in yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STATEFUL TAB 3: DATABASE EXPLORER */}
              {adminActiveTab === 'Data' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 select-none">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Database Explorer</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Browse and inspect raw data rows across all schemas for {appName}</p>
                    </div>
                    {/* Table selector dropdown */}
                    <select
                      value={selectedExplorerTable}
                      onChange={e => setSelectedExplorerTable(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                    >
                      {Object.keys(dbRecords).map(tableKey => (
                        <option key={tableKey} value={tableKey}>
                          Table: {tableKey} ({dbRecords[tableKey]?.length || 0} rows)
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const rows = dbRecords[selectedExplorerTable] || [];
                    const tableSchema = schemas?.db_schema?.tables?.find(t => t.name === selectedExplorerTable);
                    const fields = tableSchema?.fields || (rows[0] ? Object.keys(rows[0]).map(k => ({ name: k })) : []);
                    const cols = fields.filter(c => c.name !== 'id');

                    if (rows.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          <p className="text-sm font-semibold text-slate-455">No data present</p>
                          <p className="text-xs text-slate-400 mt-1">There are no records in the "{selectedExplorerTable}" table. Add records in the preview tab to see them here.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 select-none">
                              <th className="px-4 py-2.5">ID</th>
                              {cols.map(c => (
                                <th key={c.name} className="px-4 py-2.5 capitalize">{c.name.replace(/_/g, ' ')}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rIdx) => (
                              <tr key={row.id || rIdx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 text-slate-655 dark:text-slate-350">
                                <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{row.id}</td>
                                {cols.map(c => {
                                  const val = row[c.name];
                                  return (
                                    <td key={c.name} className="px-4 py-3 max-w-[200px] truncate">
                                      {typeof val === 'boolean' ? (
                                        <span className={clsx('px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase', val ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20' : 'bg-slate-150 text-slate-500 border border-slate-200')}>
                                          {val ? 'TRUE' : 'FALSE'}
                                        </span>
                                      ) : String(val !== undefined ? val : '')}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ADMIN SETTINGS */}
              {adminActiveTab === 'Settings' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">App Settings</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Workspace preferences for {appName}</p>
                    </div>
                  </div>
                  {[
                    { title: 'Profile', description: 'Display name, administrator profile card, and email config' },
                    { title: 'Notifications', description: 'Email digests for record operations and integrations' },
                    { title: 'Security', description: 'Password reset and multi-factor authentication controls' },
                  ].map((section, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm space-y-3">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">{section.title}</h4>
                      <p className="text-[11px] text-slate-455">{section.description}</p>
                      
                      {section.title === 'Profile' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
                              {(firebaseUser?.displayName || appName || 'A')[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{firebaseUser?.displayName || 'Administrator'}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Owner</p>
                            </div>
                          </div>
                          
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Application name</label>
                              <input defaultValue={appName} className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200" placeholder="App name" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Support email address</label>
                              <input defaultValue={loginEmail} className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200" placeholder="Owner email" />
                            </div>
                          </div>
                          
                          <button 
                            type="button" 
                            onClick={() => setIsLoggedIn(false)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-500 dark:text-red-400 text-xs font-bold transition-all border border-red-200/40 w-full uppercase tracking-wider"
                          >
                            <LogOut size={12} />
                            Log Out from App
                          </button>
                        </div>
                      )}
                      
                      {section.title === 'Notifications' && (
                        <div className="space-y-2">
                          {['New user registered alerts', 'Real-time record update notifications', 'Daily analytical updates digests'].map(label => (
                            <label key={label} className="flex items-center gap-2 text-xs font-semibold text-slate-655 dark:text-slate-350 cursor-pointer select-none">
                              <input type="checkbox" defaultChecked className="rounded text-indigo-650 focus:ring-indigo-400 cursor-pointer" />
                              {label}
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {section.title === 'Security' && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => { setPasswordModal(true); setSettingsMessage(''); }} className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors">Change password</button>
                          <button type="button" onClick={() => { setTwoFactorModal(true); setSettingsMessage(''); }} className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            {twoFactorEnabled ? '2FA enabled' : 'Enable 2FA'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {settingsMessage && <p className="text-xs font-semibold text-emerald-600">{settingsMessage}</p>}
                </div>
              )}

              {/* STATEFUL TAB: DOMAINS (CUSTOM DOMAINS & SSL CONFIGS) */}
              {adminActiveTab === 'Domains' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-5 space-y-5 animate-in fade-in duration-200">
                  {!appDeployed ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Deploy required</p>
                      <p className="text-xs text-slate-500">Custom domains are available after you deploy this app from the Overview tab.</p>
                      <button type="button" onClick={() => { setAppDeployed(true); setAdminActiveTab('Overview'); }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Go to Overview & deploy</button>
                    </div>
                  ) : (
                  <>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Custom Domain Configuration</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Map your custom domain to point securely to your deployed app</p>
                  </div>
                  
                  {/* Custom domain input fields */}
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold select-none">https://</span>
                      <input 
                        type="text" 
                        placeholder="e.g. app.myorganization.com"
                        className="w-full pl-16 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-855 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm uppercase transition-colors flex-shrink-0">
                      Connect Domain
                    </button>
                  </div>
                  
                  {/* Mock Active Domain verification table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 select-none">
                          <th className="px-4 py-2.5">Domain</th>
                           <th className="px-4 py-2.5">DNS Record Type</th>
                           <th className="px-4 py-2.5">Value (Points To)</th>
                           <th className="px-4 py-2.5">SSL Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-655 dark:text-slate-350">
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">appforge.run/{appName.toLowerCase().replace(/\s+/g, '')}</td>
                          <td className="px-4 py-3 font-bold text-indigo-500 font-mono">CNAME</td>
                          <td className="px-4 py-3 font-mono text-slate-400">cname.appforge-dns.com</td>
                          <td className="px-4 py-3">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30 text-[9px] font-extrabold uppercase tracking-wide">
                              🔐 SECURED BY SSL
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  </>
                  )}
                </div>
              )}

              {/* STATEFUL TAB: INTEGRATIONS (TOGGLABLE APP WIDGETS) */}
              {adminActiveTab === 'Integrations' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 select-none">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Connected System Integrations</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Sign in with each provider&apos;s account email and password (or API key) to connect — nothing is connected until you authenticate.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'slack', name: 'Slack Messaging', desc: 'Requires Slack workspace email and app password/token.' },
                      { id: 'stripe', name: 'Stripe Billings', desc: 'Requires Stripe account email, password, and API secret key.' },
                      { id: 'zapier', name: 'Zapier Automation', desc: 'Requires Zapier account email and password.' },
                      { id: 'sheets', name: 'Google Sheets', desc: 'Requires Google account email and password.' },
                    ].map(app => {
                      const isConnected = connectedIntegrations[app.id];
                      const account = integrationAccounts[app.id];
                      return (
                        <div key={app.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-bold text-xs text-slate-850 dark:text-white">{app.name}</h4>
                              <p className="text-[10px] text-slate-450 leading-relaxed">
                                {isConnected && account ? `Connected as ${account.masked || account.email}` : app.desc}
                              </p>
                            </div>
                            <span className={clsx('px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border', 
                              isConnected 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20' 
                                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800'
                            )}>
                              {isConnected ? 'Connected' : 'Not connected'}
                            </span>
                          </div>
                          
                          <button 
                            type="button"
                            onClick={() => isConnected ? handleDisconnectIntegration(app.id) : setConnectModal({ id: app.id, name: app.name })}
                            className={clsx('w-full py-1.5 text-[10px] font-bold uppercase rounded-lg border shadow-xs transition-colors',
                              isConnected 
                                ? 'bg-white hover:bg-slate-50 border-red-200 text-red-500 hover:text-red-600 dark:bg-slate-900 dark:hover:bg-slate-800' 
                                : 'bg-indigo-600 hover:bg-indigo-750 border-indigo-650 text-white'
                            )}
                          >
                            {isConnected ? 'Disconnect' : 'Connect with credentials'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STATEFUL TAB 5: SYSTEM SECURITY & SSL STATUS */}
              {adminActiveTab === 'Security' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 select-none">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">App Security Controls</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Toggle advanced protection mechanisms for your generated app</p>
                  </div>

                  <div className="space-y-3 select-none">
                    {[
                      { key: 'ssl', title: 'SSL Certificates Encryption', desc: 'Secure transit traffic using HTTPS automatically', icon: Lock },
                      { key: 'twoFactor', title: 'Two-Factor Authentication (2FA)', desc: 'Require additional verification for admin sign-in', icon: ShieldAlert },
                      { key: 'intrusion', title: 'Intrusion Detection Shielding', desc: 'Block spam IPs and concurrent malicious requests', icon: Shield },
                    ].map((sec) => {
                      const enabled = securityControls[sec.key];
                      const SecIcon = sec.icon;
                      return (
                      <div key={sec.key} className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-750 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <SecIcon className="text-indigo-500 mt-0.5" size={16} />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-white">{sec.title}</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">{sec.desc}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (sec.key === 'twoFactor' && !enabled) {
                              setTwoFactorModal(true);
                              return;
                            }
                            setSecurityControls(prev => ({ ...prev, [sec.key]: !prev[sec.key] }));
                            if (sec.key === 'twoFactor' && enabled) setTwoFactorEnabled(false);
                          }}
                          className={clsx('px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-colors',
                            enabled 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                          )}
                        >
                          {enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    );})}
                  </div>
                </div>
              )}

              {/* STATEFUL TAB 6: DEVELOPER BACKEND CODE GRAPH */}
              {adminActiveTab === 'Code' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 select-none">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">REST API Integration Code</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Use this Express JS code in your backend node server to query active tables</p>
                  </div>

                  <div className="rounded-xl bg-slate-950 border border-slate-850 p-4 font-mono text-[10px] text-slate-350 leading-relaxed overflow-x-auto select-all">
                    <pre className="text-indigo-400">const<span className="text-slate-300"> express </span>=<span className="text-indigo-400"> require</span>(<span className="text-emerald-400">'express'</span>);
<span className="text-indigo-400">const</span> app = express();
<span className="text-slate-500">// API endpoint to list customer database</span>
app.get(<span className="text-emerald-400">'/api/v1/customers'</span>, <span className="text-indigo-400">async</span> (req, res) =&gt; &#123;
  <span className="text-indigo-400">const</span> records = <span className="text-indigo-400">await</span> db.query(<span className="text-emerald-400">'SELECT * FROM customers ORDER BY created_at DESC'</span>);
  res.json(&#123; success: <span className="text-amber-500">true</span>, records &#125;);
&#125;);

app.listen(<span className="text-blue-400">3000</span>, () =&gt; console.log(<span className="text-emerald-400">'medcare server API active on port 3000'</span>));</pre>
                  </div>
                </div>
              )}

            </main>
          </div>
        )}
      </div>

      {/* Integration credentials modal */}
      {connectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Connect {connectModal.name}</h3>
              <button type="button" onClick={() => setConnectModal(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
            <p className="text-[11px] text-slate-500">Enter your provider account credentials. Stored only in this preview session.</p>
            <form onSubmit={handleConnectIntegration} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Account email</label>
                <input type="email" required value={connectForm.email} onChange={e => setConnectForm(p => ({ ...p, email: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Password / token</label>
                <input type="password" required value={connectForm.password} onChange={e => setConnectForm(p => ({ ...p, password: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              </div>
              {connectModal.id === 'stripe' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Stripe API secret (sk_test_...)</label>
                  <input type="password" required value={connectForm.apiKey} onChange={e => setConnectForm(p => ({ ...p, apiKey: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                </div>
              )}
              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">Connect</button>
            </form>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Change password</h3>
            <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
              <input type="password" required placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              <input type="password" required placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl">Update password</button>
                <button type="button" onClick={() => setPasswordModal(false)} className="px-4 py-2 border rounded-xl text-slate-500">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enable 2FA modal */}
      {twoFactorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Enable two-factor authentication</h3>
            <p className="text-[11px] text-slate-500">Enter the 6-digit code from your authenticator app (use 123456 for this preview).</p>
            <form onSubmit={handleEnable2FASubmit} className="space-y-3 text-xs">
              <input type="text" inputMode="numeric" maxLength={6} required placeholder="000000" value={twoFactorCode} onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center tracking-widest font-mono" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl">Verify & enable</button>
                <button type="button" onClick={() => setTwoFactorModal(false)} className="px-4 py-2 border rounded-xl text-slate-500">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-855 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Title */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Add New Table Row</h3>
              <button 
                onClick={() => { setShowAddModal(false); setNewFields({}); }}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Dynamic Form fields matched to Active Page columns */}
            <form onSubmit={handleAddRecord} className="space-y-4">
              
              <div className="space-y-4 text-xs font-semibold max-h-[320px] overflow-y-auto pr-1">
                {activeColumns.filter(c => c.name !== 'id').map(col => {
                  const label = col.name.replace(/_/g, ' ');
                  const type = (col.type || '').toLowerCase();
                  const isBool = type.includes('bool');
                  const isNum = type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('number');
                  const isDate = type.includes('date') || type.includes('time') || col.name.includes('_at') || col.name.includes('date');
                  
                  return (
                    <div key={col.name} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">{label}</label>
                      {isBool ? (
                        <select 
                          required
                          value={newFields[col.name] !== undefined ? String(newFields[col.name]) : 'false'}
                          onChange={e => setNewFields(p => ({ ...p, [col.name]: e.target.value === 'true' }))}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                        >
                          <option value="true">Yes / True</option>
                          <option value="false">No / False</option>
                        </select>
                      ) : col.name.includes('status') ? (
                        <select
                          required
                          value={newFields[col.name] || ''}
                          onChange={e => setNewFields(p => ({ ...p, [col.name]: e.target.value }))}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                        >
                          <option value="">Select Status</option>
                          {activeTableKey === 'deals' ? (
                            <>
                              <option>Lead</option>
                              <option>Contacted</option>
                              <option>Proposal</option>
                              <option>Negotiation</option>
                              <option>Won</option>
                              <option>Lost</option>
                            </>
                          ) : activeTableKey === 'customers' ? (
                            <>
                              <option>Active</option>
                              <option>Inactive</option>
                              <option>Pending</option>
                            </>
                          ) : (
                            <>
                              <option>Active</option>
                              <option>Pending</option>
                              <option>Completed</option>
                              <option>Cancelled</option>
                            </>
                          )}
                        </select>
                      ) : isDate ? (
                        <input 
                          type="date"
                          required
                          value={newFields[col.name] || ''}
                          onChange={e => setNewFields(p => ({ ...p, [col.name]: e.target.value }))}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                        />
                      ) : isNum ? (
                        <input 
                          type="number"
                          required
                          step="any"
                          placeholder={`Enter ${label}`}
                          value={newFields[col.name] || ''}
                          onChange={e => setNewFields(p => ({ ...p, [col.name]: e.target.value }))}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      ) : (
                        <input 
                          type="text"
                          required
                          placeholder={`Enter ${label}`}
                          value={newFields[col.name] || ''}
                          onChange={e => setNewFields(p => ({ ...p, [col.name]: e.target.value }))}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2 select-none">
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm uppercase tracking-wider transition-colors"
                >
                  Write to Database
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowAddModal(false); setNewFields({}); }}
                  className="px-4 py-2 border border-slate-205 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. Chat feedback panel underneath the preview area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/60 flex-shrink-0 flex items-center gap-3">
        <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-wider flex-shrink-0 select-none">
          <Sparkles size={14} className="pulse-dot" />
          <span>Iterative Builder:</span>
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            value={chatPrompt}
            onChange={e => setChatPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSendPrompt(); }}
            placeholder="Describe a change to refine this app…"
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400 transition-all"
          />
          <button
            onClick={handleSendPrompt}
            disabled={!chatPrompt.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Accordion({ icon: Icon, title, color, count, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</span>
          {count !== undefined && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs text-slate-500">{count}</span>
          )}
        </div>
        {open ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function JsonPreview({ result, view, onModifyApp, onBackToGenerate, isExampleBlueprint = false }) {
  if (!result) return null;

  if (!result.success) {
    return (
      <div className="p-6 flex items-start gap-3">
        <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-600 dark:text-red-400 text-sm">
            {result.isUserStop ? 'Generation stopped' : 'Pipeline failed'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{result.error?.replace('USER_STOPPED: ', '')}</p>
        </div>
      </div>
    );
  }

  if (view === 'preview') return (
    <AppPreview
      output={result.output}
      onModifyApp={onModifyApp}
      onBackToGenerate={onBackToGenerate}
      isExampleBlueprint={isExampleBlueprint || result.output?.meta?.source === 'example_blueprint'}
    />
  );

  return (
    <div className="p-4">
      <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 text-xs font-mono leading-5 overflow-auto">
        <JsonNode data={result.output} depth={0} />
      </div>
    </div>
  );
}
