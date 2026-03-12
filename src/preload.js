const { contextBridge, ipcRenderer } = require('electron');
const constants = require('./constants');

contextBridge.exposeInMainWorld('electronAPI', {
  // Org management
  getOrgs: () => ipcRenderer.invoke('get-orgs'),
  saveOrg: (org) => ipcRenderer.invoke('save-org', org),
  deleteOrg: (id) => ipcRenderer.invoke('delete-org', id),
  setActiveOrg: (id) => ipcRenderer.invoke('set-active-org', id),
  getActiveOrgId: () => ipcRenderer.invoke('get-active-org-id'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // API calls
  getToken: (orgId) => ipcRenderer.invoke('get-token', orgId),
  getPrograms: (orgId) => ipcRenderer.invoke('api:programs', orgId),
  getProgram: (orgId, programId) => ipcRenderer.invoke('api:program', orgId, programId),
  getPipelines: (orgId, programId) => ipcRenderer.invoke('api:pipelines', orgId, programId),
  getPipeline: (orgId, programId, pipelineId) => ipcRenderer.invoke('api:pipeline', orgId, programId, pipelineId),
  getRepositories: (orgId, programId) => ipcRenderer.invoke('api:repositories', orgId, programId),
  getRepository: (orgId, programId, repositoryId) => ipcRenderer.invoke('api:repository', orgId, programId, repositoryId),
  getBranches: (orgId, programId, repositoryId) => ipcRenderer.invoke('api:branches', orgId, programId, repositoryId),
  getBranchesByPath: (orgId, path) => ipcRenderer.invoke('api:branchesByPath', orgId, path),
  getGitHubBranches: (owner, repo, apiBaseUrl, pat) => ipcRenderer.invoke('api:githubBranches', owner, repo, apiBaseUrl, pat),
  patchPipeline: (orgId, programId, pipelineId, patch) => ipcRenderer.invoke('api:patch-pipeline', orgId, programId, pipelineId, patch),
  getExecutions: (orgId, programId, pipelineId, options) => ipcRenderer.invoke('api:executions', orgId, programId, pipelineId, options),
  getCurrentExecution: (orgId, programId, pipelineId) => ipcRenderer.invoke('api:current-execution', orgId, programId, pipelineId),
  startPipeline: (orgId, programId, pipelineId, options) => ipcRenderer.invoke('api:start-pipeline', orgId, programId, pipelineId, options),
  getExecution: (orgId, programId, pipelineId, executionId) => ipcRenderer.invoke('api:execution', orgId, programId, pipelineId, executionId),
  advanceStep: (orgId, programId, pipelineId, executionId, phaseId, stepId, body) => ipcRenderer.invoke('api:advance-step', orgId, programId, pipelineId, executionId, phaseId, stepId, body),
  cancelStep: (orgId, programId, pipelineId, executionId, phaseId, stepId, body) => ipcRenderer.invoke('api:cancel-step', orgId, programId, pipelineId, executionId, phaseId, stepId, body),

  // Environments
  getEnvironments: (orgId, programId) => ipcRenderer.invoke('api:environments', orgId, programId),
  getEnvironment: (orgId, programId, environmentId) => ipcRenderer.invoke('api:environment', orgId, programId, environmentId),
  getEnvironmentVariables: (orgId, programId, environmentId) => ipcRenderer.invoke('api:environment-variables', orgId, programId, environmentId),
  getEnvironmentLogs: (orgId, programId, environmentId) => ipcRenderer.invoke('api:environment-logs', orgId, programId, environmentId),
  getEnvironmentLogDownloadUrl: (orgId, programId, environmentId, service, name, date) => ipcRenderer.invoke('api:environment-log-download-url', orgId, programId, environmentId, service, name, date),
  getEnvironmentLogTailUrl: (orgId, programId, environmentId, service, name) => ipcRenderer.invoke('api:environment-log-tail-url', orgId, programId, environmentId, service, name),
  startLogTail: (tailUrl) => ipcRenderer.invoke('api:start-log-tail', tailUrl),
  onLogTailChunk: (cb) => ipcRenderer.on('log-tail-chunk', (_, text) => cb(text)),
  onLogTailDone: (cb) => ipcRenderer.on('log-tail-done', () => cb()),
  onLogTailError: (cb) => ipcRenderer.on('log-tail-error', (_, err) => cb(err)),
  onLogTailParams: (cb) => ipcRenderer.on('log-tail-params', (_, params) => cb(params)),
  openLogTailWindow: (orgId, programId, environmentId, service, name, logLabel) =>
    ipcRenderer.invoke('open-log-tail-window', orgId, programId, environmentId, service, name, logLabel),
  onNavigateToExecution: (cb) => ipcRenderer.on('navigate-to-execution', (_, payload) => cb(payload)),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  constants
});
