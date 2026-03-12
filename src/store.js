const Store = require('electron-store');
const { STORE_KEYS } = require('./constants');

const store = new Store({
  name: 'cloud-manager-config'
});

function getOrgs() {
  return store.get(STORE_KEYS.ORGS, []);
}

function saveOrg(org) {
  const orgs = getOrgs();
  const idx = orgs.findIndex(existing => existing.id === org.id);
  const saved = { ...org, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    orgs[idx] = saved;
  } else {
    if (!saved.id) saved.id = `org_${Date.now()}`;
    saved.createdAt = new Date().toISOString();
    orgs.push(saved);
  }
  store.set(STORE_KEYS.ORGS, orgs);
  return saved;
}

function deleteOrg(id) {
  const orgs = getOrgs().filter(org => org.id !== id);
  store.set(STORE_KEYS.ORGS, orgs);
  if (store.get(STORE_KEYS.ACTIVE_ORG_ID) === id) {
    store.delete(STORE_KEYS.ACTIVE_ORG_ID);
  }
  const cursors = store.get(STORE_KEYS.JOURNAL_CURSORS, {});
  if (cursors[id] !== undefined) {
    delete cursors[id];
    store.set(STORE_KEYS.JOURNAL_CURSORS, cursors);
  }
}

function setActiveOrg(id) {
  store.set(STORE_KEYS.ACTIVE_ORG_ID, id);
}

function getActiveOrgId() {
  return store.get(STORE_KEYS.ACTIVE_ORG_ID);
}

function getJournalCursor(orgId) {
  const cursors = store.get(STORE_KEYS.JOURNAL_CURSORS, {});
  return cursors[orgId] || null;
}

function setJournalCursor(orgId, cursor) {
  const cursors = store.get(STORE_KEYS.JOURNAL_CURSORS, {});
  cursors[orgId] = cursor;
  store.set(STORE_KEYS.JOURNAL_CURSORS, cursors);
}

function getSettings() {
  return store.get(STORE_KEYS.SETTINGS, {
    filterByProgram: false,
    whitelistedProgramIds: []
  });
}

function saveSettings(settings) {
  store.set(STORE_KEYS.SETTINGS, settings);
}

module.exports = {
  getOrgs,
  saveOrg,
  deleteOrg,
  setActiveOrg,
  getActiveOrgId,
  getJournalCursor,
  setJournalCursor,
  getSettings,
  saveSettings
};
