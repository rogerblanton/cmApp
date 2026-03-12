/**
 * Centralized string constants for the Adobe Cloud Manager app.
 */

// --- API / URLs ---
const API = {
  BASE_URL: 'https://cloudmanager.adobe.io',
  IMS_TOKEN_URL: 'https://ims-na1.adobelogin.com/ims/token/v3',
  CLOUD_MANAGER_SCOPE: 'https://ims-na1.adobelogin.com/s/ent_cloudmgr_sdk',
  SCOPE_PLACEHOLDER: 'https://ims-na1.adobelogin.com/s/ent_cloudmgr_sdk'
};

const GITHUB_API = {
  BASE_URL: 'https://api.github.com'
};

// --- API Paths ---
const API_PATH = {
  TENANTS: '/api/tenants',
  TENANT_PROGRAMS: (tenantId) => `/api/tenant/${tenantId}/programs`,
  PROGRAMS: '/api/programs',
  PROGRAM: (id) => `/api/program/${id}`,
  PIPELINES: (programId) => `/api/program/${programId}/pipelines`,
  PIPELINE: (programId, pipelineId) => `/api/program/${programId}/pipeline/${pipelineId}`,
  REPOSITORIES: (programId) => `/api/program/${programId}/repositories`,
  REPOSITORY: (programId, repositoryId) => `/api/program/${programId}/repository/${repositoryId}`,
  REPOSITORY_BRANCHES: (programId, repositoryId) => `/api/program/${programId}/repository/${repositoryId}/branches`,
  EXECUTIONS: (programId, pipelineId) => `/api/program/${programId}/pipeline/${pipelineId}/executions`,
  EXECUTION: (programId, pipelineId) => `/api/program/${programId}/pipeline/${pipelineId}/execution`,
  EXECUTION_BY_ID: (programId, pipelineId, executionId) =>
    `/api/program/${programId}/pipeline/${pipelineId}/execution/${executionId}`,
  ADVANCE_STEP: (programId, pipelineId, executionId, phaseId, stepId) =>
    `/api/program/${programId}/pipeline/${pipelineId}/execution/${executionId}/phase/${phaseId}/step/${stepId}/advance`,
  CANCEL_STEP: (programId, pipelineId, executionId, phaseId, stepId) =>
    `/api/program/${programId}/pipeline/${pipelineId}/execution/${executionId}/phase/${phaseId}/step/${stepId}/cancel`,
  ENVIRONMENTS: (programId) => `/api/program/${programId}/environments`,
  ENVIRONMENT: (programId, environmentId) => `/api/program/${programId}/environment/${environmentId}`,
  ENV_VARIABLES: (programId, environmentId) =>
    `/api/program/${programId}/environment/${environmentId}/variables`,
  ENV_LOGS: (programId, environmentId) =>
    `/api/program/${programId}/environment/${environmentId}/logs`,
  ENV_LOGS_DOWNLOAD: (programId, environmentId) =>
    `/api/program/${programId}/environment/${environmentId}/logs/download`
};

// --- HAL / Rel keys ---
const HAL_REL = {
  LOGS_TAIL: 'http://ns.adobe.com/adobecloud/rel/logs/tail',
  LOGS_TAIL_SHORT: 'logs/tail',
  ENVIRONMENTS: 'http://ns.adobe.com/adobecloud/rel/environments',
  LOGS: 'http://ns.adobe.com/adobecloud/rel/logs',
  BRANCHES: 'http://ns.adobe.com/adobecloud/rel/branches'
};

// --- Store keys ---
const STORE_KEYS = {
  ORGS: 'orgs',
  ACTIVE_ORG_ID: 'activeOrgId',
  JOURNAL_CURSORS: 'journalCursors', // orgId -> cursor
  SETTINGS: 'settings'
};

// --- App ---
const APP = {
  NAME: 'Adobe Cloud Manager',
  LOG_TAIL_TITLE_PREFIX: 'Log: '
};

// --- UI: Empty states / Placeholders ---
const UI_EMPTY = {
  ADD_ORG_FIRST: '— Add org first —',
  SELECT_ORG_REFRESH: 'Select an org and click Refresh',
  LOADING: 'Loading…',
  LOADING_PROGRAMS: 'Loading…',
  LOADING_PIPELINES: 'Loading…',
  LOADING_ENVIRONMENTS: 'Loading…',
  LOADING_EXECUTIONS: 'Loading executions…',
  LOADING_ENVIRONMENT: 'Loading environment…',
  NO_PROGRAMS: 'No programs found',
  NO_ENVIRONMENTS: 'No environments',
  NO_EXECUTIONS: 'No executions',
  NO_PHASES: 'No phases',
  NO_LOGS: 'No logs or unable to load',
  NO_VARIABLES: 'No variables or unable to load',
  SELECT_PROGRAM: 'Select a program from the list, then a pipeline or environment.',
  ERROR_LOADING_PROGRAMS: 'Error loading programs',
  ERROR_LOADING: 'Error loading',
  NO_EXECUTIONS_PLACEHOLDER: '<p>No executions</p>',
  CONNECTING: 'Connecting…',
  FINISHED: 'Finished',
  API_NOT_AVAILABLE: 'API not available',
  FETCHING_TAIL_URL: 'Fetching tail URL…',
  UNNAMED: 'Unnamed'
};

// --- UI: Labels ---
const UI_LABELS = {
  ORGANIZATION: 'Organization:',
  ADD_ORG: '+ Add Org',
  MANAGE_ORGS: 'Manage Orgs',
  REFRESH_PROGRAMS: 'Refresh Programs',
  PROGRAMS: 'Programs',
  PIPELINES: 'Pipelines',
  ENVIRONMENTS: 'Environments',
  DISPLAY_NAME: 'Display Name',
  ORG_ID: 'Organization ID',
  CLIENT_ID: 'Client ID (API Key)',
  CLIENT_SECRET: 'Client Secret',
  SCOPE: 'Scope (optional, defaults to Cloud Manager)',
  JOURNAL_ENDPOINT: 'Journal API Endpoint (optional, for event notifications)',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  CLOSE: 'Close',
  EDIT: 'Edit',
  DELETE: 'Delete',
  ADD_ORGANIZATION: 'Add Organization',
  EDIT_ORGANIZATION: 'Edit Organization',
  MANAGE_ORGANIZATIONS: 'Manage Organizations',
  START_PIPELINE: 'Start Pipeline',
  ADVANCE: 'Advance',
  ID: 'ID',
  ENABLED: 'Enabled',
  TYPE: 'Type',
  STATUS: 'Status',
  DESCRIPTION: 'Description',
  VARIABLES: 'Variables',
  LOGS: 'Logs',
  LOG_FILE: 'Log file',
  SERVICE: 'Service',
  DATE_UTC: 'Date (UTC)',
  EXECUTIONS: 'Executions',
  EXECUTION: 'Execution',
  EXECUTION_PREFIX: 'Execution ',
  PHASES_STEPS: 'Phases & Steps',
  CURRENT: 'Current',
  DOWNLOAD: 'Download',
  TAIL_HINT: 'Tail Logs',
  DOWNLOAD_LOGS_HEADING: 'Download logs (by date)',
  TRIGGERED_BY: 'Triggered by',
  SETTINGS: 'Settings',
  REPOSITORY: 'Repository',
  BRANCH: 'Branch',
  REPO_BRANCH_HINT: 'Optional: change repo/branch before starting. Pipeline will be updated when you change.',
  ORG_GITHUB_PAT: 'GitHub PAT (optional, for GitHub repo branch listing)'
};

// --- UI: Placeholders ---
const UI_PLACEHOLDERS = {
  ORG_NAME: 'e.g. Production Org',
  ORG_ID: 'xxxxxxxx@AdobeOrg',
  CLIENT_ID: 'From Adobe Developer Console',
  CLIENT_SECRET: 'From Adobe Developer Console',
  SCOPE: API.SCOPE_PLACEHOLDER,
  JOURNAL_ENDPOINT: 'e.g. https://cloudmanager.adobe.io/api/journal',
  GITHUB_PAT: 'ghp_xxxxxxxxxxxx'
};

// --- UI: Welcome / Help ---
const UI_WELCOME = {
  ADD_ORG_START: 'Add an organization and select it to get started.',
  CONFIGURE_CREDENTIALS: 'Configure your Adobe Developer Console credentials in Manage Orgs.'
};

// --- UI: Errors ---
const UI_ERRORS = {
  COULD_NOT_GET_DOWNLOAD_URL: 'Could not get download URL',
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  NO_LOG_DOWNLOADS: 'No log downloads found for tail. The log may not be available yet for this service/name.',
  TAIL_LINK_NOT_FOUND: 'Tail link not found for this log. Tailing may not be supported.'
};

// --- Log types for tail fallback ---
const LOG_TAIL_TYPES = [
  { name: 'aemaccess', service: 'author' },
  { name: 'aemerror', service: 'author' },
  { name: 'aemrequest', service: 'author' },
  { name: 'aemaccess', service: 'publish' },
  { name: 'aemerror', service: 'publish' },
  { name: 'aemrequest', service: 'publish' },
  { name: 'httpdaccess', service: 'dispatcher' },
  { name: 'aemdispatcher', service: 'dispatcher' },
  { name: 'httpderror', service: 'dispatcher' }
];

// --- Confirm dialogs ---
const CONFIRM = {
  DELETE_ORG: (name) => `Delete "${name || 'Unnamed'}"?`
};

module.exports = {
  API,
  GITHUB_API,
  API_PATH,
  HAL_REL,
  STORE_KEYS,
  APP,
  UI_EMPTY,
  UI_LABELS,
  UI_PLACEHOLDERS,
  UI_WELCOME,
  UI_ERRORS,
  LOG_TAIL_TYPES,
  CONFIRM
};
