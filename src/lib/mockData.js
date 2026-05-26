// Realistic mock rows for generated app previews — derived from DB schema when possible

const SAMPLE_NAMES = ['Sarah Chen', 'James Carter', 'Emily Watson', 'Marcus Lee', 'Priya Sharma', 'David Kim'];
const SAMPLE_COMPANIES = ['Vertex Systems', 'Northline Health', 'Apex Retail', 'Blue Harbor Co', 'Summit Labs'];
const SAMPLE_STAGES = ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const SAMPLE_STATUSES = ['Active', 'Pending', 'Completed', 'Processing', 'Cancelled'];

function pick(arr, i) {
  return arr[i % arr.length];
}

function fieldValue(field, rowIndex, tableName) {
  const name = field.name;
  const type = (field.type || '').toLowerCase();

  if (name === 'id') return `${tableName.slice(0, 3)}_${String(rowIndex + 1).padStart(3, '0')}`;
  if (name.includes('email')) return `${pick(SAMPLE_NAMES, rowIndex).toLowerCase().replace(/\s/g, '.')}@${tableName.replace(/_/g, '')}.app`;
  if (name === 'name' || name === 'title') {
    if (tableName.includes('deal')) return ['Enterprise License', 'API Integration', 'Cloud Migration', 'Platform Trial', 'Support Renewal'][rowIndex % 5];
    if (tableName.includes('product')) return ['Wireless Headphones', 'Mechanical Keyboard', 'Leather Wallet', 'Desk Chair', 'Water Bottle'][rowIndex % 5];
    return pick(SAMPLE_NAMES, rowIndex);
  }
  if (name === 'company') return pick(SAMPLE_COMPANIES, rowIndex);
  if (name === 'customer' || name === 'customer_name' || name === 'patient') return pick(SAMPLE_NAMES, rowIndex);
  if (name === 'stage') return pick(SAMPLE_STAGES, rowIndex);
  if (name === 'status') return pick(SAMPLE_STATUSES, rowIndex);
  if (name.includes('value') || name === 'amount' || name === 'total' || name === 'price') {
    const vals = ['12500', '48000', '8900', '25600', '5200'];
    return vals[rowIndex % vals.length];
  }
  if (name === 'stock') return String(20 + rowIndex * 15);
  if (name === 'category') return ['Electronics', 'Accessories', 'Software', 'Services'][rowIndex % 4];
  if (name.includes('doctor')) return ['Dr. Sarah Smith', 'Dr. Robert Adams', 'Dr. Lisa Taylor'][rowIndex % 3];
  if (name === 'diagnosis') return ['Hypertension follow-up', 'Seasonal allergies', 'Routine checkup'][rowIndex % 3];
  if (name === 'prescription') return ['Lisinopril 10mg', 'Claritin 10mg', 'Vitamin D3'][rowIndex % 3];
  if (name === 'invoice_id') return `INV-${1100 + rowIndex}`;
  if (name === 'details') return `Workflow event #${rowIndex + 1} processed successfully`;
  if (name.includes('time')) return ['09:00 AM', '11:30 AM', '02:00 PM', '04:15 PM'][rowIndex % 4];
  if (name.includes('date') || name.includes('_at')) return `2026-05-${String(20 + rowIndex).padStart(2, '0')}`;
  if (type.includes('bool')) return rowIndex % 2 === 0;
  if (type.includes('int') || type.includes('decimal')) return 42 + rowIndex * 7;
  return `Sample ${name.replace(/_/g, ' ')}`;
}

/** Sample data only for curated example blueprints — never for user-generated apps */
export function buildRecordsFromSchema(dbSchema, intent, appType, appName, { seedSamples = false } = {}) {
  const tables = dbSchema?.tables || [];
  if (!seedSamples) {
    const empty = {};
    tables.forEach(table => { empty[table.name] = []; });
    return Object.keys(empty).length ? empty : legacyRecords(appType, appName);
  }

  if (!tables.length) {
    return legacyRecords(appType, appName);
  }

  const records = {};
  tables.forEach((table, tIdx) => {
    const rowCount = table.name.includes('log') ? 3 : 5;
    records[table.name] = Array.from({ length: rowCount }, (_, i) => {
      const row = {};
      (table.fields || []).forEach(f => {
        row[f.name] = fieldValue(f, i + tIdx, table.name);
      });
      if (table.name === 'deals' && !row.customer) {
        row.customer = pick(SAMPLE_NAMES, i);
      }
      return row;
    });
  });
  return records;
}

function legacyRecords(appType, appName) {
  const type = (appType || '').toUpperCase();
  const name = (appName || '').toLowerCase();

  if (type.includes('CRM')) {
    return {
      customers: [
        { id: 'c_001', name: 'Sarah Chen', email: 'sarah@chen.com', company: 'Chen Tech', status: 'Active', created_at: '2026-05-12' },
        { id: 'c_002', name: 'James Carter', email: 'j.carter@vertex.io', company: 'Vertex Systems', status: 'Active', created_at: '2026-05-15' },
        { id: 'c_003', name: 'David Lee', email: 'dlee@quantum.co', company: 'Quantum Labs', status: 'Active', created_at: '2026-05-18' },
      ],
      deals: [
        { id: 'd_001', title: 'Enterprise Platform License', value: '48000', stage: 'Negotiation', customer: 'Sarah Chen', created_at: '2026-05-20' },
        { id: 'd_002', title: 'API Integration Consulting', value: '12500', stage: 'Contacted', customer: 'James Carter', created_at: '2026-05-22' },
        { id: 'd_003', title: 'Cloud Infrastructure Upgrade', value: '21000', stage: 'Won', customer: 'David Lee', created_at: '2026-05-23' },
      ],
    };
  }

  if (type.includes('COMMERCE') || type.includes('SHOP')) {
    return {
      products: [
        { id: 'p_001', name: 'Wireless Headphones', price: '99.99', stock: '45', category: 'Electronics' },
        { id: 'p_002', name: 'Mechanical Keyboard', price: '129.99', stock: '20', category: 'Electronics' },
        { id: 'p_003', name: 'Leather Wallet', price: '45.00', stock: '100', category: 'Accessories' },
      ],
      orders: [
        { id: 'ord_001', customer_name: 'Bob Ross', total: '99.99', status: 'Completed', created_at: '2026-05-24' },
        { id: 'ord_002', customer_name: 'Alice Cooper', total: '259.98', status: 'Pending', created_at: '2026-05-25' },
      ],
    };
  }

  if (type.includes('HEALTH') || name.includes('patient') || name.includes('med')) {
    return {
      appointment_scheduling: [
        { id: 'apt_001', name: 'John Doe', doctor: 'Dr. Sarah Smith', date: '2026-05-27', time: '10:00 AM', status: 'Confirmed' },
        { id: 'apt_002', name: 'Jane Green', doctor: 'Dr. Robert Adams', date: '2026-05-28', time: '11:30 AM', status: 'Pending' },
      ],
      medical_records: [
        { id: 'rec_001', patient: 'John Doe', diagnosis: 'Chronic Hypertension', prescription: 'Lisinopril 10mg daily', date: '2026-05-20' },
        { id: 'rec_002', patient: 'Jane Green', diagnosis: 'Seasonal Allergies', prescription: 'Claritin 10mg', date: '2026-05-25' },
      ],
      billing: [
        { id: 'bill_001', patient: 'John Doe', invoice_id: 'INV-1092', amount: '150', status: 'Paid', date: '2026-05-20' },
        { id: 'bill_002', patient: 'Jane Green', invoice_id: 'INV-1104', amount: '320', status: 'Pending', date: '2026-05-25' },
      ],
    };
  }

  return {
    records: [
      { id: 'r_001', name: 'Operations Registry A', status: 'Active', created_at: '2026-05-20' },
      { id: 'r_002', name: 'Operations Registry B', status: 'Pending', created_at: '2026-05-22' },
      { id: 'r_003', name: 'Operations Registry C', status: 'Active', created_at: '2026-05-24' },
    ],
  };
}

export function resolveTableKeyForPage(page, dbRecords, fallbackKey) {
  const components = page?.components || [];
  const fromComp = components.find(c => c.data_source && dbRecords[c.data_source] && ['table', 'kanban', 'grid'].includes(c.type))?.data_source
    || components.find(c => c.data_source && dbRecords[c.data_source])?.data_source;
  if (fromComp) return fromComp;

  const pageName = (page?.name || '').toLowerCase();
  const keys = Object.keys(dbRecords);
  const match = keys.find(k => pageName.includes(k.replace(/_/g, ' ')) || pageName.includes(k));
  if (match) return match;

  if (pageName.includes('appoint') || pageName.includes('schedul')) return keys.find(k => k.includes('appoint')) || fallbackKey;
  if (pageName.includes('patient') || pageName.includes('record')) return keys.find(k => k.includes('record') || k.includes('medical')) || fallbackKey;
  if (pageName.includes('bill') || pageName.includes('invoice')) return keys.find(k => k.includes('bill')) || fallbackKey;
  if (pageName.includes('deal') || pageName.includes('pipeline')) return keys.find(k => k === 'deals') || fallbackKey;
  if (pageName.includes('customer') || pageName.includes('client')) return keys.find(k => k === 'customers') || fallbackKey;
  if (pageName.includes('product')) return keys.find(k => k === 'products') || fallbackKey;
  if (pageName.includes('order')) return keys.find(k => k === 'orders') || fallbackKey;
  if (pageName.includes('setting')) return null;

  return fallbackKey || keys[0];
}
