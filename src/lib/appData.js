// Utilities for per-app preview data (empty by default for user-generated apps)

export function appStorageKey(appId) {
  const id = (appId || 'default').toString().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `appforge_db_${id}`;
}

/** Empty tables from DB schema — no sample rows */
export function buildEmptyRecordsFromSchema(dbSchema) {
  const records = {};
  (dbSchema?.tables || []).forEach(table => {
    records[table.name] = [];
  });
  return records;
}

export function loadAppRecords(appId, dbSchema, isExampleBlueprint = false) {
  if (!isExampleBlueprint) {
    try {
      const saved = localStorage.getItem(appStorageKey(appId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return buildEmptyRecordsFromSchema(dbSchema);
  }
  return null;
}

export function saveAppRecords(appId, records) {
  try {
    localStorage.setItem(appStorageKey(appId), JSON.stringify(records));
  } catch {}
}

export function clearAppRecords(appId) {
  try {
    localStorage.removeItem(appStorageKey(appId));
  } catch {}
}
