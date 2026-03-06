const { app, BrowserWindow, ipcMain, nativeImage, shell, Notification } = require('electron');
const path = require('path');
const pkg = require('../package.json');
const { APP, UI_ERRORS } = require('./constants');
const store = require('./store');
const api = require('./api');

let mainWindow;
const tokenCache = new Map(); // orgId -> { token, expiresAt }
const tailAbortMap = new Map(); // webContentsId -> { abort: true }
let journalPollTimer = null;
const activeNotifications = new Set(); // prevent GC of notification objects
const JOURNAL_POLL_MS = 60 * 1000; // 60 seconds

async function getOrgAndToken(orgId) {
  const orgs = store.getOrgs();
  const org = orgs.find(o => o.id === orgId);
  if (!org) throw new Error(UI_ERRORS.ORGANIZATION_NOT_FOUND);
  const cached = tokenCache.get(orgId);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return { org, token: cached.token };
  }
  const token = await api.getAccessToken(org);
  tokenCache.set(orgId, { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 });
  return { org, token };
}

ipcMain.handle('get-orgs', () => store.getOrgs());
ipcMain.handle('save-org', (_, org) => store.saveOrg(org));
ipcMain.handle('delete-org', (_, id) => store.deleteOrg(id));
ipcMain.handle('set-active-org', (_, id) => store.setActiveOrg(id));
ipcMain.handle('get-active-org-id', () => store.getActiveOrgId());
ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
ipcMain.handle('get-settings', () => store.getSettings());
ipcMain.handle('save-settings', (_, settings) => store.saveSettings(settings));

function formatJournalEventTitle(ev) {
  const eventType = ev?.event?.['@type'] || '';
  const objectType = ev?.event?.['xdmEventEnvelope:objectType'] || '';
  const typeMatch = eventType.match(/\/event\/(\w+)$/);
  const action = typeMatch ? typeMatch[1] : eventType.split('/').pop() || 'Event';
  if (objectType.includes('execution-step-state')) {
    return `Step ${action}`;
  }
  if (objectType.includes('pipeline-execution')) {
    return `Pipeline ${action}`;
  }
  return `Cloud Manager: ${action}`;
}

function formatJournalEventBody(ev, execIds) {
  const published = ev?.event?.['activitystreams:published'];
  const parts = [];
  if (execIds) {
    parts.push(`Program ${execIds.programId} · Pipeline ${execIds.pipelineId}`);
    parts.push(`Execution ${execIds.executionId}`);
  }
  if (published) parts.push(new Date(published).toLocaleString());
  return parts.join(' • ');
}

function parseExecutionUrlFromEvent(ev) {
  const obj = ev?.event?.['activitystreams:object'];
  const idUrl = obj?.['@id'];
  if (!idUrl || typeof idUrl !== 'string') return null;
  const m = idUrl.match(/\/program\/([^/]+)\/pipeline\/([^/]+)\/execution\/([^/]+)/);
  return m ? { programId: m[1], pipelineId: m[2], executionId: m[3] } : null;
}

async function pollJournal() {
  const activeId = store.getActiveOrgId();
  if (!activeId) { console.log('[Journal] No active org, skipping poll'); return; }
  const orgs = store.getOrgs();
  const org = orgs.find(o => o.id === activeId);
  if (!org?.journalEndpoint?.trim()) { console.log('[Journal] No journal endpoint for active org, skipping'); return; }
  try {
    const { org: activeOrg, token } = await getOrgAndToken(activeId);
    let after = store.getJournalCursor(activeId);

    // Seed: no cursor yet — page forward quickly to catch up to "now" without notifying
    if (!after) {
      console.log('[Journal] No cursor — seeding to current position...');
      let pageCount = 0;
      while (pageCount < 100) {
        const data = await api.getJournalEvents(activeOrg, token, after);
        const events = data?.events ?? [];
        const last = data?._page?.last;
        console.log('[Journal] Seed page', ++pageCount, '— events:', events.length, ', cursor:', last ? last.substring(0, 40) + '...' : 'none');
        if (last) {
          after = last;
          store.setJournalCursor(activeId, last);
        } else if (events.length > 0) {
          const pos = events[events.length - 1]?.position;
          if (pos) { after = pos; store.setJournalCursor(activeId, pos); }
        }
        if (events.length === 0 || !last) {
          console.log('[Journal] Seed complete — ready for notifications');
          break;
        }
      }
      return;
    }

    // Normal poll: cursor exists, fetch new events and notify
    console.log('[Journal] Polling — cursor:', after.substring(0, 60) + '...');
    const data = await api.getJournalEvents(activeOrg, token, after);
    const events = data?.events ?? [];
    const settings = store.getSettings();
    const whitelist = settings.filterByProgram && settings.whitelistedProgramIds?.length
      ? new Set(settings.whitelistedProgramIds.map(String))
      : null;
    console.log('[Journal] Got', events.length, 'events, filter:', whitelist ? `whitelist [${[...whitelist]}]` : 'off');
    for (const item of events) {
      try {
        const execIds = parseExecutionUrlFromEvent(item);
        if (whitelist && (!execIds || !whitelist.has(String(execIds.programId)))) {
          continue;
        }
        const title = formatJournalEventTitle(item);
        const body = formatJournalEventBody(item, execIds);
        console.log('[Journal] Notification:', title, '|', body);
        const n = new Notification({ title, body });
        activeNotifications.add(n);
        n.on('close', () => activeNotifications.delete(n));
        if (execIds) {
          const orgIdForEvent = activeId;
          n.on('click', () => {
            console.log('[Journal] Notification clicked — navigating to', JSON.stringify(execIds));
            if (!mainWindow || mainWindow.isDestroyed()) return;
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('navigate-to-execution', { ...execIds, orgId: orgIdForEvent });
            activeNotifications.delete(n);
          });
        }
        n.show();
      } catch (notifErr) {
        console.error('[Journal] Notification error:', notifErr.message);
      }
    }
    const last = data?._page?.last;
    if (last) {
      store.setJournalCursor(activeId, last);
      console.log('[Journal] Cursor updated');
    }
  } catch (e) {
    console.error('[Journal] Poll error:', e.message);
  }
}

function startJournalPolling() {
  if (journalPollTimer) return;
  console.log('[Journal] Starting polling every', JOURNAL_POLL_MS / 1000, 'seconds');
  console.log('[Journal] Notifications supported:', Notification.isSupported());
  journalPollTimer = setInterval(pollJournal, JOURNAL_POLL_MS);
  pollJournal();
}

function stopJournalPolling() {
  if (journalPollTimer) {
    clearInterval(journalPollTimer);
    journalPollTimer = null;
  }
}

ipcMain.handle('get-token', async (_, orgId) => {
  const { token } = await getOrgAndToken(orgId);
  return token;
});

ipcMain.handle('api:programs', async (_, orgId) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getPrograms(org, token);
});

ipcMain.handle('api:program', async (_, orgId, programId) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getProgram(org, token, programId);
});

ipcMain.handle('api:pipelines', async (_, orgId, programId) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getPipelines(org, token, programId);
});

ipcMain.handle('api:pipeline', async (_, orgId, programId, pipelineId) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getPipeline(org, token, programId, pipelineId);
});

ipcMain.handle('api:executions', async (_, orgId, programId, pipelineId, options = {}) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getExecutions(org, token, programId, pipelineId, options);
});

ipcMain.handle('api:current-execution', async (_, orgId, programId, pipelineId) => {
  const { org, token } = await getOrgAndToken(orgId);
  try {
    return await api.getCurrentExecution(org, token, programId, pipelineId);
  } catch (e) {
    if (e.message?.includes('404') || e.message?.includes('No execution in progress') || e.message?.includes('Pipeline Execution not found')) {
      return null;
    }
    throw e;
  }
});

ipcMain.handle('api:execution', async (_, orgId, programId, pipelineId, executionId) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getExecution(org, token, programId, pipelineId, executionId);
});

ipcMain.handle('api:start-pipeline', async (_, orgId, programId, pipelineId, options = {}) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.startPipeline(org, token, programId, pipelineId, options);
});

ipcMain.handle('api:advance-step', async (_, orgId, programId, pipelineId, executionId, phaseId, stepId, body) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.advanceStep(org, token, programId, pipelineId, executionId, phaseId, stepId, body);
});

ipcMain.handle('api:cancel-step', async (_, orgId, programId, pipelineId, executionId, phaseId, stepId, body) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.cancelStep(org, token, programId, pipelineId, executionId, phaseId, stepId, body);
});

ipcMain.handle('api:environments', async (_, orgId, programId) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getEnvironments(org, token, programId);
});

ipcMain.handle('api:environment', async (_, orgId, programId, environmentId) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getEnvironment(org, token, programId, environmentId);
});

ipcMain.handle('api:environment-variables', async (_, orgId, programId, environmentId) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getEnvironmentVariables(org, token, programId, environmentId);
});

ipcMain.handle('api:environment-logs', async (_, orgId, programId, environmentId) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getEnvironmentLogs(org, token, programId, environmentId);
});

ipcMain.handle('api:environment-log-download-url', async (_, orgId, programId, environmentId, service, name, date) => {
  const { org, token } = await getOrgAndToken(orgId);
  return api.getEnvironmentLogDownloadUrl(org, token, programId, environmentId, service, name, date);
});

ipcMain.handle('api:environment-log-tail-url', async (_, orgId, programId, environmentId, service, name) => {
  try {
    const { org, token } = await getOrgAndToken(orgId);
    const url = await api.getEnvironmentLogTailUrl(org, token, programId, environmentId, service, name);
    console.log('[Log Tail] Got tail URL for', service, name);
    return url;
  } catch (e) {
    console.error('[Log Tail] Failed to get tail URL:', e.message);
    throw e;
  }
});

ipcMain.handle('api:start-log-tail', (event, tailUrl) => {
  const webContents = event.sender;
  const id = webContents.id;
  tailAbortMap.set(id, { abort: false });
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const isAborted = () => tailAbortMap.get(id)?.abort ?? true;

  (async () => {
    let currentStart = 0;
    try {
      while (!isAborted()) {
        const res = await fetch(tailUrl, { headers: { Range: `bytes=${currentStart}-` } });
        if (res.status === 206) {
          const text = await res.text();
          const len = res.headers.get('content-length');
          if (text) webContents.send('log-tail-chunk', text);
          currentStart += parseInt(len || '0', 10) || text.length;
        } else if (res.status === 416 || res.status === 404) {
          await sleep(2000);
        } else {
          webContents.send('log-tail-error', { message: `HTTP ${res.status}` });
          break;
        }
      }
    } catch (e) {
      if (!isAborted()) webContents.send('log-tail-error', { message: e.message });
    } finally {
      tailAbortMap.delete(id);
      try { webContents.send('log-tail-done'); } catch (_) {}
    }
  })();
  return Promise.resolve();
});

ipcMain.handle('open-log-tail-window', async (_, orgId, programId, environmentId, service, name, logLabel) => {
  console.log('[Log Tail] Opening tail window for', service, name);
  const tailWin = new BrowserWindow({
    width: 900,
    height: 600,
    icon: path.join(__dirname, '..', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true
    },
    title: `${APP.LOG_TAIL_TITLE_PREFIX}${logLabel || `${service}/${name}`}`
  });
  tailWin.webContents.openDevTools({ mode: 'detach' }); // Open DevTools to see console/errors
  const wcId = tailWin.webContents.id;
  tailWin.loadFile(path.join(__dirname, 'log-tail.html'));
  tailWin.webContents.on('did-finish-load', () => {
    console.log('[Log Tail] Window loaded, sending params');
    setTimeout(() => tailWin.webContents.send('log-tail-params', { orgId, programId, environmentId, service, name, logLabel }), 50);
  });
  tailWin.on('closed', () => {
    tailAbortMap.set(wcId, { abort: true });
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '..', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: APP.NAME
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external URLs (http/https) in system browser instead of in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  app.setName(APP.NAME);
  app.setAboutPanelOptions({
    applicationName: APP.NAME,
    applicationVersion: pkg.version,
    copyright: APP.NAME
  });
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, '..', 'icon.png');
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) app.dock.setIcon(img);
  }
  createWindow();
  startJournalPolling();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
