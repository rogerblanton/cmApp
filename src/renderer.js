const api = window.electronAPI;
const C = api.constants;

let state = {
  activeOrgId: null,
  selectedProgram: null,
  selectedPipeline: null,
  selectedEnvironment: null,
  selectedExecution: null,
  programs: [],
  pipelines: [],
  environments: [],
  executions: []
};

const CURRENT_EXECUTION_POLL_MS = 30 * 1000; // 30 seconds
let currentExecutionPollTimer = null;

function stopCurrentExecutionPoll() {
  if (currentExecutionPollTimer) {
    clearInterval(currentExecutionPollTimer);
    currentExecutionPollTimer = null;
  }
}

// --- DOM ---
const orgSelect = document.getElementById('orgSelect');
const addOrgBtn = document.getElementById('addOrgBtn');
const manageOrgsBtn = document.getElementById('manageOrgsBtn');
const programList = document.getElementById('programList');
const pipelineList = document.getElementById('pipelineList');
const pipelineSection = document.getElementById('pipelineSection');
const environmentList = document.getElementById('environmentList');
const environmentSection = document.getElementById('environmentSection');
const refreshPrograms = document.getElementById('refreshPrograms');
const welcome = document.getElementById('welcome');
const detailPanel = document.getElementById('detailPanel');
const breadcrumb = document.getElementById('breadcrumb');
const detailContent = document.getElementById('detailContent');
const errorBox = document.getElementById('errorBox');
const orgModal = document.getElementById('orgModal');
const orgForm = document.getElementById('orgForm');
const manageOrgsModal = document.getElementById('manageOrgsModal');
const settingsModal = document.getElementById('settingsModal');

// --- Helpers ---
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
  setTimeout(() => { errorBox.style.display = 'none'; }, 8000);
}

function clearError() {
  errorBox.style.display = 'none';
}

function hideWelcome() {
  welcome.style.display = 'none';
  detailPanel.style.display = 'block';
}

function showWelcome() {
  welcome.style.display = 'block';
  detailPanel.style.display = 'none';
}

// --- Org switching ---
async function loadOrgs() {
  const orgs = await api.getOrgs();
  const activeId = await api.getActiveOrgId();
  orgSelect.innerHTML = '';
  if (orgs.length === 0) {
    orgSelect.innerHTML = `<option value="">${C.UI_EMPTY.ADD_ORG_FIRST}</option>`;
  } else {
    orgs.forEach(org => {
      const opt = document.createElement('option');
      opt.value = org.id;
      opt.textContent = org.name || org.organizationId || org.id;
      if (org.id === activeId) opt.selected = true;
      orgSelect.appendChild(opt);
    });
  }
  state.activeOrgId = activeId || (orgs[0]?.id);
  orgSelect.disabled = orgs.length === 0;
  if (state.activeOrgId) await api.setActiveOrg(state.activeOrgId);
  onOrgChange();
}

async function onOrgChange() {
  state.activeOrgId = orgSelect.value;
  if (state.activeOrgId) {
    await api.setActiveOrg(state.activeOrgId);
    hideWelcome();
    await refreshProgramsList();
  } else {
    showWelcome();
    programList.innerHTML = `<p class="empty">${C.UI_EMPTY.SELECT_ORG_REFRESH}</p>`;
    pipelineSection.style.display = 'none';
    environmentSection.style.display = 'none';
  }
}

// --- Programs ---
async function refreshProgramsList() {
  if (!state.activeOrgId) return;
  clearError();
  programList.innerHTML = `<p class="empty">${C.UI_EMPTY.LOADING_PROGRAMS}</p>`;
  try {
    const programs = await api.getPrograms(state.activeOrgId);
    state.programs = programs;
    renderProgramList();
    pipelineSection.style.display = 'none';
    environmentSection.style.display = 'none';
    state.selectedProgram = null;
    state.selectedPipeline = null;
    state.selectedEnvironment = null;
    hideWelcome();
    breadcrumb.innerHTML = '';
    detailContent.innerHTML = `<p class="welcome">${C.UI_EMPTY.SELECT_PROGRAM}</p>`;
  } catch (error) {
    showError(error?.message ?? 'Unknown error');
    programList.innerHTML = `<p class="empty">${C.UI_EMPTY.ERROR_LOADING_PROGRAMS}</p>`;
  }
}

function renderProgramList() {
  programList.innerHTML = '';
  if (!state.programs.length) {
    programList.innerHTML = `<p class="empty">${C.UI_EMPTY.NO_PROGRAMS}</p>`;
    return;
  }
  state.programs.forEach(program => {
    const div = document.createElement('div');
    div.className = 'list-item' + (state.selectedProgram?.id === program.id ? ' selected' : '');
    div.textContent = program.name || program.id;
    div.dataset.id = program.id;
    div.onclick = () => selectProgram(program);
    programList.appendChild(div);
  });
}

async function selectProgram(program) {
  state.selectedProgram = program;
  state.selectedPipeline = null;
  state.selectedEnvironment = null;
  state.selectedExecution = null;
  renderProgramList();
  hideWelcome();
  pipelineSection.style.display = 'block';
  environmentSection.style.display = 'block';
  pipelineList.innerHTML = `<p class="empty">${C.UI_EMPTY.LOADING_PIPELINES}</p>`;
  environmentList.innerHTML = `<p class="empty">${C.UI_EMPTY.LOADING_ENVIRONMENTS}</p>`;
  clearError();
  try {
    const [pipelines, environments] = await Promise.all([
      api.getPipelines(state.activeOrgId, program.id),
      api.getEnvironments(state.activeOrgId, program.id).catch(() => [])
    ]);
    state.pipelines = pipelines;
    state.environments = environments;
    renderPipelineList();
    renderEnvironmentList();
    showProgramDetail(program);
  } catch (error) {
    showError(error?.message ?? 'Unknown error');
    pipelineList.innerHTML = `<p class="empty">${C.UI_EMPTY.ERROR_LOADING_PROGRAMS}</p>`;
    environmentList.innerHTML = `<p class="empty">${C.UI_EMPTY.ERROR_LOADING}</p>`;
  }
}

function renderPipelineList() {
  pipelineList.innerHTML = '';
  state.pipelines.forEach(pipeline => {
    const div = document.createElement('div');
    div.className = 'list-item' + (state.selectedPipeline?.id === pipeline.id ? ' selected' : '');
    div.textContent = pipeline.name || pipeline.id;
    div.dataset.id = pipeline.id;
    div.onclick = () => selectPipeline(pipeline);
    pipelineList.appendChild(div);
  });
}

function renderEnvironmentList() {
  environmentList.innerHTML = '';
  if (!state.environments?.length) {
    environmentList.innerHTML = `<p class="empty">${C.UI_EMPTY.NO_ENVIRONMENTS}</p>`;
    return;
  }
  state.environments.forEach(environment => {
    const div = document.createElement('div');
    div.className = 'list-item' + (state.selectedEnvironment?.id === environment.id ? ' selected' : '');
    div.textContent = environment.name || environment.id;
    div.dataset.id = environment.id;
    div.onclick = () => selectEnvironment(environment);
    environmentList.appendChild(div);
  });
}

async function selectPipeline(pipeline) {
  state.selectedPipeline = pipeline;
  state.selectedEnvironment = null;
  state.selectedExecution = null;
  renderPipelineList();
  renderEnvironmentList();
  hideWelcome();
  clearError();
  try {
    await showPipelineDetail(pipeline);
  } catch (error) {
    showError(error?.message ?? 'Unknown error');
  }
}

async function selectEnvironment(env) {
  state.selectedEnvironment = env;
  state.selectedPipeline = null;
  state.selectedExecution = null;
  renderPipelineList();
  renderEnvironmentList();
  hideWelcome();
  clearError();
  try {
    await showEnvironmentDetail(env);
  } catch (error) {
    showError(error?.message ?? 'Unknown error');
  }
}

// --- Detail views ---
function renderBreadcrumb(items) {
  // items: [{ label, onClick }] - onClick null/undefined = current (not clickable)
  breadcrumb.innerHTML = items.map((item, i) => {
    const cls = item.onClick ? 'crumb-link' : 'crumb-current';
    return `<span class="${cls}" data-i="${i}">${item.label}</span>`;
  }).join('');
  items.forEach((item, i) => {
    if (item.onClick) {
      const el = breadcrumb.querySelector(`.crumb-link[data-i="${i}"]`);
      if (el) el.onclick = () => item.onClick();
    }
  });
}

function showProgramDetail(program) {
  stopCurrentExecutionPoll();
  renderBreadcrumb([{ label: program.name || program.id }]);
  detailContent.innerHTML = `
    <div class="meta">
      <h3>${program.name || program.id}</h3>
      <p><strong>ID:</strong> ${program.id}</p>
      <p><strong>Enabled:</strong> ${program.enabled != null ? program.enabled : '—'}</p>
    </div>
    <pre>${JSON.stringify(program, null, 2)}</pre>
  `;
}

async function showEnvironmentDetail(env) {
  stopCurrentExecutionPoll();
  renderBreadcrumb([
    { label: state.selectedProgram?.name || state.selectedProgram?.id, onClick: () => showProgramDetail(state.selectedProgram) },
    { label: env.name || env.id }
  ]);
  detailContent.innerHTML = `<p class="welcome">${C.UI_EMPTY.LOADING_ENVIRONMENT}</p>`;
  try {
    const [environment, variables, logs] = await Promise.all([
      api.getEnvironment(state.activeOrgId, state.selectedProgram.id, env.id).catch(() => env),
      api.getEnvironmentVariables(state.activeOrgId, state.selectedProgram.id, env.id).catch(() => null),
      api.getEnvironmentLogs(state.activeOrgId, state.selectedProgram.id, env.id).catch(() => null)
    ]);
    const envData = typeof environment === 'object' && environment !== null ? environment : { ...env };
    let varsList = [];
    if (Array.isArray(variables)) varsList = variables;
    else if (variables?.variables) varsList = Array.isArray(variables.variables) ? variables.variables : [variables.variables];
    else if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
      varsList = Object.entries(variables).filter(([k]) => !k.startsWith('_')).map(([k, v]) => ({ name: k, value: v }));
    }
    let logsList = [];
    if (Array.isArray(logs)) {
      logsList = logs;
    } else if (logs && typeof logs === 'object') {
      const emb = logs._embedded;
      if (emb) {
        const arr = emb.logs ?? emb.environmentLogs ?? emb.items ?? emb['http://ns.adobe.com/adobecloud/rel/logs'];
        logsList = Array.isArray(arr) ? arr : [];
      } else {
        const arr = logs.logs ?? logs.items;
        logsList = Array.isArray(arr) ? arr : [];
      }
    }
    let varsHtml = '';
    if (varsList.length) {
      varsHtml = varsList.map(v => {
        const name = v.name ?? v.key ?? v;
        const val = typeof v === 'object' && v !== null ? (v.value ?? v.val ?? '—') : '—';
        return `<p><code>${escapeHtml(String(name))}</code>: ${escapeHtml(String(val))}</p>`;
      }).join('');
    } else {
      varsHtml = `<p class="empty">${C.UI_EMPTY.NO_VARIABLES}</p>`;
    }
    let normalizedLogs = logsList.map(l => {
      if (typeof l === 'string') return { name: l, service: '—', date: '—', raw: l };
      const name = l?.name ?? l?.logName ?? l?.file ?? l?.type ?? l?.log ?? '—';
      const service = l?.service ?? l?.aemService ?? l?.environment ?? '—';
      const date = l?.date ?? l?.logDate ?? l?.createdAt ?? l?.createdDate ?? l?.timestamp ?? '—';
      return { name, service, date, raw: l };
    });
    const tailLogTypes = [...C.LOG_TAIL_TYPES];
    const uniqueTailLogs = normalizedLogs.length
      ? [...new Map(normalizedLogs
          .filter(l => l.service && l.name && l.service !== '—' && l.name !== '—')
          .map(l => [`${l.service}|${l.name}`, { service: l.service, name: l.name }])
        ).values()]
      : tailLogTypes;
    if (normalizedLogs.length === 0) {
      const fallbackLogs = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() - d);
        const dateStr = date.toISOString().slice(0, 10);
        tailLogTypes.forEach(lt => fallbackLogs.push({ ...lt, date: dateStr }));
      }
      fallbackLogs.sort((a, b) => (b.date + b.service + b.name).localeCompare(a.date + a.service + a.name));
      normalizedLogs = fallbackLogs;
    }
    const tailSectionHtml = uniqueTailLogs.length
      ? `<div class="log-tail-section">          
          <div class="log-tail-btns">
            ${uniqueTailLogs.map(({ service, name }) => {
              const label = `${formatServiceDisplay(service)} / ${name}`;
              return `<button class="log-tail-btn" data-service="${escapeHtml(service)}" data-name="${escapeHtml(name)}" title="Tail ${escapeHtml(label)}">${escapeHtml(label)}</button>`;
            }).join('')}
          </div>
        </div>`
      : '';
    let logsHtml = '';
    if (normalizedLogs.length) {
      const renderLogRows = (logs) => logs.map((logEntry, idx) => renderLogRow(logEntry, idx)).join('');
      const sortIndicators = (col, dir) => ({
        name: col === 'name' ? (dir > 0 ? ' ▲' : ' ▼') : '',
        service: col === 'service' ? (dir > 0 ? ' ▲' : ' ▼') : '',
        date: col === 'date' ? (dir > 0 ? ' ▲' : ' ▼') : ''
      });
      let sortCol = 'date';
      let sortDir = -1;
      logsHtml = `
        <table class="logs-table">
          <thead>
            <tr>
              <th class="sortable" data-sort="name">${C.UI_LABELS.LOG_FILE}${sortIndicators(sortCol, sortDir).name}</th>
              <th class="sortable" data-sort="service">${C.UI_LABELS.SERVICE}${sortIndicators(sortCol, sortDir).service}</th>
              <th class="sortable" data-sort="date">${C.UI_LABELS.DATE_UTC}${sortIndicators(sortCol, sortDir).date}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${renderLogRows(normalizedLogs)}
          </tbody>
        </table>
      `;
    } else {
      logsHtml = `<p class="empty">${C.UI_EMPTY.NO_LOGS}</p>`;
    }
    const links = envData._links ?? envData.links ?? {};
    const devConsoleHref = (() => {
      const l = links.developerConsole ?? links['http://ns.adobe.com/adobecloud/rel/developerConsole'];
      const href = Array.isArray(l) ? l[0]?.href : l?.href;
      if (href) return href;
      const key = Object.keys(links).find(k => k.toLowerCase().includes('developerconsole'));
      const entry = key ? links[key] : null;
      return Array.isArray(entry) ? entry[0]?.href : entry?.href;
    })();
    detailContent.innerHTML = `
      <div class="meta">
        <h3>${escapeHtml(envData.name || envData.id || env.id)}</h3>
        <p><strong>ID:</strong> ${escapeHtml(String(envData.id ?? env.id))}</p>
        <p><strong>Type:</strong> ${escapeHtml(envData.type || envData.environmentType || '—')}</p>
        <p><strong>URL:</strong> <a href="#" class="cm-external-link" data-url="https://author-p${state.selectedProgram?.id}-e${envData.id ?? env.id}.adobeaemcloud.com">https://author-p${state.selectedProgram?.id}-e${envData.id ?? env.id}.adobeaemcloud.com</a></p>
        ${devConsoleHref ? `<p><strong>Developer Console:</strong> <a href="#" class="cm-external-link" data-url="${escapeHtml(devConsoleHref)}">${escapeHtml(devConsoleHref)}</a></p>` : ''}
        ${envData.description ? `<p><strong>Description:</strong> ${escapeHtml(envData.description)}</p>` : ''}
      </div>
      <h3>Variables</h3>
      <div class="env-vars">${varsHtml}</div>
      <h3>Logs</h3>
      <h4 class="logs-heading">${C.UI_LABELS.TAIL_HINT}</h4>
      ${tailSectionHtml}
      <h4 class="logs-heading">${C.UI_LABELS.DOWNLOAD_LOGS_HEADING}</h4>
      <div class="env-logs">${logsHtml}</div>
    `;
    const attachLogHandlers = () => {
      detailContent.querySelectorAll('.log-download-btn').forEach(btn => {
        btn.onclick = async () => {
          const service = btn.dataset.service || '';
          const name = btn.dataset.name || '';
          const date = btn.dataset.date || '';
          if (!service || !name || service === '—' || name === '—') return;
          clearError();
          try {
            const url = await api.getEnvironmentLogDownloadUrl(state.activeOrgId, state.selectedProgram.id, env.id, service, name, date || undefined);
            if (url) window.open(url, '_blank');
            else showError(C.UI_ERRORS.COULD_NOT_GET_DOWNLOAD_URL);
          } catch (error) {
            showError(error.message);
          }
        };
      });
      detailContent.querySelectorAll('.log-tail-btn').forEach(btn => {
        btn.onclick = () => {
          const service = btn.dataset.service || '';
          const name = btn.dataset.name || '';
          if (!service || !name) return;
          clearError();
          try {
            const logLabel = `${formatServiceDisplay(service)} / ${name}`;
            api.openLogTailWindow(state.activeOrgId, state.selectedProgram.id, env.id, service, name, logLabel);
          } catch (error) {
            showError(error.message);
          }
        };
      });
    };
    attachLogHandlers();
    attachCmExternalLinkHandlers(detailContent);
    const logsTable = detailContent.querySelector('.logs-table');
    if (logsTable && normalizedLogs.length) {
      let sortCol = 'date';
      let sortDir = -1;
      const updateSort = () => {
        const sorted = [...normalizedLogs].sort((a, b) => {
          let va = a[sortCol] ?? '';
          let vb = b[sortCol] ?? '';
          if (sortCol === 'date') {
            va = String(va);
            vb = String(vb);
            return sortDir * (va.localeCompare(vb, undefined, { numeric: true }) || 0);
          }
          return sortDir * String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
        });
        const thead = logsTable.querySelector('thead tr');
        const tbody = logsTable.querySelector('tbody');
        thead.querySelectorAll('.sortable').forEach(th => {
          const col = th.dataset.sort;
          const label = col === 'name' ? C.UI_LABELS.LOG_FILE : col === 'service' ? C.UI_LABELS.SERVICE : C.UI_LABELS.DATE_UTC;
          th.textContent = label + (col === sortCol ? (sortDir > 0 ? ' ▲' : ' ▼') : '');
        });
        tbody.innerHTML = sorted.map((logEntry, idx) => renderLogRow(logEntry, idx)).join('');
        attachLogHandlers();
      };
      logsTable.querySelectorAll('.sortable').forEach(th => {
        th.onclick = () => {
          const col = th.dataset.sort;
          if (sortCol === col) sortDir *= -1;
          else { sortCol = col; sortDir = col === 'date' ? -1 : 1; }
          updateSort();
        };
      });
    }
  } catch (error) {
    showError(error.message);
    detailContent.innerHTML = `
      <div class="meta">
        <h3>${env.name || env.id}</h3>
        <p><strong>ID:</strong> ${env.id}</p>
      </div>
    `;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatServiceDisplay(service) {
  return String(service).charAt(0).toUpperCase() + String(service).slice(1).toLowerCase();
}

function renderLogRow(logEntry, index) {
  const dateStr = logEntry.date && logEntry.date !== '—'
    ? new Date(logEntry.date).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })
    : (logEntry.date || '—');
  const canDownload = logEntry.service && logEntry.name && logEntry.service !== '—' && logEntry.name !== '—';
  const dateParam = (logEntry.date && logEntry.date !== '—')
    ? (typeof logEntry.date === 'string' && logEntry.date.includes('T') ? logEntry.date.slice(0, 10) : logEntry.date)
    : '';
  const serviceDisplay = formatServiceDisplay(logEntry.service);
  return `
    <tr data-i="${index}">
      <td>${escapeHtml(String(logEntry.name))}</td>
      <td>${escapeHtml(serviceDisplay)}</td>
      <td>${escapeHtml(String(dateStr))}</td>
      <td>
        ${canDownload ? `<button class="log-download-btn" data-service="${escapeHtml(String(logEntry.service))}" data-name="${escapeHtml(String(logEntry.name))}" data-date="${escapeHtml(dateParam)}" title="Download">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>` : '—'}
      </td>
    </tr>
  `;
}

function attachCmExternalLinkHandlers(container) {
  if (!container) return;
  container.querySelectorAll('.cm-external-link').forEach(link => {
    link.onclick = (ev) => {
      ev.preventDefault();
      const url = link.dataset.url;
      if (url) api.openExternal(url);
    };
  });
}

async function showPipelineDetail(pipeline) {
  stopCurrentExecutionPoll();
  renderBreadcrumb([
    { label: state.selectedProgram?.name || state.selectedProgram?.id, onClick: () => showProgramDetail(state.selectedProgram) },
    { label: pipeline.name || pipeline.id }
  ]);
  detailContent.innerHTML = `<p class="welcome">${C.UI_EMPTY.LOADING_EXECUTIONS}</p>`;
  const [executions, currentExecution] = await Promise.all([
    api.getExecutions(state.activeOrgId, state.selectedProgram.id, pipeline.id),
    api.getCurrentExecution(state.activeOrgId, state.selectedProgram.id, pipeline.id).catch(() => null)
  ]);
  // Build unified list: executions (history) already includes running; ensure current is present if different
  const seen = new Set();
  const allExecutions = [];
  if (currentExecution) {
    allExecutions.push({ ...currentExecution, _isCurrent: true });
    seen.add(String(currentExecution.id));
  }
  executions.forEach(e => {
    if (seen.has(String(e.id))) return;
    seen.add(String(e.id));
    allExecutions.push(e);
  });
  state.executions = allExecutions;
  const execHtml = allExecutions.map(e => {
    const isCurrent = currentExecution && String(e.id) === String(currentExecution.id);
    const status = e.status || '—';
    const userValue = (e.user && e.trigger !== 'ON_COMMIT') ? String(e.user) : null;
    return `
      <div class="execution-item status-${status}">
        <div class="execution-item-content">
          <div class="id">${e.id}${isCurrent ? ' <span class="badge">Current</span>' : ''}</div>
          <div class="status">${status}</div>
          <div class=""><a href="https://experience.adobe.com/#/cloud-manager/pipelineexecution.html/program/${state.selectedProgram?.id}/pipeline/${state.selectedPipeline?.id}/execution/${e.id}" target="_blank" class="cm-external-link">Link to Cloud Manager Browser</a></div>
          ${userValue ? `<div class="subtitle execution-user">${C.UI_LABELS.TRIGGERED_BY}: ${escapeHtml(userValue)}</div>` : ''}
          ${e.createdAt ? `<div class="subtitle">${new Date(e.createdAt).toLocaleString()}</div>` : ''}
        </div>
        <button type="button" class="execution-details-btn" data-id="${e.id}" title="View details" aria-label="View details">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  detailContent.innerHTML = `
    <div class="meta">
      <h3>${pipeline.name || pipeline.id}</h3>
      <p><strong>ID:</strong> ${pipeline.id}</p>
      <p><strong>Type:</strong> ${pipeline.type || '—'}</p>
    </div>
    <div class="actions">
      <button id="startPipelineBtn" class="btn" ${currentExecution ? 'disabled title="An execution is currently running"' : ''}>${C.UI_LABELS.START_PIPELINE}</button>
    </div>
    <h3>${C.UI_LABELS.EXECUTIONS}</h3>
    <div class="execution-list">${execHtml || `<p>${C.UI_EMPTY.NO_EXECUTIONS}</p>`}</div>
    <pre>${JSON.stringify(pipeline, null, 2)}</pre>
  `;
  detailContent.querySelectorAll('.execution-details-btn').forEach(btn => {
    btn.onclick = () => selectExecution(btn.dataset.id);
  });
  detailContent.querySelector('#startPipelineBtn').onclick = () => startPipeline();

  if (currentExecution) {
    stopCurrentExecutionPoll();
    currentExecutionPollTimer = setInterval(async () => {
      try {
        const current = await api.getCurrentExecution(state.activeOrgId, state.selectedProgram.id, pipeline.id).catch(() => null);
        if (!current && state.selectedPipeline?.id === pipeline.id) {
          stopCurrentExecutionPoll();
          const btn = detailContent.querySelector('#startPipelineBtn');
          if (btn) {
            btn.disabled = false;
            btn.removeAttribute('title');
          }
        }
      } catch (_) {}
    }, CURRENT_EXECUTION_POLL_MS);
  } else {
    stopCurrentExecutionPoll();
  }
}

async function selectExecution(executionId) {
  state.selectedExecution = executionId;
  try {
    const exec = await api.getExecution(state.activeOrgId, state.selectedProgram.id, state.selectedPipeline.id, executionId);
    showExecutionDetail(exec);
  } catch (error) {
    showError(error.message);
  }
}

async function navigateToExecution(programId, pipelineId, executionId, targetOrgId) {
  try {
    if (!programId || !pipelineId || !executionId) {
      showError('Missing execution details');
      return;
    }
    const orgId = targetOrgId || state.activeOrgId;
    if (!orgId) {
      showError('Select an organization first');
      return;
    }
    if (state.activeOrgId !== orgId) {
      orgSelect.value = orgId;
      state.activeOrgId = orgId;
      await api.setActiveOrg(orgId);
    }
    hideWelcome();
    detailContent.innerHTML = `<p class="welcome">Opening execution...</p>`;
    const [exec, program, pipeline, pipelines, environments] = await Promise.all([
      api.getExecution(orgId, programId, pipelineId, executionId),
      api.getProgram(orgId, programId),
      api.getPipeline(orgId, programId, pipelineId),
      api.getPipelines(orgId, programId),
      api.getEnvironments(orgId, programId).catch(() => [])
    ]);
    state.selectedProgram = program;
    state.selectedPipeline = pipeline;
    state.selectedExecution = executionId;
    state.pipelines = pipelines || [];
    state.environments = environments || [];
    pipelineSection.style.display = 'block';
    environmentSection.style.display = 'block';
    renderProgramList();
    renderPipelineList();
    renderEnvironmentList();
    showExecutionDetail(exec);
  } catch (error) {
    showError(error?.message ?? 'Failed to navigate to execution');
  }
}

function showExecutionDetail(exec) {
  stopCurrentExecutionPoll();
  renderBreadcrumb([
    { label: state.selectedProgram?.name || state.selectedProgram?.id, onClick: () => showProgramDetail(state.selectedProgram) },
    { label: state.selectedPipeline?.name || state.selectedPipeline?.id, onClick: () => showPipelineDetail(state.selectedPipeline) },
    { label: exec.id }
  ]);
  const pipelinePhases = state.selectedPipeline?.phases || [];
  const pipelinePhaseMap = new Map(
    pipelinePhases.filter(p => p.id != null).map(p => [String(p.id), p])
  );
  const stepStates = exec._embedded?.stepStates || exec.stepStates || [];
  const byPhase = new Map();
  for (const s of stepStates) {
    const pid = String(s.phaseId || s.phase);
    if (!byPhase.has(pid)) byPhase.set(pid, []);
    byPhase.get(pid).push(s);
  }
  let phasesHtml = '';
  for (const [phaseId, steps] of byPhase.entries()) {
    const phaseDef = pipelinePhaseMap.get(phaseId) || pipelinePhases.find(p => String(p.id) === phaseId);
    const phaseName = phaseDef?.name || phaseDef?.type || `Phase ${phaseId}`;
    phasesHtml += `<div class="phase-block"><strong class="phase-name">${escapeHtml(phaseName)}</strong>`;
    for (const s of steps) {
      const stepName = s.action || s.name || s.stepId || '—';
      const status = s.status || '—';
      const statusClass = /FAILED|ERROR|CANCELLED/i.test(status) ? 'status-failed' : /RUNNING|WAITING|PENDING/i.test(status) ? 'status-running' : 'status-done';
      const links = s._links ?? s.links ?? {};
      const advance = links.advance ?? links['http://ns.adobe.com/adobecloud/rel/advance'];
      const cancel = links.cancel ?? links['http://ns.adobe.com/adobecloud/rel/cancel'];
      const logs = links.logs ?? links['http://ns.adobe.com/adobecloud/rel/logs'];
      const selfLink = links.self ?? links['self'];
      const advanceHref = Array.isArray(advance) ? advance[0]?.href : advance?.href;
      const cancelHref = Array.isArray(cancel) ? cancel[0]?.href : cancel?.href;
      const logsHref = Array.isArray(logs) ? logs[0]?.href : logs?.href;
      const startedAt = s.startedAt || s.createdAt;
      const finishedAt = s.finishedAt || s.endedAt;
      let durationStr = '';
      if (startedAt && finishedAt) {
        try {
          const start = new Date(startedAt).getTime();
          const end = new Date(finishedAt).getTime();
          const sec = Math.round((end - start) / 1000);
          durationStr = sec < 60 ? `${sec} sec` : sec < 3600 ? `${Math.floor(sec / 60)} min ${sec % 60} sec` : `${Math.floor(sec / 3600)} hr ${Math.floor((sec % 3600) / 60)} min`;
        } catch (_) {}
      }
      const meta = [];
      if (startedAt) meta.push(new Date(startedAt).toLocaleString());
      if (durationStr) meta.push(durationStr);
      if (s.repositoryId || s.branch || s.commit) {
        if (s.repositoryId) meta.push(`Repo: ${s.repositoryId}`);
        if (s.branch) meta.push(`Branch: ${s.branch}`);
        if (s.commit) meta.push(`Commit: ${String(s.commit).slice(0, 12)}`);
      }
      const metaStr = meta.length ? ` <span class="step-meta">(${meta.join(' · ')})</span>` : '';
      phasesHtml += `
        <div class="step-row ${statusClass}">
          <span class="step-label">${escapeHtml(stepName)}</span>
          <span class="step-status">${escapeHtml(status)}</span>${metaStr}
          ${logsHref ? ` <a href="#" class="step-logs-link cm-external-link" data-url="${escapeHtml(logsHref.startsWith('http') ? logsHref : 'https://cloudmanager.adobe.io' + logsHref)}">View log</a>` : ''}
          ${advanceHref ? `<button class="btn advance-btn" data-phase="${escapeHtml(phaseId)}" data-step="${escapeHtml(s.stepId || s.id)}">Advance</button>` : ''}
          ${cancelHref ? `<button class="btn btn-danger cancel-btn" data-phase="${escapeHtml(phaseId)}" data-step="${escapeHtml(s.stepId || s.id)}">Cancel</button>` : ''}
        </div>`;
    }
    phasesHtml += '</div>';
  }
  if (!phasesHtml && (exec.phases || exec._embedded?.phases || []).length > 0) {
    const phases = exec.phases || exec._embedded?.phases || [];
    phasesHtml = phases.map(p => {
      const steps = p.steps || p._embedded?.steps || [];
      return `
    <div><strong>${escapeHtml(p.name || p.id)}</strong>
      ${steps.map(s => `
        <div style="margin-left:16px">${escapeHtml(s.name || s.id)}: ${escapeHtml(s.status || '—')}
          ${s._links?.advance ? `<button class="btn advance-btn" data-phase="${p.id}" data-step="${s.id}">Advance</button>` : ''}
          ${s._links?.cancel ? `<button class="btn btn-danger cancel-btn" data-phase="${p.id}" data-step="${s.id}">Cancel</button>` : ''}
        </div>
      `).join('')}
    </div>
  `;
    }).join('');
  }
  detailContent.innerHTML = `
    <div class="meta">
      <h3>${C.UI_LABELS.EXECUTION_PREFIX}${exec.id}</h3>
      <p><strong>Status:</strong> ${exec.status || '—'}</p>
      <div><a href="#" target="_blank" data-url="${'https://experience.adobe.com/#/cloud-manager/pipelineexecution.html/program/'+(exec.programId) + '/pipeline/'+(exec.pipelineId)+'/execution/'+ (exec.id)}" class="cm-external-link">Link to Cloud Manager Browser</a></div>
    </div>
    <h3>Phases & Steps</h3>
    <div class="phases-steps">${phasesHtml || `<p>${C.UI_EMPTY.NO_PHASES}</p>`}</div>
    <pre>${JSON.stringify(exec, null, 2)}</pre>
  `;
  detailContent.querySelectorAll('.advance-btn').forEach(btn => {
    btn.onclick = () => advanceStep(btn.dataset.phase, btn.dataset.step);
  });
  detailContent.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.onclick = () => cancelStep(btn.dataset.phase, btn.dataset.step);
  });
  attachCmExternalLinkHandlers(detailContent);
}

async function startPipeline() {
  if (!state.activeOrgId || !state.selectedProgram || !state.selectedPipeline) return;
  clearError();
  try {
    await api.startPipeline(state.activeOrgId, state.selectedProgram.id, state.selectedPipeline.id, { mode: 'NORMAL' });
    await selectPipeline(state.selectedPipeline);
  } catch (error) {
    showError(error?.message ?? 'Unknown error');
  }
}

async function advanceStep(phaseId, stepId) {
  if (!state.activeOrgId || !state.selectedProgram || !state.selectedPipeline || !state.selectedExecution) return;
  clearError();
  try {
    await api.advanceStep(state.activeOrgId, state.selectedProgram.id, state.selectedPipeline.id, state.selectedExecution, phaseId, stepId, {});
    await selectExecution(state.selectedExecution);
  } catch (error) {
    showError(error.message);
  }
}

async function cancelStep(phaseId, stepId) {
  if (!state.activeOrgId || !state.selectedProgram || !state.selectedPipeline || !state.selectedExecution) return;
  clearError();
  try {
    await api.cancelStep(state.activeOrgId, state.selectedProgram.id, state.selectedPipeline.id, state.selectedExecution, phaseId, stepId, {});
    await selectExecution(state.selectedExecution);
  } catch (error) {
    showError(error.message);
  }
}

// --- Org modal ---
function openOrgModal(editOrg = null) {
  orgModal.style.display = 'flex';
  document.getElementById('orgModalTitle').textContent = editOrg ? C.UI_LABELS.EDIT_ORGANIZATION : C.UI_LABELS.ADD_ORGANIZATION;
  if (editOrg) {
    document.getElementById('orgId').value = editOrg.id;
    document.getElementById('orgName').value = editOrg.name || '';
    document.getElementById('orgOrganizationId').value = editOrg.organizationId || '';
    document.getElementById('orgClientId').value = editOrg.clientId || '';
    document.getElementById('orgClientSecret').value = editOrg.clientSecret || '';
    document.getElementById('orgScope').value = editOrg.scope || '';
    document.getElementById('orgJournalEndpoint').value = editOrg.journalEndpoint || '';
  } else {
    orgForm.reset();
    document.getElementById('orgId').value = '';
  }
}

function closeOrgModal() {
  orgModal.style.display = 'none';
}

orgForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const org = {
    id: document.getElementById('orgId').value.trim() || undefined,
    name: document.getElementById('orgName').value.trim(),
    organizationId: document.getElementById('orgOrganizationId').value.trim(),
    clientId: document.getElementById('orgClientId').value.trim(),
    clientSecret: document.getElementById('orgClientSecret').value.trim(),
    scope: document.getElementById('orgScope').value.trim() || undefined,
    journalEndpoint: document.getElementById('orgJournalEndpoint').value.trim() || undefined
  };
  try {
    await api.saveOrg(org);
    closeOrgModal();
    await loadOrgs();
  } catch (error) {
    showError(error.message);
  }
});

document.getElementById('orgFormCancel').onclick = closeOrgModal;

// --- Manage Orgs modal ---
async function openManageOrgsModal() {
  manageOrgsModal.style.display = 'flex';
  const orgs = await api.getOrgs();
  const list = document.getElementById('manageOrgsList');
  list.innerHTML = '';
  orgs.forEach(org => {
    const div = document.createElement('div');
    div.className = 'manage-org-item card';
    div.innerHTML = `
      <div>
        <div class="name">${org.name || C.UI_EMPTY.UNNAMED}</div>
        <div class="org-id">${org.organizationId || ''}</div>        
      </div>
      <div>
        <button class="btn btn-outline-danger edit-org" data-id="${org.id}">${C.UI_LABELS.EDIT}</button>
        <button class="btn btn-outline-danger delete-org" data-id="${org.id}">${C.UI_LABELS.DELETE}</button>
      </div>
    `;
    div.querySelector('.edit-org').onclick = () => {
      manageOrgsModal.style.display = 'none';
      openOrgModal(org);
    };
    div.querySelector('.delete-org').onclick = async () => {
      if (confirm(C.CONFIRM.DELETE_ORG(org.name || org.id))) {
        await api.deleteOrg(org.id);
        openManageOrgsModal();
      }
    };
    list.appendChild(div);
  });
}

document.getElementById('manageOrgsClose').onclick = () => {
  manageOrgsModal.style.display = 'none';
};

// --- Settings modal ---
async function openSettingsModal() {
  settingsModal.style.display = 'flex';
  const settings = await api.getSettings();
  const filterCheckbox = document.getElementById('settingsFilterByProgram');
  const whitelistSection = document.getElementById('settingsWhitelistSection');
  const whitelistTextarea = document.getElementById('settingsWhitelistedPrograms');
  filterCheckbox.checked = settings.filterByProgram || false;
  whitelistTextarea.value = (settings.whitelistedProgramIds || []).join('\n');
  whitelistSection.style.display = filterCheckbox.checked ? 'block' : 'none';
  filterCheckbox.onchange = () => {
    whitelistSection.style.display = filterCheckbox.checked ? 'block' : 'none';
  };
}

document.getElementById('settingsSave').onclick = async () => {
  const filterCheckbox = document.getElementById('settingsFilterByProgram');
  const whitelistTextarea = document.getElementById('settingsWhitelistedPrograms');
  const ids = whitelistTextarea.value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  await api.saveSettings({
    filterByProgram: filterCheckbox.checked,
    whitelistedProgramIds: ids
  });
  settingsModal.style.display = 'none';
};

document.getElementById('settingsCancel').onclick = () => {
  settingsModal.style.display = 'none';
};

// --- Init ---
addOrgBtn.addEventListener('click', () => openOrgModal());
manageOrgsBtn.addEventListener('click', openManageOrgsModal);
document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
orgSelect.addEventListener('change', onOrgChange);
refreshPrograms.addEventListener('click', refreshProgramsList);

api.onNavigateToExecution((payload) => {
  hideWelcome();
  detailContent.innerHTML = `<p class="welcome">Opening execution...</p>`;
  navigateToExecution(payload?.programId, payload?.pipelineId, payload?.executionId, payload?.orgId);
});

loadOrgs();
