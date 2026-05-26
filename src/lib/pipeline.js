// pipeline.js v4 — Groq-first, CORS-safe, robust JSON parsing
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

function detectProvider(key) {
  if (!key) return null;
  if (key.startsWith('gsk_')) return 'groq';
  if (key.startsWith('sk-ant')) return 'anthropic';
  return 'groq'; // default
}

// Groq is CORS-friendly from browsers. Anthropic is not — use proxy in dev.
function getEndpoint(provider) {
  if (provider === 'groq') return GROQ_ENDPOINT;
  // Anthropic needs proxy in dev
  if (import.meta.env.DEV) return '/anthropic-api/v1/messages';
  return ANTHROPIC_ENDPOINT;
}

async function callAI(apiKey, system, userMsg, maxTokens = 1500, temp = 0.1, modelOverride = '') {
  if (!apiKey) throw new Error('No API key. Go to Settings and add your Groq key (free at console.groq.com).');
  const provider = detectProvider(apiKey);

  if (provider === 'groq') {
    const model = modelOverride || 'llama-3.3-70b-versatile';
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, max_tokens: maxTokens, temperature: temp,
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        response_format: { type: 'json_object' }, // force JSON mode
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Groq error ${res.status}`);
    }
    return (await res.json()).choices?.[0]?.message?.content || '{}';
  } else {
    const res = await fetch(getEndpoint('anthropic'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: modelOverride || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens, temperature: temp, system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Anthropic error ${res.status}`);
    }
    return (await res.json()).content?.[0]?.text || '{}';
  }
}

function safeJSON(text, fallback = {}) {
  if (!text) return fallback;
  let t = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(t); } catch {}
  const obj = t.match(/\{[\s\S]*\}/);
  if (obj) try { return JSON.parse(obj[0]); } catch {}
  return fallback;
}

// ── Stage 1: Intent ───────────────────────────────────────────────────────────
export async function extractIntent(prompt, apiKey, customInstructions = '') {
  const system = `You are an app intent extractor. Return ONLY a valid JSON object with these exact keys:
{
  "app_type": "CRM|ECommerce|Dashboard|Blog|SaaS|Social|LMS|Custom",
  "app_name": "short name",
  "description": "one sentence",
  "features": ["feature1","feature2"],
  "roles": ["user","admin"],
  "primary_entities": ["entity1","entity2"],
  "auth_required": true,
  "payment_required": false,
  "assumptions": ["assumption if any"],
  "conflicts": ["conflict if any"],
  "ambiguities": ["unclear part if any"],
  "confidence": 0.9
}
${customInstructions ? 'User preferences: ' + customInstructions : ''}
Return ONLY the JSON object. No explanation.`;

  const raw = await callAI(apiKey, system, `Extract intent from: "${prompt}"`, 800, 0.1);
  const p = safeJSON(raw);
  p.app_type = p.app_type || 'Custom';
  p.app_name = p.app_name || 'MyApp';
  p.description = p.description || 'A custom application';
  p.features = Array.isArray(p.features) ? p.features : [];
  p.roles = Array.isArray(p.roles) ? p.roles : ['user'];
  p.primary_entities = Array.isArray(p.primary_entities) ? p.primary_entities : [];
  p.assumptions = Array.isArray(p.assumptions) ? p.assumptions : [];
  p.conflicts = Array.isArray(p.conflicts) ? p.conflicts : [];
  p.ambiguities = Array.isArray(p.ambiguities) ? p.ambiguities : [];
  p.auth_required = p.auth_required !== false;
  p.payment_required = !!p.payment_required;
  p.confidence = typeof p.confidence === 'number' ? p.confidence : 0.7;
  return p;
}

// ── Stage 2: Architecture ─────────────────────────────────────────────────────
export async function planArchitecture(intent, apiKey) {
  const system = `You are a system architect. Return ONLY a valid JSON object:
{
  "entities": [{"name":"users","description":"app users","key_fields":["id","email","name"]}],
  "modules": ["Authentication","Dashboard","CRUD"],
  "pages": [{"name":"Dashboard","route":"/","role_access":["user","admin"],"purpose":"main view"}],
  "flows": [{"name":"User Login","steps":["Enter credentials","Verify","Redirect to dashboard"],"entities_involved":["users"]}],
  "integrations": [],
  "architecture_style": "MVC",
  "complexity": "medium"
}
All entity names must be lowercase snake_case. Return ONLY JSON.`;

  const raw = await callAI(apiKey, system, `Design architecture for:\n${JSON.stringify(intent)}`, 1200, 0.1);
  const p = safeJSON(raw);
  if (!p.entities?.length) p.entities = intent.primary_entities.map(e => ({ name: e, description: `${e} entity`, key_fields: ['id', 'created_at'] }));
  if (!p.pages?.length) p.pages = [{ name: 'Dashboard', route: '/', role_access: ['user'], purpose: 'Main view' }];
  if (!p.modules) p.modules = [];
  if (!p.flows) p.flows = [];
  if (!p.complexity) p.complexity = 'medium';
  return p;
}

// ── Stage 3: Schema Generation ────────────────────────────────────────────────
export async function generateSchemas(intent, architecture, apiKey) {
  // Split into two calls for better quality (DB+API first, then UI)
  const dbApiSystem = `You are a database and API schema generator. Return ONLY valid JSON with this EXACT structure. Include at least 3-5 tables and 8-12 endpoints. Be specific and detailed.
{
  "db_schema": {
    "tables": [
      {
        "name": "users",
        "fields": [
          {"name":"id","type":"uuid","required":true,"unique":true,"foreign_key":null},
          {"name":"email","type":"varchar","required":true,"unique":true,"foreign_key":null},
          {"name":"name","type":"varchar","required":true,"unique":false,"foreign_key":null},
          {"name":"role","type":"varchar","required":true,"unique":false,"foreign_key":null},
          {"name":"created_at","type":"timestamp","required":true,"unique":false,"foreign_key":null}
        ],
        "indexes":["id","email"]
      }
    ]
  },
  "api_schema": {
    "base_url": "/api/v1",
    "endpoints": [
      {
        "method":"GET","path":"/users","description":"List all users",
        "auth_required":true,"roles":["admin"],
        "request_body":{"fields":[]},
        "response":{"fields":[{"name":"id","type":"string"},{"name":"email","type":"string"}]},
        "db_tables_used":["users"]
      }
    ]
  },
  "auth_schema": {
    "type":"JWT","providers":["email","google"],
    "roles":[{"name":"user","permissions":["read","create"]},{"name":"admin","permissions":["read","create","update","delete"]}]
  }
}
Return ONLY the JSON. No explanation. All field names lowercase snake_case.`;

  const dbApiRaw = await callAI(apiKey, dbApiSystem,
    `Generate complete DB and API schemas for:\nApp: ${intent.app_name} (${intent.app_type})\nFeatures: ${intent.features.join(', ')}\nEntities: ${architecture.entities.map(e => e.name).join(', ')}\nRoles: ${intent.roles.join(', ')}\nAuth needed: ${intent.auth_required}\nPayments: ${intent.payment_required}`,
    2000, 0.1);

  const dbApiParsed = safeJSON(dbApiRaw);

  const uiSystem = `You are a UI schema generator for production SaaS apps. Return ONLY valid JSON.
Create 4-6 pages: Dashboard, 2-3 entity management pages, Settings (/settings), and Login (/login) if auth is required.
Each Dashboard must include stats (4 realistic metrics with labels matching the app domain), a chart, and a recent-activity table.
Entity pages use "table" or "kanban" components with correct data_source matching DB table names (snake_case).
Settings page must use type "settings" with sections: Profile, Notifications, Security.
Use realistic titles and field names for the app domain — not generic placeholders.
{
  "ui_schema": {
    "design_system": {"primary_color":"#6366f1","theme":"both","app_name":"AppName"},
    "pages": [
      {
        "name":"Dashboard","route":"/",
        "components": [
          {"type":"stats","id":"stats_1","metrics":[{"label":"TOTAL USERS","value":"0","icon":"users","change":""}]},
          {"type":"chart","id":"chart_1","title":"Performance","data_source":"orders"},
          {"type":"table","id":"table_1","title":"Recent Activity","data_source":"orders","fields":["id","name","status","created_at"]}
        ]
      },
      {"name":"Settings","route":"/settings","components":[{"type":"settings","id":"settings_1","sections":[{"title":"Profile","description":"Account details"},{"title":"Notifications","description":"Alerts"},{"title":"Security","description":"Auth"}]}]}
    ]
  }
}
Return ONLY the JSON.`;

  const uiRaw = await callAI(apiKey, uiSystem,
    `Generate UI pages for:\nApp: ${intent.app_name}\nPages needed: ${architecture.pages.map(p => p.name).join(', ')}\nEntities: ${architecture.entities.map(e => e.name + ' (' + (e.key_fields || []).join(',') + ')').join('; ')}`,
    1500, 0.1);

  const uiParsed = safeJSON(uiRaw);

  // Merge results
  const schemas = {
    db_schema: dbApiParsed.db_schema || { tables: [] },
    api_schema: dbApiParsed.api_schema || { base_url: '/api/v1', endpoints: [] },
    ui_schema: uiParsed.ui_schema || { design_system: { primary_color: '#6366f1', theme: 'both' }, pages: [] },
    auth_schema: dbApiParsed.auth_schema || { type: 'JWT', providers: ['email'], roles: [{ name: 'user', permissions: ['read'] }] },
  };

  // Guarantee minimum viable output
  if (!schemas.db_schema.tables?.length) {
    schemas.db_schema.tables = architecture.entities.map(e => ({
      name: e.name,
      fields: [
        { name: 'id', type: 'uuid', required: true, unique: true, foreign_key: null },
        ...(e.key_fields || ['name', 'created_at']).filter(f => f !== 'id').map(f => ({
          name: f, type: f.includes('at') ? 'timestamp' : 'varchar', required: true, unique: false, foreign_key: null
        }))
      ],
      indexes: ['id']
    }));
  }

  if (!schemas.api_schema.endpoints?.length) {
    schemas.api_schema.endpoints = schemas.db_schema.tables.flatMap(t => [
      { method: 'GET', path: `/${t.name}`, description: `List ${t.name}`, auth_required: true, roles: ['user', 'admin'], request_body: { fields: [] }, response: { fields: t.fields.slice(0, 3).map(f => ({ name: f.name, type: 'string' })) }, db_tables_used: [t.name] },
      { method: 'POST', path: `/${t.name}`, description: `Create ${t.name}`, auth_required: true, roles: ['user', 'admin'], request_body: { fields: t.fields.filter(f => f.name !== 'id').slice(0, 4).map(f => ({ name: f.name, type: f.type, required: f.required })) }, response: { fields: [{ name: 'id', type: 'string' }] }, db_tables_used: [t.name] },
      { method: 'PUT', path: `/${t.name}/:id`, description: `Update ${t.name}`, auth_required: true, roles: ['admin'], request_body: { fields: t.fields.filter(f => f.name !== 'id').slice(0, 4).map(f => ({ name: f.name, type: f.type, required: false })) }, response: { fields: [{ name: 'id', type: 'string' }] }, db_tables_used: [t.name] },
      { method: 'DELETE', path: `/${t.name}/:id`, description: `Delete ${t.name}`, auth_required: true, roles: ['admin'], request_body: { fields: [] }, response: { fields: [{ name: 'success', type: 'boolean' }] }, db_tables_used: [t.name] },
    ]);
  }

  if (!schemas.ui_schema.pages?.length) {
    schemas.ui_schema.pages = architecture.pages.map(p => ({
      name: p.name, route: p.route,
      components: [{ type: 'table', id: `${p.name.toLowerCase()}_table`, data_source: architecture.entities[0]?.name || '', fields: ['id', 'name', 'created_at'], actions: ['create', 'edit', 'delete'] }]
    }));
  }

  if (isHabitTrackerApp(intent)) {
    const habitSchemas = buildHabitTrackerSchemas(intent);
    return enrichGeneratedSchemas(habitSchemas, intent, architecture, '');
  }

  return enrichGeneratedSchemas(schemas, intent, architecture, '');
}

function isHabitTrackerApp(intent, prompt = '') {
  const blob = `${intent?.app_name || ''} ${intent?.description || ''} ${(intent?.features || []).join(' ')} ${prompt}`.toLowerCase();
  return /habit|streak|student tracker|college student/.test(blob);
}

/** Domain-specific schema when the prompt clearly describes a habit tracker */
export function buildHabitTrackerSchemas(intent) {
  const appName = intent?.app_name || 'Habit Tracker';
  return {
    db_schema: {
      tables: [
        {
          name: 'habits',
          fields: [
            { name: 'id', type: 'uuid', required: true, unique: true, foreign_key: null },
            { name: 'title', type: 'varchar', required: true, unique: false, foreign_key: null },
            { name: 'description', type: 'varchar', required: false, unique: false, foreign_key: null },
            { name: 'frequency', type: 'varchar', required: true, unique: false, foreign_key: null },
            { name: 'streak', type: 'integer', required: true, unique: false, foreign_key: null },
            { name: 'completed_today', type: 'boolean', required: true, unique: false, foreign_key: null },
            { name: 'created_at', type: 'timestamp', required: true, unique: false, foreign_key: null },
          ],
          indexes: ['id'],
        },
        {
          name: 'habit_logs',
          fields: [
            { name: 'id', type: 'uuid', required: true, unique: true, foreign_key: null },
            { name: 'habit_id', type: 'uuid', required: true, unique: false, foreign_key: 'habits.id' },
            { name: 'completed_on', type: 'date', required: true, unique: false, foreign_key: null },
            { name: 'notes', type: 'varchar', required: false, unique: false, foreign_key: null },
          ],
          indexes: ['id', 'habit_id'],
        },
        {
          name: 'users',
          fields: [
            { name: 'id', type: 'uuid', required: true, unique: true, foreign_key: null },
            { name: 'email', type: 'varchar', required: true, unique: true, foreign_key: null },
            { name: 'name', type: 'varchar', required: true, unique: false, foreign_key: null },
            { name: 'role', type: 'varchar', required: true, unique: false, foreign_key: null },
            { name: 'created_at', type: 'timestamp', required: true, unique: false, foreign_key: null },
          ],
          indexes: ['id', 'email'],
        },
      ],
    },
    api_schema: {
      base_url: '/api/v1',
      endpoints: [
        { method: 'POST', path: '/auth/signup', description: 'Register with email and password', auth_required: false, roles: [], request_body: { fields: [{ name: 'email', type: 'string', required: true }, { name: 'password', type: 'string', required: true }] }, response: { fields: [{ name: 'token', type: 'string' }] }, db_tables_used: ['users'] },
        { method: 'POST', path: '/auth/login', description: 'Login with email and password', auth_required: false, roles: [], request_body: { fields: [{ name: 'email', type: 'string', required: true }, { name: 'password', type: 'string', required: true }] }, response: { fields: [{ name: 'token', type: 'string' }] }, db_tables_used: ['users'] },
        { method: 'GET', path: '/habits', description: 'List user habits', auth_required: true, roles: ['user', 'admin'], request_body: { fields: [] }, response: { fields: [{ name: 'id', type: 'string' }, { name: 'title', type: 'string' }] }, db_tables_used: ['habits'] },
        { method: 'POST', path: '/habits', description: 'Create habit', auth_required: true, roles: ['user', 'admin'], request_body: { fields: [{ name: 'title', type: 'string', required: true }] }, response: { fields: [{ name: 'id', type: 'string' }] }, db_tables_used: ['habits'] },
        { method: 'PUT', path: '/habits/:id', description: 'Update habit', auth_required: true, roles: ['user', 'admin'], request_body: { fields: [] }, response: { fields: [{ name: 'id', type: 'string' }] }, db_tables_used: ['habits'] },
        { method: 'DELETE', path: '/habits/:id', description: 'Delete habit', auth_required: true, roles: ['user', 'admin'], request_body: { fields: [] }, response: { fields: [{ name: 'success', type: 'boolean' }] }, db_tables_used: ['habits'] },
        { method: 'POST', path: '/habits/:id/complete', description: 'Mark habit complete for today', auth_required: true, roles: ['user', 'admin'], request_body: { fields: [] }, response: { fields: [{ name: 'streak', type: 'integer' }] }, db_tables_used: ['habits', 'habit_logs'] },
        { method: 'GET', path: '/admin/users', description: 'Admin: list all registered users', auth_required: true, roles: ['admin'], request_body: { fields: [] }, response: { fields: [{ name: 'id', type: 'string' }, { name: 'email', type: 'string' }] }, db_tables_used: ['users'] },
        { method: 'GET', path: '/admin/stats', description: 'Admin: platform statistics', auth_required: true, roles: ['admin'], request_body: { fields: [] }, response: { fields: [{ name: 'total_users', type: 'integer' }] }, db_tables_used: ['users', 'habits'] },
      ],
    },
    ui_schema: {
      design_system: { primary_color: '#6366f1', theme: 'both', app_name: appName },
      pages: [
        {
          name: 'Dashboard',
          route: '/',
          components: [
            { type: 'stats', id: 'stats_habits', metrics: [
              { label: 'HABITS TODAY', value: '0', icon: 'check-square', change: '' },
              { label: 'COMPLETED', value: '0', icon: 'trending-up', change: '' },
              { label: 'LONGEST STREAK', value: '0', icon: 'zap', change: '' },
              { label: 'TOTAL USERS', value: '0', icon: 'users', change: '' },
            ]},
            { type: 'chart', id: 'chart_weekly', title: 'Weekly Progress', data_source: 'habit_logs' },
            { type: 'table', id: 'table_habits_today', title: "Today's Habits", data_source: 'habits', fields: ['title', 'streak', 'completed_today', 'frequency'] },
          ],
        },
        {
          name: 'Habits',
          route: '/habits',
          components: [
            { type: 'table', id: 'table_habits', title: 'My Habits', data_source: 'habits', fields: ['title', 'frequency', 'streak', 'completed_today'], actions: ['create', 'edit', 'delete'] },
          ],
        },
        {
          name: 'Progress',
          route: '/progress',
          components: [
            { type: 'chart', id: 'chart_progress', title: 'Weekly Completion', data_source: 'habit_logs' },
            { type: 'table', id: 'table_logs', title: 'Completion Log', data_source: 'habit_logs', fields: ['habit_id', 'completed_on', 'notes'] },
          ],
        },
        {
          name: 'Admin',
          route: '/admin',
          components: [
            { type: 'table', id: 'admin_users', title: 'Registered Users', data_source: 'users', fields: ['name', 'email', 'role', 'created_at'] },
            { type: 'stats', id: 'admin_stats', metrics: [
              { label: 'TOTAL USERS', value: '0', icon: 'users', change: '' },
              { label: 'ACTIVE HABITS', value: '0', icon: 'check-square', change: '' },
            ]},
          ],
        },
        {
          name: 'Settings',
          route: '/settings',
          components: [{
            type: 'settings',
            id: 'habit_settings',
            sections: [
              { title: 'Profile', description: 'Name, email, and account role' },
              { title: 'Notifications', description: 'Reminders for pending habits' },
              { title: 'Security', description: 'Password, logout, and session' },
            ],
          }],
        },
      ],
    },
    auth_schema: {
      type: 'JWT',
      providers: ['email', 'google'],
      roles: [
        { name: 'user', permissions: ['read', 'create', 'update', 'delete'] },
        { name: 'admin', permissions: ['read', 'create', 'update', 'delete'] },
      ],
    },
  };
}

/** Post-process AI output: ensure Settings page, dashboard metrics, and consistent app metadata */
export function enrichGeneratedSchemas(schemas, intent, architecture, prompt = '') {
  const s = JSON.parse(JSON.stringify(schemas));
  s.ui_schema = s.ui_schema || { design_system: {}, pages: [] };
  s.ui_schema.design_system = {
    primary_color: '#6366f1',
    theme: 'both',
    app_name: intent?.app_name || 'My App',
    ...s.ui_schema.design_system,
  };
  s.ui_schema.design_system.app_name = intent?.app_name || s.ui_schema.design_system.app_name;

  let pages = [...(s.ui_schema.pages || [])];
  const hasSettings = pages.some(p => /setting/i.test(p.name));
  const hasLogin = pages.some(p => /login/i.test(p.name));

  if (!hasLogin && intent?.auth_required !== false) {
    pages.unshift({
      name: 'Login',
      route: '/login',
      components: [{ type: 'login', id: 'login_gate' }],
    });
  }

  if (!hasSettings) {
    pages.push({
      name: 'Settings',
      route: '/settings',
      components: [{
        type: 'settings',
        id: 'app_settings',
        sections: [
          { title: 'Profile', description: 'Account name, email, and workspace role' },
          { title: 'Notifications', description: 'Email and in-app alert preferences' },
          { title: 'Security', description: 'Password, two-factor authentication, and sessions' },
        ],
      }],
    });
  }

  const entities = (architecture?.entities || []).map(e => e.name);
  const firstEntity = entities[0] || s.db_schema?.tables?.[0]?.name || 'records';
  const secondEntity = entities[1] || s.db_schema?.tables?.[1]?.name;

  pages = pages.map((page, idx) => {
    const name = page.name || `Page ${idx + 1}`;
    const route = page.route?.startsWith('/') ? page.route : `/${name.toLowerCase().replace(/\s+/g, '_')}`;
    const components = [...(page.components || [])];

    if (/login|setting/i.test(name)) return { ...page, name, route, components };

    const isDashboard = idx === 0 || /dashboard|home|overview/i.test(name);
    if (isDashboard && !components.some(c => c.type === 'stats')) {
      const m1 = (firstEntity || 'records').replace(/_/g, ' ').toUpperCase();
      const m2 = (secondEntity || 'activity').replace(/_/g, ' ').toUpperCase();
      components.unshift({
        type: 'stats',
        id: `stats_${name.toLowerCase()}`,
        metrics: [
          { label: `TOTAL ${m1}`, value: '0', icon: 'users', change: '' },
          { label: `ACTIVE ${m2}`, value: '0', icon: 'briefcase', change: '' },
          { label: 'RECORDS', value: '0', icon: 'file-text', change: '' },
          { label: 'THIS WEEK', value: '0', icon: 'trending-up', change: '' },
        ],
      });
    }
    if (isDashboard && !components.some(c => c.type === 'chart')) {
      components.push({
        type: 'chart',
        id: `chart_${name.toLowerCase()}`,
        title: `${intent?.app_name || name} Performance`,
        data_source: secondEntity || firstEntity,
      });
    }
    if (!isDashboard && !components.length) {
      const entityForPage = entities.find(e => name.toLowerCase().includes(e.replace(/_/g, ' '))) || entities[idx - 1] || firstEntity;
      components.push({
        type: /deal|pipeline|board|task/i.test(name) ? 'kanban' : 'table',
        id: `table_${name.toLowerCase()}`,
        title: name,
        data_source: entityForPage,
        fields: ['name', 'status', 'created_at'],
        columns: ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won'],
      });
    }

    return { ...page, name, route, components };
  });

  s.ui_schema.pages = pages;
  return s;
}

// ── Stage 4: Validation ───────────────────────────────────────────────────────
export function runValidation(schemas) {
  const errors = [], warnings = [];
  const { db_schema, api_schema, ui_schema, auth_schema } = schemas;
  const dbTables = {};
  (db_schema?.tables || []).forEach(t => { dbTables[t.name] = new Set((t.fields || []).map(f => f.name)); });
  const dbNames = new Set(Object.keys(dbTables));

  (api_schema?.endpoints || []).forEach(ep => {
    (ep.db_tables_used || []).forEach(t => {
      if (!dbNames.has(t)) errors.push({ type: 'MISSING_TABLE', severity: 'error', location: `API ${ep.method} ${ep.path}`, message: `Table "${t}" not in DB`, auto_fixable: true, fix_action: { type: 'add_table', table_name: t } });
    });
  });

  (ui_schema?.pages || []).forEach(pg => {
    (pg.components || []).forEach(comp => {
      if (comp.data_source && !comp.data_source.startsWith('/') && !dbNames.has(comp.data_source)) {
        warnings.push({ type: 'ORPHAN_SOURCE', severity: 'warning', location: `UI ${pg.name}→${comp.id}`, message: `data_source "${comp.data_source}" not a DB table`, auto_fixable: false });
      }
    });
  });

  const definedRoles = new Set((auth_schema?.roles || []).map(r => r.name));
  if (definedRoles.size > 0) {
    (api_schema?.endpoints || []).forEach(ep => {
      (ep.roles || []).forEach(r => {
        if (!definedRoles.has(r)) warnings.push({ type: 'UNDEF_ROLE', severity: 'warning', location: `API ${ep.method} ${ep.path}`, message: `Role "${r}" not defined`, auto_fixable: true, fix_action: { type: 'add_role', role_name: r } });
      });
    });
  }

  (db_schema?.tables || []).forEach(t => {
    if (!t.fields?.some(f => f.name === 'id')) warnings.push({ type: 'MISSING_PK', severity: 'warning', location: `Table ${t.name}`, message: `No "id" field`, auto_fixable: true, fix_action: { type: 'add_pk', table_name: t.name } });
  });

  return { isValid: errors.length === 0, errors, warnings, summary: { errors: errors.length, warnings: warnings.length, total: errors.length + warnings.length } };
}

// ── Stage 5: Repair ───────────────────────────────────────────────────────────
export async function repairSchemas(schemas, validation, apiKey) {
  const repairs = [];
  if (validation.isValid && !validation.warnings.length) return { schemas, repairs };
  let s = JSON.parse(JSON.stringify(schemas));

  for (const issue of [...validation.errors, ...validation.warnings]) {
    if (!issue.auto_fixable || !issue.fix_action) continue;
    const { type, ...p } = issue.fix_action;
    if (type === 'add_table' && !s.db_schema.tables.find(t => t.name === p.table_name)) {
      s.db_schema.tables.push({ name: p.table_name, fields: [{ name: 'id', type: 'uuid', required: true, unique: true, foreign_key: null }, { name: 'created_at', type: 'timestamp', required: true, unique: false, foreign_key: null }], indexes: ['id'] });
      repairs.push({ issue: issue.type, action: `Added table "${p.table_name}"` });
    } else if (type === 'add_pk') {
      const t = s.db_schema.tables.find(t => t.name === p.table_name);
      if (t) { t.fields.unshift({ name: 'id', type: 'uuid', required: true, unique: true, foreign_key: null }); repairs.push({ issue: issue.type, action: `Added PK to "${p.table_name}"` }); }
    } else if (type === 'add_role' && !s.auth_schema.roles.find(r => r.name === p.role_name)) {
      s.auth_schema.roles.push({ name: p.role_name, permissions: ['read'] });
      repairs.push({ issue: issue.type, action: `Added role "${p.role_name}"` });
    }
  }
  return { schemas: s, repairs };
}

// ── Stage 6: Runtime Sim ──────────────────────────────────────────────────────
export function simulateRuntime(schemas) {
  const r = { routes_valid: [], routes_invalid: [], api_endpoints_simulated: [], db_tables_verified: [], mock_data: {}, execution_score: 0 };
  (schemas.ui_schema?.pages || []).forEach(p => {
    (p.route?.startsWith('/') ? r.routes_valid : r.routes_invalid).push({ route: p.route, page: p.name, status: p.route?.startsWith('/') ? 'OK' : 'Invalid route' });
  });
  (schemas.api_schema?.endpoints || []).forEach(ep => {
    const mock = {}; (ep.response?.fields || []).forEach(f => { mock[f.name] = mockVal(f.type, f.name); });
    r.api_endpoints_simulated.push({ method: ep.method, path: ep.path, status: 200, mock_response: mock });
  });
  (schemas.db_schema?.tables || []).forEach(t => {
    r.db_tables_verified.push({ table: t.name, fields: t.fields?.length || 0, status: 'OK' });
    r.mock_data[t.name] = [];
  });
  const total = r.routes_valid.length + r.api_endpoints_simulated.length + r.db_tables_verified.length;
  r.execution_score = total > 0 ? Math.min(100, Math.round(total / Math.max(total, 5) * 100)) : 0;
  return r;
}

function mockVal(type, name) {
  if (name === 'id') return 'uuid-' + Math.random().toString(36).slice(2, 8);
  if (name?.includes('email')) return 'user@example.com';
  if (name?.includes('name')) return 'John Doe';
  if (name?.includes('price') || name?.includes('amount')) return 99.99;
  if ((type || '').includes('bool')) return true;
  if ((type || '').includes('int') || (type || '').includes('decimal')) return 42;
  if ((type || '').includes('timestamp') || (type || '').includes('date')) return new Date().toISOString();
  return 'sample_value';
}

export function computeQualityScore(intent, schemas, validation, runtime) {
  let score = 100;
  score -= (validation.errors?.length || 0) * 10;
  score -= (validation.warnings?.length || 0) * 3;
  if (!schemas.db_schema?.tables?.length) score -= 20;
  if (!schemas.api_schema?.endpoints?.length) score -= 15;
  if (!schemas.ui_schema?.pages?.length) score -= 15;
  score = Math.max(0, Math.min(100, score));
  return { total: score, grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F', breakdown: { schema_coverage: schemas.db_schema?.tables?.length > 0 ? 100 : 0, api_coverage: schemas.api_schema?.endpoints?.length > 0 ? 100 : 0, validation_pass: Math.max(0, 100 - (validation.errors?.length || 0) * 10), runtime_score: runtime.execution_score } };
}
