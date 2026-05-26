// src/lib/benchmarks.js
// 20 benchmark prompts: 10 normal + 10 edge cases

export const BENCHMARK_PROMPTS = [
  // ── Normal Prompts ──────────────────────────────────────────────
  {
    id: 'b001',
    category: 'normal',
    label: 'CRM with Payments',
    prompt: 'Build a CRM with customer management, deal tracking, and Stripe payment integration with admin and sales roles',
    expected_features: ['auth', 'payments', 'contacts', 'deals'],
    expected_entities: ['users', 'contacts', 'deals'],
    expected_pages_min: 3,
  },
  {
    id: 'b002',
    category: 'normal',
    label: 'E-commerce Store',
    prompt: 'Create an e-commerce platform with product catalog, shopping cart, order management, and customer accounts',
    expected_features: ['products', 'cart', 'orders', 'auth'],
    expected_entities: ['products', 'orders', 'users'],
    expected_pages_min: 4,
  },
  {
    id: 'b003',
    category: 'normal',
    label: 'Project Management',
    prompt: 'Build a Trello-like project management tool with boards, lists, cards, team collaboration, and due dates',
    expected_features: ['boards', 'tasks', 'collaboration', 'auth'],
    expected_entities: ['boards', 'lists', 'cards', 'users'],
    expected_pages_min: 3,
  },
  {
    id: 'b004',
    category: 'normal',
    label: 'Blog Platform',
    prompt: 'Create a blog platform where authors can write posts with categories and tags, readers can comment and like',
    expected_features: ['posts', 'comments', 'auth', 'categories'],
    expected_entities: ['posts', 'comments', 'users'],
    expected_pages_min: 3,
  },
  {
    id: 'b005',
    category: 'normal',
    label: 'Restaurant App',
    prompt: 'Build a restaurant management app with menu management, online ordering, table reservations, and kitchen dashboard',
    expected_features: ['menu', 'orders', 'reservations', 'dashboard'],
    expected_entities: ['menu_items', 'orders', 'reservations'],
    expected_pages_min: 4,
  },
  {
    id: 'b006',
    category: 'normal',
    label: 'HR Management',
    prompt: 'Create an HR management system with employee profiles, leave management, payroll tracking, and performance reviews',
    expected_features: ['employees', 'leave', 'payroll', 'auth'],
    expected_entities: ['employees', 'leaves', 'payroll'],
    expected_pages_min: 4,
  },
  {
    id: 'b007',
    category: 'normal',
    label: 'Social Network',
    prompt: 'Build a social network with user profiles, posts feed, followers, direct messaging, and notifications',
    expected_features: ['profiles', 'posts', 'messaging', 'notifications'],
    expected_entities: ['users', 'posts', 'messages'],
    expected_pages_min: 4,
  },
  {
    id: 'b008',
    category: 'normal',
    label: 'Learning Management',
    prompt: 'Create an LMS with courses, video lessons, quizzes, student progress tracking, and certificates',
    expected_features: ['courses', 'lessons', 'quizzes', 'progress'],
    expected_entities: ['courses', 'lessons', 'users', 'enrollments'],
    expected_pages_min: 4,
  },
  {
    id: 'b009',
    category: 'normal',
    label: 'Event Management',
    prompt: 'Build an event management platform with event creation, ticket sales, attendee management, and QR check-in',
    expected_features: ['events', 'tickets', 'auth', 'payments'],
    expected_entities: ['events', 'tickets', 'attendees'],
    expected_pages_min: 3,
  },
  {
    id: 'b010',
    category: 'normal',
    label: 'Inventory System',
    prompt: 'Create a warehouse inventory system with product tracking, stock alerts, purchase orders, and supplier management',
    expected_features: ['inventory', 'alerts', 'orders', 'suppliers'],
    expected_entities: ['products', 'inventory', 'suppliers', 'purchase_orders'],
    expected_pages_min: 4,
  },

  // ── Edge Case Prompts ───────────────────────────────────────────
  {
    id: 'e001',
    category: 'edge',
    label: 'Contradictory Roles',
    prompt: 'Build an admin-only dashboard but no login required',
    expected_conflict: true,
    conflict_keywords: ['conflict', 'contradiction', 'admin', 'auth'],
  },
  {
    id: 'e002',
    category: 'edge',
    label: 'Extremely Vague',
    prompt: 'Build a business app',
    expected_assumptions: true,
    min_assumptions: 1,
  },
  {
    id: 'e003',
    category: 'edge',
    label: 'Missing Context',
    prompt: 'Add payments to my app',
    expected_assumptions: true,
    conflict_keywords: ['assumption', 'unclear'],
  },
  {
    id: 'e004',
    category: 'edge',
    label: 'Impossible Requirements',
    prompt: 'Build a real-time multiplayer game with 1 million concurrent users, free hosting, zero latency, and offline support',
    expected_conflict: true,
  },
  {
    id: 'e005',
    category: 'edge',
    label: 'Gibberish Input',
    prompt: 'asdf qwerty 123 blah build thing make website yes',
    expected_low_confidence: true,
    max_confidence: 0.5,
  },
  {
    id: 'e006',
    category: 'edge',
    label: 'Duplicate Features',
    prompt: 'Build a todo app with tasks, todos, items, work items, checklist items, and action items',
    expected_assumptions: true,
  },
  {
    id: 'e007',
    category: 'edge',
    label: 'Mixed Languages',
    prompt: 'Build a CRM por favor with pagos and customer management s\'il vous plaît',
    expected_features: ['crm', 'payments'],
  },
  {
    id: 'e008',
    category: 'edge',
    label: 'Circular Dependencies',
    prompt: 'Build an app where orders reference invoices, invoices reference payments, payments reference orders',
    expected_conflict: true,
  },
  {
    id: 'e009',
    category: 'edge',
    label: 'Empty Prompt',
    prompt: '.',
    expected_low_confidence: true,
    max_confidence: 0.3,
  },
  {
    id: 'e010',
    category: 'edge',
    label: 'Extremely Long',
    prompt: 'Build a comprehensive enterprise application that includes customer relationship management with full contact management, deal pipeline, email integration, and calendar sync; e-commerce with product catalog, inventory management, shopping cart, payment processing with Stripe and PayPal, order fulfillment, shipping tracking, and returns management; human resources with employee profiles, time tracking, leave management, payroll, performance reviews, and hiring pipeline; project management with boards, sprints, burndown charts, and GitHub integration; analytics dashboard with real-time metrics, custom reports, data export, and AI-powered insights; content management system with blog, landing pages, SEO tools; and mobile apps for iOS and Android',
    expected_features: ['crm', 'ecommerce', 'hr', 'projects'],
    expected_complexity: 'high',
  },
];

export function scoreBenchmarkResult(prompt, result) {
  if (!result.success) return { score: 0, passed: false, notes: ['Pipeline failed'] };

  const notes = [];
  let score = 0;
  const { output } = result;

  // Basic: intent extracted
  if (output?.intent?.app_type) { score += 20; } else { notes.push('Missing intent extraction'); }

  // Architecture planned
  if (output?.architecture?.entities?.length > 0) { score += 15; } else { notes.push('No entities in architecture'); }

  // Schemas generated
  if (output?.schemas?.db_schema?.tables?.length > 0) { score += 15; notes.push(`✓ DB: ${output.schemas.db_schema.tables.length} tables`); }
  if (output?.schemas?.api_schema?.endpoints?.length > 0) { score += 15; notes.push(`✓ API: ${output.schemas.api_schema.endpoints.length} endpoints`); }
  if (output?.schemas?.ui_schema?.pages?.length > 0) { score += 10; notes.push(`✓ UI: ${output.schemas.ui_schema.pages.length} pages`); }

  // Validation ran
  if (output?.validation) { score += 10; }

  // Post-repair has fewer errors than pre-repair
  const preErrors = output?.validation?.pre_repair?.errors?.length || 0;
  const postErrors = output?.validation?.post_repair?.errors?.length || 0;
  if (postErrors <= preErrors) { score += 10; notes.push(`✓ Repair: ${preErrors - postErrors} errors fixed`); }

  // Edge case specific checks
  if (prompt.expected_conflict && output?.intent?.conflicts?.length > 0) {
    score += 5; notes.push('✓ Conflict detected correctly');
  }
  if (prompt.expected_assumptions && output?.intent?.assumptions?.length >= (prompt.min_assumptions || 1)) {
    score += 5; notes.push('✓ Assumptions documented');
  }
  if (prompt.expected_low_confidence && output?.intent?.confidence <= (prompt.max_confidence || 0.5)) {
    score += 5; notes.push('✓ Low confidence flagged');
  }

  return { score: Math.min(100, score), passed: score >= 60, notes };
}
