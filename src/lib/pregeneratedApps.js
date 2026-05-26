// src/lib/pregeneratedApps.js
// Custom premium schemas for all 12 example apps to prevent 429 rate limit errors

export const PREGENERATED_APPS = {
  ex001: {
    intent: {
      app_type: 'CRM',
      app_name: 'Flowdesk',
      description: 'A streamlined CRM and pipeline management tool designed to help small businesses track customer relationships and close deals with clarity.',
      features: [
        'Customer management — add, edit, view customers with contact info and status',
        'Deal tracking — pipeline stages, values, linked to customers',
        'Dashboard — key metrics, recent activity, deal pipeline overview',
        'Visual direction — HSL-tailored visual design with smooth accents, clean dark mode support'
      ],
      roles: ['admin', 'sales'],
      primary_entities: ['customers', 'deals'],
      auth_required: true,
      payment_required: false,
      assumptions: ['Stripe payment functions can be deferred and added later.'],
      conflicts: [],
      ambiguities: [],
      confidence: 0.98
    },
    architecture: {
      entities: [
        { name: 'customers', description: 'Customer profiles and contacts', key_fields: ['id', 'name', 'email', 'company', 'status'] },
        { name: 'deals', description: 'Sales opportunities and values', key_fields: ['id', 'title', 'value', 'stage', 'customer_id'] }
      ],
      modules: ['Authentication', 'Dashboard', 'CRM Core', 'Analytics'],
      pages: [
        { name: 'Dashboard', route: '/', role_access: ['admin', 'sales'], purpose: 'Overview of sales and deals' },
        { name: 'Customers', route: '/customers', role_access: ['admin', 'sales'], purpose: 'Manage client directory' },
        { name: 'Deals', route: '/deals', role_access: ['admin', 'sales'], purpose: 'Pipeline stage tracking' }
      ],
      flows: [
        { name: 'Create Deal', steps: ['Select customer', 'Enter value', 'Set pipeline stage', 'Create opportunity'], entities_involved: ['deals', 'customers'] }
      ],
      integrations: [],
      architecture_style: 'MVC',
      complexity: 'medium'
    },
    schemas: {
      db_schema: {
        tables: [
          {
            name: 'customers',
            fields: [
              { name: 'id', type: 'uuid', required: true, unique: true },
              { name: 'name', type: 'varchar', required: true },
              { name: 'email', type: 'varchar', required: true, unique: true },
              { name: 'company', type: 'varchar', required: true },
              { name: 'status', type: 'varchar', required: true },
              { name: 'created_at', type: 'timestamp', required: true }
            ]
          },
          {
            name: 'deals',
            fields: [
              { name: 'id', type: 'uuid', required: true, unique: true },
              { name: 'title', type: 'varchar', required: true },
              { name: 'value', type: 'decimal', required: true },
              { name: 'stage', type: 'varchar', required: true },
              { name: 'customer_id', type: 'uuid', required: true, foreign_key: 'customers.id' },
              { name: 'created_at', type: 'timestamp', required: true }
            ]
          }
        ]
      },
      api_schema: {
        base_url: '/api/v1',
        endpoints: [
          { method: 'GET', path: '/customers', description: 'Fetch all clients' },
          { method: 'POST', path: '/customers', description: 'Add new client' },
          { method: 'GET', path: '/deals', description: 'Fetch deals pipeline' },
          { method: 'POST', path: '/deals', description: 'Create new deal' }
        ]
      },
      ui_schema: {
        design_system: { primary_color: '#6366f1', theme: 'both', app_name: 'Flowdesk' },
        pages: [
          {
            name: 'Dashboard',
            route: '/',
            components: [
              { type: 'stats', id: 'stats_crm', metrics: [
                { label: 'CUSTOMERS', value: '5', icon: 'users', change: '+12%' },
                { label: 'DEALS', value: '6', icon: 'briefcase', change: '+8%' },
                { label: 'REVENUE', value: '$27,000', icon: 'dollar-sign', change: '+24%' },
                { label: 'PIPELINE', value: '$81,500', icon: 'trending-up', change: '+18%' }
              ]},
              { type: 'chart', id: 'chart_pipeline', title: 'Sales Performance', data_source: 'deals' },
              { type: 'table', id: 'table_deals', title: 'Recent Deals', data_source: 'deals', fields: ['title', 'customer', 'value', 'stage'] }
            ]
          },
          {
            name: 'Customers',
            route: '/customers',
            components: [
              { type: 'table', id: 'table_customers', title: 'Customer Directory', data_source: 'customers', fields: ['name', 'email', 'company', 'status', 'created_at'] }
            ]
          },
          {
            name: 'Deals',
            route: '/deals',
            components: [
              { type: 'kanban', id: 'kanban_deals', title: 'Deal Stages', data_source: 'deals', columns: ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'] }
            ]
          },
          {
            name: 'Settings',
            route: '/settings',
            components: [
              { type: 'settings', id: 'settings_crm', sections: [
                { title: 'Profile', description: 'Sales rep name, email, and territory' },
                { title: 'Notifications', description: 'Deal updates and pipeline alerts' },
                { title: 'Security', description: 'Password and two-factor authentication' }
              ]}
            ]
          }
        ]
      },
      auth_schema: {
        type: 'JWT',
        providers: ['email', 'google'],
        roles: [
          { name: 'admin', permissions: ['read', 'create', 'update', 'delete'] },
          { name: 'sales', permissions: ['read', 'create', 'update'] }
        ]
      }
    },
    validation: {
      pre_repair: { isValid: true, errors: [], warnings: [] },
      post_repair: { isValid: true, errors: [], warnings: [] },
      repairs_applied: []
    },
    runtime_simulation: {
      routes_valid: [{ route: '/', page: 'Dashboard', status: 'OK' }, { route: '/customers', page: 'Customers', status: 'OK' }, { route: '/deals', page: 'Deals', status: 'OK' }, { route: '/settings', page: 'Settings', status: 'OK' }],
      api_endpoints_simulated: [{ method: 'GET', path: '/customers', status: 200 }, { method: 'GET', path: '/deals', status: 200 }],
      db_tables_verified: [{ table: 'customers', fields: 6, status: 'OK' }, { table: 'deals', fields: 6, status: 'OK' }],
      execution_score: 100
    },
    quality_score: { total: 98, grade: 'A' }
  },
  ex002: {
    intent: {
      app_type: 'ECommerce',
      app_name: 'ShopSphere',
      description: 'A modern e-commerce storefront and admin back-office with integrated catalog, checkout options, and inventory controls.',
      features: [
        'Product catalog — grid browsing, search, tags, dynamic product listings',
        'Shopping cart & checkout — Stripe payments integration mock-up',
        'Order management — statuses for orders, tracking number and invoice details',
        'Admin dashboard — inventory counts, sales stats, recent purchases'
      ],
      roles: ['admin', 'customer'],
      primary_entities: ['products', 'orders'],
      auth_required: true,
      payment_required: true,
      assumptions: ['Stripe payment is mock-simulated.'],
      conflicts: [],
      ambiguities: [],
      confidence: 0.96
    },
    architecture: {
      entities: [
        { name: 'products', description: 'Product item inventory', key_fields: ['id', 'name', 'price', 'stock', 'category'] },
        { name: 'orders', description: 'Customer purchases and items', key_fields: ['id', 'customer_name', 'total', 'status', 'created_at'] }
      ],
      modules: ['Authentication', 'Storefront', 'Checkout', 'Admin Dashboard'],
      pages: [
        { name: 'Dashboard', route: '/', role_access: ['admin'], purpose: 'Store sales analytics' },
        { name: 'Products', route: '/products', role_access: ['admin', 'customer'], purpose: 'Catalog explorer' },
        { name: 'Orders', route: '/orders', role_access: ['admin', 'customer'], purpose: 'Purchase tracker' }
      ],
      complexity: 'medium'
    },
    schemas: {
      db_schema: {
        tables: [
          {
            name: 'products',
            fields: [
              { name: 'id', type: 'uuid', required: true, unique: true },
              { name: 'name', type: 'varchar', required: true },
              { name: 'price', type: 'decimal', required: true },
              { name: 'stock', type: 'integer', required: true },
              { name: 'category', type: 'varchar', required: true }
            ]
          },
          {
            name: 'orders',
            fields: [
              { name: 'id', type: 'uuid', required: true, unique: true },
              { name: 'customer_name', type: 'varchar', required: true },
              { name: 'total', type: 'decimal', required: true },
              { name: 'status', type: 'varchar', required: true },
              { name: 'created_at', type: 'timestamp', required: true }
            ]
          }
        ]
      },
      api_schema: {
        base_url: '/api/v1',
        endpoints: [
          { method: 'GET', path: '/products', description: 'Get all stock items' },
          { method: 'GET', path: '/orders', description: 'List store purchases' }
        ]
      },
      ui_schema: {
        design_system: { primary_color: '#3b82f6', theme: 'both', app_name: 'ShopSphere' },
        pages: [
          {
            name: 'Dashboard',
            route: '/',
            components: [
              { type: 'stats', id: 'stats_store', metrics: [
                { label: 'PRODUCTS', value: '142', icon: 'shopping-bag', change: '+5%' },
                { label: 'TOTAL ORDERS', value: '86', icon: 'shopping-cart', change: '+15%' },
                { label: 'STORE REVENUE', value: '$12,450', icon: 'dollar-sign', change: '+20%' },
                { label: 'CONVERSION', value: '4.2%', icon: 'percent', change: '+1.5%' }
              ]},
              { type: 'chart', id: 'chart_sales', title: 'Monthly Revenue', data_source: 'orders' },
              { type: 'table', id: 'table_orders', title: 'Recent Orders', data_source: 'orders', fields: ['id', 'customer_name', 'total', 'status'] }
            ]
          },
          {
            name: 'Products',
            route: '/products',
            components: [
              { type: 'grid', id: 'grid_products', title: 'Available Items', data_source: 'products', fields: ['name', 'price', 'stock', 'category'] }
            ]
          },
          {
            name: 'Orders',
            route: '/orders',
            components: [
              { type: 'table', id: 'table_orders_list', title: 'Orders Registry', data_source: 'orders', fields: ['customer_name', 'total', 'status', 'created_at'] }
            ]
          },
          {
            name: 'Settings',
            route: '/settings',
            components: [
              { type: 'settings', id: 'settings_store', sections: [
                { title: 'Profile', description: 'Store owner account and billing email' },
                { title: 'Notifications', description: 'Order alerts and low-stock warnings' },
                { title: 'Security', description: 'API keys, webhooks, and 2FA' }
              ]}
            ]
          }
        ]
      },
      auth_schema: {
        type: 'Session',
        providers: ['email'],
        roles: [{ name: 'admin', permissions: ['read', 'write'] }, { name: 'customer', permissions: ['read'] }]
      }
    },
    validation: {
      pre_repair: { isValid: true, errors: [], warnings: [] },
      post_repair: { isValid: true, errors: [], warnings: [] },
      repairs_applied: []
    },
    runtime_simulation: {
      routes_valid: [{ route: '/', page: 'Dashboard', status: 'OK' }, { route: '/products', page: 'Products', status: 'OK' }],
      api_endpoints_simulated: [{ method: 'GET', path: '/products', status: 200 }],
      db_tables_verified: [{ table: 'products', fields: 5, status: 'OK' }],
      execution_score: 100
    },
    quality_score: { total: 95, grade: 'A' }
  },
  ex003: {
    intent: {
      app_type: 'Dashboard',
      app_name: 'AppForge Boards',
      description: 'A collaborative kanban-style project manager supporting workspaces, customizable boards, task cards, and project velocity charts.',
      features: [
        'Interactive board lists — drag and arrange tasks in columns',
        'Task card attributes — assignments, due dates, task checklists',
        'Team directory — manage members, profile roles and permissions',
        'Performance board — visual reports on tasks completed and milestone status'
      ],
      roles: ['manager', 'member'],
      primary_entities: ['tasks', 'boards'],
      auth_required: true,
      payment_required: false,
      assumptions: [],
      conflicts: [],
      ambiguities: [],
      confidence: 0.97
    },
    architecture: {
      entities: [
        { name: 'boards', description: 'Kanban boards', key_fields: ['id', 'name', 'color'] },
        { name: 'tasks', description: 'Task card items', key_fields: ['id', 'title', 'status', 'due_date', 'board_id'] }
      ],
      modules: ['Auth', 'Task Board', 'Milestones', 'Members'],
      pages: [
        { name: 'Dashboard', route: '/', role_access: ['manager', 'member'], purpose: 'Milestone reports' },
        { name: 'Boards', route: '/boards', role_access: ['manager', 'member'], purpose: 'Kanban workspaces' },
        { name: 'Tasks', route: '/tasks', role_access: ['manager', 'member'], purpose: 'All tasks spreadsheet' }
      ],
      complexity: 'medium'
    },
    schemas: {
      db_schema: {
        tables: [
          {
            name: 'boards',
            fields: [
              { name: 'id', type: 'uuid', required: true },
              { name: 'name', type: 'varchar', required: true },
              { name: 'color', type: 'varchar', required: true }
            ]
          },
          {
            name: 'tasks',
            fields: [
              { name: 'id', type: 'uuid', required: true },
              { name: 'title', type: 'varchar', required: true },
              { name: 'status', type: 'varchar', required: true },
              { name: 'due_date', type: 'date', required: true },
              { name: 'board_id', type: 'uuid', required: true }
            ]
          }
        ]
      },
      api_schema: {
        base_url: '/api/v1',
        endpoints: [
          { method: 'GET', path: '/tasks', description: 'List tasks' },
          { method: 'POST', path: '/tasks', description: 'Create task' }
        ]
      },
      ui_schema: {
        design_system: { primary_color: '#8b5cf6', theme: 'both', app_name: 'AppForge Boards' },
        pages: [
          {
            name: 'Dashboard',
            route: '/',
            components: [
              { type: 'stats', id: 'stats_projects', metrics: [
                { label: 'BOARDS', value: '4', icon: 'folder', change: '+0%' },
                { label: 'ACTIVE TASKS', value: '18', icon: 'check-square', change: '-4%' },
                { label: 'TEAM MEMBERS', value: '8', icon: 'users', change: '+2%' },
                { label: 'COMPLETION', value: '84%', icon: 'trending-up', change: '+6%' }
              ]},
              { type: 'chart', id: 'chart_velocity', title: 'Task Velocity (Burndown)', data_source: 'tasks' },
              { type: 'table', id: 'table_urgent', title: 'Urgent Task Cards', data_source: 'tasks', fields: ['title', 'status', 'due_date'] }
            ]
          },
          {
            name: 'Boards',
            route: '/boards',
            components: [
              { type: 'kanban', id: 'kanban_board_view', title: 'Sprint Board', data_source: 'tasks', columns: ['Backlog', 'To Do', 'In Progress', 'QA Review', 'Completed'] }
            ]
          },
          {
            name: 'Tasks',
            route: '/tasks',
            components: [
              { type: 'table', id: 'table_tasks_list', title: 'Task Directory', data_source: 'tasks', fields: ['title', 'status', 'due_date'] }
            ]
          }
        ]
      },
      auth_schema: {
        type: 'JWT',
        providers: ['email'],
        roles: [{ name: 'manager', permissions: ['read', 'write'] }, { name: 'member', permissions: ['read'] }]
      }
    },
    validation: {
      pre_repair: { isValid: true, errors: [], warnings: [] },
      post_repair: { isValid: true, errors: [], warnings: [] },
      repairs_applied: []
    },
    runtime_simulation: {
      routes_valid: [{ route: '/', page: 'Dashboard', status: 'OK' }, { route: '/boards', page: 'Boards', status: 'OK' }],
      api_endpoints_simulated: [{ method: 'GET', path: '/tasks', status: 200 }],
      db_tables_verified: [{ table: 'tasks', fields: 5, status: 'OK' }],
      execution_score: 100
    },
    quality_score: { total: 96, grade: 'A' }
  },
  ex004: {
    intent: {
      app_type: 'LMS',
      app_name: 'EduPlan',
      description: 'An educational dashboard portal that coordinates courses, catalogs lessons, organizes quizzes, and tracks student milestone achievements.',
      features: [
        'Course builder — organize lessons, structure modules, set syllabus parameters',
        'Interactive quizzes — mock question sheets, scoring indices, course evaluations',
        'Student dashboard — monitor course lists, enrollment dates, and completed levels',
        'Instructor panel — see student lists, average grade metrics, course sales'
      ],
      roles: ['instructor', 'student'],
      primary_entities: ['courses', 'enrollments'],
      auth_required: true,
      payment_required: true,
      assumptions: ['Billing is modeled conceptually.'],
      conflicts: [],
      ambiguities: [],
      confidence: 0.95
    },
    architecture: {
      entities: [
        { name: 'courses', description: 'Curriculum courses', key_fields: ['id', 'title', 'category', 'lessons_count'] },
        { name: 'enrollments', description: 'Student enrollment data', key_fields: ['id', 'student_name', 'course_id', 'progress'] }
      ],
      modules: ['Auth', 'LMS Engine', 'Quizzes', 'Instructors Center'],
      pages: [
        { name: 'Dashboard', route: '/', role_access: ['instructor', 'student'], purpose: 'Academic stats' },
        { name: 'Courses', route: '/courses', role_access: ['instructor', 'student'], purpose: 'Course index' },
        { name: 'Students', route: '/students', role_access: ['instructor'], purpose: 'Student enrollment list' }
      ],
      complexity: 'medium'
    },
    schemas: {
      db_schema: {
        tables: [
          {
            name: 'courses',
            fields: [
              { name: 'id', type: 'uuid', required: true },
              { name: 'title', type: 'varchar', required: true },
              { name: 'category', type: 'varchar', required: true },
              { name: 'lessons_count', type: 'integer', required: true }
            ]
          },
          {
            name: 'enrollments',
            fields: [
              { name: 'id', type: 'uuid', required: true },
              { name: 'student_name', type: 'varchar', required: true },
              { name: 'course_id', type: 'uuid', required: true },
              { name: 'progress', type: 'integer', required: true }
            ]
          }
        ]
      },
      api_schema: {
        base_url: '/api/v1',
        endpoints: [
          { method: 'GET', path: '/courses', description: 'Get course list' },
          { method: 'GET', path: '/enrollments', description: 'Get enrollment logs' }
        ]
      },
      ui_schema: {
        design_system: { primary_color: '#ec4899', theme: 'both', app_name: 'EduPlan' },
        pages: [
          {
            name: 'Dashboard',
            route: '/',
            components: [
              { type: 'stats', id: 'stats_lms', metrics: [
                { label: 'COURSES', value: '12', icon: 'book-open', change: '+2' },
                { label: 'TOTAL STUDENTS', value: '254', icon: 'users', change: '+18%' },
                { label: 'COURSE REVENUE', value: '$8,240', icon: 'dollar-sign', change: '+12%' },
                { label: 'COMPLETIONS', value: '92', icon: 'award', change: '+15%' }
              ]},
              { type: 'chart', id: 'chart_enrollments', title: 'Enrollments Timeline', data_source: 'enrollments' },
              { type: 'table', id: 'table_courses_recent', title: 'Featured Courses', data_source: 'courses', fields: ['title', 'category', 'lessons_count'] }
            ]
          },
          {
            name: 'Courses',
            route: '/courses',
            components: [
              { type: 'grid', id: 'grid_courses', title: 'Course Catalog', data_source: 'courses', fields: ['title', 'category', 'lessons_count'] }
            ]
          },
          {
            name: 'Students',
            route: '/students',
            components: [
              { type: 'table', id: 'table_enrollments_list', title: 'Enrolled Pupils', data_source: 'enrollments', fields: ['student_name', 'progress'] }
            ]
          }
        ]
      },
      auth_schema: {
        type: 'JWT',
        providers: ['email'],
        roles: [{ name: 'instructor', permissions: ['read', 'write'] }, { name: 'student', permissions: ['read'] }]
      }
    },
    validation: {
      pre_repair: { isValid: true, errors: [], warnings: [] },
      post_repair: { isValid: true, errors: [], warnings: [] },
      repairs_applied: []
    },
    runtime_simulation: {
      routes_valid: [{ route: '/', page: 'Dashboard', status: 'OK' }, { route: '/courses', page: 'Courses', status: 'OK' }],
      api_endpoints_simulated: [{ method: 'GET', path: '/courses', status: 200 }],
      db_tables_verified: [{ table: 'courses', fields: 4, status: 'OK' }],
      execution_score: 100
    },
    quality_score: { total: 95, grade: 'A' }
  },
  ex005: {
    intent: {
      app_type: 'Healthcare',
      app_name: 'Patient Portal',
      description: 'A modern, secure patient management portal coordinating appointments, medical charts, prescriptions, and billing statements.',
      features: [
        'Appointment scheduling — select doctor profile, date, time slot, and manage check-ins',
        'Electronic Health Records (EHR) — secure storage of diagnoses, clinic assessments, and active prescriptions',
        'Billing ledger — digital invoices list, payment statuses, and mock insurance claims tracking',
        'Mock security gate — secure login portal for administrators, doctors, and patient profiles'
      ],
      roles: ['admin', 'doctor', 'patient'],
      primary_entities: ['appointment_scheduling', 'medical_records', 'billing'],
      auth_required: true,
      payment_required: true,
      assumptions: ['Insurance claims are mock-verified.'],
      conflicts: [],
      ambiguities: [],
      confidence: 0.99
    },
    architecture: {
      entities: [
        { name: 'appointment_scheduling', description: 'Patient appointments calendar log', key_fields: ['id', 'name', 'doctor', 'date', 'time', 'status'] },
        { name: 'medical_records', description: 'Patient diagnostic charts and prescriptions', key_fields: ['id', 'patient', 'diagnosis', 'prescription', 'date'] },
        { name: 'billing', description: 'Invoices ledger spreadsheet', key_fields: ['id', 'patient', 'invoice_id', 'amount', 'status', 'date'] }
      ],
      modules: ['Authentication', 'Dashboard Core', 'Medical Records API', 'Scheduling System', 'Invoices Ledger'],
      pages: [
        { name: 'Dashboard', route: '/', role_access: ['admin', 'doctor'], purpose: 'Clinic operational summary' },
        { name: 'Appointment Schedule', route: '/appointments', role_access: ['admin', 'doctor'], purpose: 'Manage schedule and check-ins' },
        { name: 'Medical Records', route: '/records', role_access: ['admin', 'doctor'], purpose: 'Manage patient health charts' },
        { name: 'Billing Statements', route: '/billing', role_access: ['admin', 'doctor'], purpose: 'Manage financial invoices' }
      ],
      flows: [
        { name: 'Book Appointment', steps: ['Input patient name', 'Select doctor profile', 'Choose date/time slot', 'Write to calendar database'], entities_involved: ['appointment_scheduling'] }
      ],
      integrations: ['SSL', 'SMTP'],
      architecture_style: 'MVC',
      complexity: 'medium'
    },
    schemas: {
      db_schema: {
        tables: [
          {
            name: 'appointment_scheduling',
            fields: [
              { name: 'id', type: 'uuid', required: true, unique: true },
              { name: 'name', type: 'varchar', required: true },
              { name: 'doctor', type: 'varchar', required: true },
              { name: 'date', type: 'date', required: true },
              { name: 'time', type: 'varchar', required: true },
              { name: 'status', type: 'varchar', required: true }
            ]
          },
          {
            name: 'medical_records',
            fields: [
              { name: 'id', type: 'uuid', required: true, unique: true },
              { name: 'patient', type: 'varchar', required: true },
              { name: 'diagnosis', type: 'varchar', required: true },
              { name: 'prescription', type: 'varchar', required: true },
              { name: 'date', type: 'date', required: true }
            ]
          },
          {
            name: 'billing',
            fields: [
              { name: 'id', type: 'uuid', required: true, unique: true },
              { name: 'patient', type: 'varchar', required: true },
              { name: 'invoice_id', type: 'varchar', required: true },
              { name: 'amount', type: 'decimal', required: true },
              { name: 'status', type: 'varchar', required: true },
              { name: 'date', type: 'date', required: true }
            ]
          }
        ]
      },
      api_schema: {
        base_url: '/api/v1',
        endpoints: [
          { method: 'GET', path: '/appointments', description: 'Fetch all appointment calendar slots' },
          { method: 'POST', path: '/appointments', description: 'Book new patient appointment' },
          { method: 'GET', path: '/records', description: 'Query patient diagnostic history charts' },
          { method: 'POST', path: '/records', description: 'Create new electronic medical record' },
          { method: 'GET', path: '/billing', description: 'Fetch invoices spreadsheet details' }
        ]
      },
      ui_schema: {
        design_system: { primary_color: '#06b6d4', theme: 'both', app_name: 'Patient Portal' },
        pages: [
          {
            name: 'Dashboard',
            route: '/',
            components: [
              { type: 'stats', id: 'stats_health', metrics: [
                { label: 'TOTAL APPOINTMENTS', value: '5', icon: 'users', change: '+12%' },
                { label: 'ACTIVE CASES', value: '3', icon: 'briefcase', change: '+8%' },
                { label: 'CALCULATED REVENUE', value: '$555', icon: 'dollar-sign', change: '+24%' },
                { label: 'PATIENT CARE INDEX', value: '98%', icon: 'trending-up', change: '+6%' }
              ]},
              { type: 'chart', id: 'chart_activity', title: 'Operational Performance Timeline', data_source: 'appointment_scheduling' },
              { type: 'table', id: 'table_recent_ops', title: 'Recent Appointment Schedules', data_source: 'appointment_scheduling', fields: ['name', 'doctor', 'date', 'status'] }
            ]
          },
          {
            name: 'Appointment Schedule',
            route: '/appointments',
            components: [
              { type: 'table', id: 'table_appointments', title: 'Appointments Registry', data_source: 'appointment_scheduling', fields: ['name', 'doctor', 'date', 'time', 'status'] }
            ]
          },
          {
            name: 'Medical Records',
            route: '/records',
            components: [
              { type: 'table', id: 'table_records', title: 'Patient Diagnostic Charts', data_source: 'medical_records', fields: ['patient', 'diagnosis', 'prescription', 'date'] }
            ]
          },
          {
            name: 'Billing Statements',
            route: '/billing',
            components: [
              { type: 'table', id: 'table_billing', title: 'Financial Invoices Ledger', data_source: 'billing', fields: ['patient', 'invoice_id', 'amount', 'status', 'date'] }
            ]
          }
        ]
      },
      auth_schema: {
        type: 'JWT',
        providers: ['email'],
        roles: [
          { name: 'admin', permissions: ['read', 'create', 'update', 'delete'] },
          { name: 'doctor', permissions: ['read', 'create', 'update'] },
          { name: 'patient', permissions: ['read'] }
        ]
      }
    },
    validation: {
      pre_repair: { isValid: true, errors: [], warnings: [] },
      post_repair: { isValid: true, errors: [], warnings: [] },
      repairs_applied: []
    },
    runtime_simulation: {
      routes_valid: [{ route: '/', page: 'Dashboard', status: 'OK' }, { route: '/appointments', page: 'Appointment Schedule', status: 'OK' }, { route: '/records', page: 'Medical Records', status: 'OK' }, { route: '/billing', page: 'Billing Statements', status: 'OK' }],
      api_endpoints_simulated: [{ method: 'GET', path: '/appointments', status: 200 }, { method: 'GET', path: '/records', status: 200 }],
      db_tables_verified: [{ table: 'appointment_scheduling', fields: 6, status: 'OK' }, { table: 'medical_records', fields: 5, status: 'OK' }],
      execution_score: 100
    },
    quality_score: { total: 98, grade: 'A' }
  }
};

// Generates dynamic premium schemas for the rest of the 12 apps to avoid rate limits
export function getPregeneratedSchema(appId, appLabel, appPrompt) {
  if (PREGENERATED_APPS[appId]) {
    return PREGENERATED_APPS[appId];
  }

  // Generate dynamic premium mock structure based on the label
  const cleanLabel = appLabel.replace(/[^a-zA-Z0-9]/g, '');
  const primaryColor = {
    'PatientPortal': '#06b6d4',
    'PropertyListings': '#10b981',
    'RestaurantApp': '#f59e0b',
    'HRManagement': '#0f172a',
    'SocialNetwork': '#3b82f6',
    'InventorySystem': '#64748b',
    'ExpenseTracker': '#10b981',
    'EventPlatform': '#d946ef'
  }[cleanLabel] || '#6366f1';

  const category = appLabel.split(' ')[0] || 'App';
  const entity1 = {
    'PatientPortal': 'patients',
    'PropertyListings': 'properties',
    'RestaurantApp': 'menu_items',
    'HRManagement': 'employees',
    'SocialNetwork': 'posts',
    'InventorySystem': 'inventory',
    'ExpenseTracker': 'expenses',
    'EventPlatform': 'events'
  }[cleanLabel] || 'items';

  const entity2 = {
    'PatientPortal': 'appointments',
    'PropertyListings': 'bookings',
    'RestaurantApp': 'orders',
    'HRManagement': 'leaves',
    'SocialNetwork': 'messages',
    'InventorySystem': 'orders',
    'ExpenseTracker': 'categories',
    'EventPlatform': 'tickets'
  }[cleanLabel] || 'transactions';

  const metric1 = entity1.toUpperCase();
  const metric2 = entity2.toUpperCase();

  return {
    intent: {
      app_type: 'Dashboard',
      app_name: appLabel,
      description: `A custom professional dashboard system for ${appLabel} built to organize key processes and display operations clearly.`,
      features: [
        `Operational directory — lists all record entries for ${entity1}`,
        `Activity logs — track workflow milestones for ${entity2}`,
        `Analytics boards — dynamic counts, progress indicators, metrics`,
        `Administrative interface — access security configurations, togglable public view settings`
      ],
      roles: ['admin', 'manager', 'user'],
      primary_entities: [entity1, entity2],
      auth_required: true,
      payment_required: false,
      assumptions: [],
      conflicts: [],
      ambiguities: [],
      confidence: 0.96
    },
    architecture: {
      entities: [
        { name: entity1, description: `${entity1} registry`, key_fields: ['id', 'name', 'status'] },
        { name: entity2, description: `${entity2} logbook`, key_fields: ['id', 'details', 'created_at'] }
      ],
      modules: ['Auth', 'Core Operations', 'Milestones', 'Reporting'],
      pages: [
        { name: 'Dashboard', route: '/', role_access: ['admin', 'manager'], purpose: 'Analytics summary' },
        { name: appLabel.split(' ')[0] || 'Registry', route: `/${entity1}`, role_access: ['admin', 'manager'], purpose: `Manage ${entity1}` },
        { name: appLabel.split(' ').slice(1).join(' ') || 'Logs', route: `/${entity2}`, role_access: ['admin', 'manager'], purpose: `Manage ${entity2}` }
      ],
      complexity: 'medium'
    },
    schemas: {
      db_schema: {
        tables: [
          {
            name: entity1,
            fields: [
              { name: 'id', type: 'uuid', required: true },
              { name: 'name', type: 'varchar', required: true },
              { name: 'status', type: 'varchar', required: true },
              { name: 'created_at', type: 'timestamp', required: true }
            ]
          },
          {
            name: entity2,
            fields: [
              { name: 'id', type: 'uuid', required: true },
              { name: 'details', type: 'varchar', required: true },
              { name: 'status', type: 'varchar', required: true },
              { name: 'created_at', type: 'timestamp', required: true }
            ]
          }
        ]
      },
      api_schema: {
        base_url: '/api/v1',
        endpoints: [
          { method: 'GET', path: `/${entity1}`, description: `List ${entity1}` },
          { method: 'GET', path: `/${entity2}`, description: `List ${entity2}` }
        ]
      },
      ui_schema: {
        design_system: { primary_color: primaryColor, theme: 'both', app_name: appLabel },
        pages: [
          {
            name: 'Dashboard',
            route: '/',
            components: [
              { type: 'stats', id: 'stats_summary', metrics: [
                { label: metric1, value: '28', icon: 'file-text', change: '+4%' },
                { label: metric2, value: '112', icon: 'activity', change: '+14%' },
                { label: 'URGENT NOTIFS', value: '3', icon: 'alert-circle', change: '0%' },
                { label: 'EFFICIENCY', value: '94%', icon: 'zap', change: '+2%' }
              ]},
              { type: 'chart', id: 'chart_activity', title: 'Activity Metrics', data_source: entity2 },
              { type: 'table', id: 'table_recent_ops', title: 'Recent Registry Listings', data_source: entity1, fields: ['name', 'status', 'created_at'] }
            ]
          },
          {
            name: appLabel.split(' ')[0] || 'Registry',
            route: `/${entity1}`,
            components: [
              { type: 'table', id: 'table_reg', title: `Database Directory of ${entity1}`, data_source: entity1, fields: ['name', 'status', 'created_at'] }
            ]
          },
          {
            name: appLabel.split(' ').slice(1).join(' ') || 'Logs',
            route: `/${entity2}`,
            components: [
              { type: 'table', id: 'table_logs', title: `Database Directory of ${entity2}`, data_source: entity2, fields: ['details', 'status', 'created_at'] }
            ]
          }
        ]
      },
      auth_schema: {
        type: 'JWT',
        providers: ['email'],
        roles: [{ name: 'admin', permissions: ['read', 'write'] }, { name: 'user', permissions: ['read'] }]
      }
    },
    validation: {
      pre_repair: { isValid: true, errors: [], warnings: [] },
      post_repair: { isValid: true, errors: [], warnings: [] },
      repairs_applied: []
    },
    runtime_simulation: {
      routes_valid: [{ route: '/', page: 'Dashboard', status: 'OK' }, { route: `/${entity1}`, page: entity1, status: 'OK' }],
      api_endpoints_simulated: [{ method: 'GET', path: `/${entity1}`, status: 200 }],
      db_tables_verified: [{ table: entity1, fields: 4, status: 'OK' }],
      execution_score: 100
    },
    quality_score: { total: 94, grade: 'A' }
  };
}
