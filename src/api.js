const { API, API_PATH, HAL_REL, UI_ERRORS } = require('./constants');

async function getAccessToken(org) {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: org.clientId,
    client_secret: org.clientSecret,
    scope: org.scope || API.CLOUD_MANAGER_SCOPE
  });

  const res = await fetch(API.IMS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

function apiHeaders(org, token) {
  return {
    'Authorization': `Bearer ${token}`,
    'x-gw-ims-org-id': org.organizationId,
    'x-api-key': org.clientId,
    'Content-Type': 'application/json'
  };
}

async function apiRequest(org, token, method, path, body) {
  const url = `${API.BASE_URL}${path}`;
  const opts = {
    method,
    headers: apiHeaders(org, token)
  };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return text ? JSON.parse(text) : null;
}

// Programs
async function getPrograms(org, token) {
  // Try tenant-based API first; fallback to deprecated /api/programs
  try {
    const tenants = await apiRequest(org, token, 'GET', API_PATH.TENANTS);
    if (tenants && tenants._embedded && tenants._embedded.tenants && tenants._embedded.tenants.length > 0) {
      const tenantId = tenants._embedded.tenants[0].id;
      const programs = await apiRequest(org, token, 'GET', API_PATH.TENANT_PROGRAMS(tenantId));
      if (programs && programs._embedded) {
        return programs._embedded.programs || [];
      }
    }
  } catch (e) {
    // Fallback
  }
  const list = await apiRequest(org, token, 'GET', API_PATH.PROGRAMS);
  return list._embedded?.programs ?? list?.programs ?? (Array.isArray(list) ? list : []);
}

async function getProgram(org, token, programId) {
  return apiRequest(org, token, 'GET', API_PATH.PROGRAM(programId));
}

// Pipelines
async function getPipelines(org, token, programId, type) {
  let path = API_PATH.PIPELINES(programId);
  if (type) path += `?type=${encodeURIComponent(type)}`;
  const list = await apiRequest(org, token, 'GET', path);
  return list._embedded?.pipelines ?? list?.pipelines ?? (Array.isArray(list) ? list : []);
}

async function getPipeline(org, token, programId, pipelineId) {
  return apiRequest(org, token, 'GET', API_PATH.PIPELINE(programId, pipelineId));
}

// Executions
async function getExecutions(org, token, programId, pipelineId, { start = 0, limit = 50 } = {}) {
  const path = `${API_PATH.EXECUTIONS(programId, pipelineId)}?start=${start}&limit=${limit}`;
  const list = await apiRequest(org, token, 'GET', path);
  // HAL format: _embedded can use various keys (pipelineExecutions, executions, or link relation)
  const embedded = list?._embedded;
  if (embedded) {
    const execs = embedded.pipelineExecutions ?? embedded.executions ?? embedded['http://ns.adobe.com/adobecloud/rel/executions'];
    if (Array.isArray(execs)) return execs;
  }
  return list?.executions ?? (Array.isArray(list) ? list : []);
}

async function getCurrentExecution(org, token, programId, pipelineId) {
  return apiRequest(org, token, 'GET', API_PATH.EXECUTION(programId, pipelineId));
}

async function getExecution(org, token, programId, pipelineId, executionId) {
  return apiRequest(org, token, 'GET', API_PATH.EXECUTION_BY_ID(programId, pipelineId, executionId));
}

async function startPipeline(org, token, programId, pipelineId, { mode = 'NORMAL', stepId, sourceExecutionId } = {}) {
  let path = `${API_PATH.EXECUTION(programId, pipelineId)}?pipelineExecutionMode=${mode}`;
  if (stepId) path += `&stepId=${encodeURIComponent(stepId)}`;
  if (sourceExecutionId) path += `&sourceExecutionId=${encodeURIComponent(sourceExecutionId)}`;
  return apiRequest(org, token, 'PUT', path, {});
}

async function advanceStep(org, token, programId, pipelineId, executionId, phaseId, stepId, body = {}) {
  const path = API_PATH.ADVANCE_STEP(programId, pipelineId, executionId, phaseId, stepId);
  return apiRequest(org, token, 'PUT', path, body);
}

async function cancelStep(org, token, programId, pipelineId, executionId, phaseId, stepId, body = {}) {
  const path = API_PATH.CANCEL_STEP(programId, pipelineId, executionId, phaseId, stepId);
  return apiRequest(org, token, 'PUT', path, body);
}

// Environments
function extractEmbedded(list, ...keys) {
  const embedded = list?._embedded;
  if (embedded) {
    for (const k of keys) {
      const arr = embedded[k];
      if (Array.isArray(arr)) return arr;
    }
    const rel = embedded[HAL_REL.ENVIRONMENTS];
    if (Array.isArray(rel)) return rel;
  }
  return list?.environments ?? (Array.isArray(list) ? list : []);
}

async function getEnvironments(org, token, programId) {
  const list = await apiRequest(org, token, 'GET', API_PATH.ENVIRONMENTS(programId));
  return extractEmbedded(list, 'environments', 'environmentList');
}

async function getEnvironment(org, token, programId, environmentId) {
  return apiRequest(org, token, 'GET', API_PATH.ENVIRONMENT(programId, environmentId));
}

async function getEnvironmentVariables(org, token, programId, environmentId) {
  const res = await apiRequest(org, token, 'GET', API_PATH.ENV_VARIABLES(programId, environmentId));
  return res?.variables ?? res?._embedded?.variables ?? res ?? [];
}

async function getEnvironmentLogs(org, token, programId, environmentId, days = 7) {
  const path = `${API_PATH.ENV_LOGS(programId, environmentId)}?days=${Math.min(7, Math.max(1, days))}`;
  const res = await apiRequest(org, token, 'GET', path);
  const embedded = res?._embedded;
  if (embedded) {
    const arr = embedded.logs ?? embedded.environmentLogs ?? embedded[HAL_REL.LOGS];
    if (Array.isArray(arr)) return arr;
  }
  return res?.logs ?? (Array.isArray(res) ? res : []);
}

async function getEnvironmentLogDownloadUrl(org, token, programId, environmentId, service, name, date) {
  let path = API_PATH.ENV_LOGS_DOWNLOAD(programId, environmentId);
  const params = new URLSearchParams();
  if (service) params.set('service', service);
  if (name) params.set('name', name);
  if (date) params.set('date', date);
  if (params.toString()) path += `?${params.toString()}`;
  const res = await fetch(`${API.BASE_URL}${path}`, {
    method: 'GET',
    headers: apiHeaders(org, token),
    redirect: 'manual'
  });
  if (res.status === 307 || res.status === 302) {
    return res.headers.get('Location') || null;
  }
  return null;
}

async function getEnvironmentLogTailUrl(org, token, programId, environmentId, service, name) {
  const path = `${API_PATH.ENV_LOGS(programId, environmentId)}?service=${encodeURIComponent(service)}&name=${encodeURIComponent(name)}&days=1`;
  const res = await apiRequest(org, token, 'GET', path);
  const embedded = res?._embedded;
  const downloads = embedded?.downloads ?? embedded?.items ?? [];
  if (!Array.isArray(downloads) || downloads.length === 0) {
    console.error('[API] Logs response keys:', res ? Object.keys(res) : 'null');
    console.error('[API] _embedded keys:', embedded ? Object.keys(embedded) : 'n/a');
    throw new Error(UI_ERRORS.NO_LOG_DOWNLOADS);
  }
  const first = downloads[0];
  const links = first?._links ?? first?.links ?? {};
  const tailLink = links[HAL_REL.LOGS_TAIL] ?? links[HAL_REL.LOGS_TAIL_SHORT];
  const tailLinks = Array.isArray(tailLink) ? tailLink : (tailLink ? [tailLink] : []);
  const href = tailLinks[0]?.href ?? tailLink?.href;
  if (!href) {
    console.error('[API] First download keys:', first ? Object.keys(first) : 'null');
    console.error('[API] _links keys:', links ? Object.keys(links) : 'n/a');
    throw new Error(UI_ERRORS.TAIL_LINK_NOT_FOUND);
  }
  return href;
}

/**
 * Fetch journal events from the org's configured journal endpoint.
 * @param {Object} org - Org with journalEndpoint, organizationId, clientId
 * @param {string} token - Access token
 * @param {string} [after] - Cursor from previous response _page.last for pagination
 * @returns {Promise<{ events: Array, _page: Object }>}
 */
async function getJournalEvents(org, token, after) {
  const base = (org.journalEndpoint || '').replace(/\?.*$/, '');
  if (!base) throw new Error('Journal endpoint not configured');
  const url = new URL(base);
  if (after) {
    url.searchParams.set('since', after);
  }
  const headers = { ...apiHeaders(org, token), 'x-ims-org-id': org.organizationId };
  console.log('[Journal API] Fetching:', url.toString());
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers
  });
  console.log('[Journal API] Response status:', res.status);
  if (res.status !== 200 && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Journal API ${res.status}: ${text || res.statusText}`);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : { events: [], _page: {} };
  console.log('[Journal API] Events count:', (data.events ?? []).length, '_page.last:', data._page?.last ?? 'none');
  // Extract cursor from Link header (rel=next) as fallback when _page.last is missing (e.g. 204)
  const linkHeader = res.headers.get('link') || '';
  const retryAfter = res.headers.get('retry-after');
  console.log('[Journal API] Link header:', linkHeader || 'none');
  if (retryAfter) console.log('[Journal API] Retry-After:', retryAfter);
  if (!data._page?.last) {
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (nextMatch) {
      try {
        const nextUrl = new URL(nextMatch[1]);
        const since = nextUrl.searchParams.get('since');
        if (since) {
          if (!data._page) data._page = {};
          data._page.last = since;
          console.log('[Journal API] Cursor from Link header:', since);
        }
      } catch (_) {}
    }
  }
  return data;
}

module.exports = {
  getAccessToken,
  getPrograms,
  getProgram,
  getPipelines,
  getPipeline,
  getExecutions,
  getCurrentExecution,
  getExecution,
  startPipeline,
  advanceStep,
  cancelStep,
  getEnvironments,
  getEnvironment,
  getEnvironmentVariables,
  getEnvironmentLogs,
  getEnvironmentLogDownloadUrl,
  getEnvironmentLogTailUrl,
  getJournalEvents,
  CLOUD_MANAGER_SCOPE: API.CLOUD_MANAGER_SCOPE
};
