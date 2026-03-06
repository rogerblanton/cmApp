/* Mock electronAPI for Cypress UI tests - loaded before renderer.js */
window.electronAPI = {
  getOrgs: () => Promise.resolve([
    { id: 'org1', name: 'Test Org', organizationId: 'org@AdobeOrg' }
  ]),
  saveOrg: (org) => Promise.resolve({ ...org, id: org.id || 'org1' }),
  deleteOrg: () => Promise.resolve(),
  setActiveOrg: () => Promise.resolve(),
  getActiveOrgId: () => Promise.resolve('org1'),
  getPrograms: () => Promise.resolve([
    { id: 'p1', name: 'Test Program' }
  ]),
  getProgram: () => Promise.resolve({ id: 'p1', name: 'Test Program' }),
  getPipelines: () => Promise.resolve([
    { id: 'pl1', name: 'Deploy to Dev' }
  ]),
  getPipeline: () => Promise.resolve({ id: 'pl1', name: 'Deploy to Dev' }),
  getExecutions: () => Promise.resolve([
    { id: 'e1', status: 'FINISHED', createdAt: new Date().toISOString() }
  ]),
  getCurrentExecution: () => Promise.resolve(null),
  getExecution: () => Promise.resolve({ id: 'e1', status: 'FINISHED', phases: [] }),
  startPipeline: () => Promise.resolve({ id: 'e2', status: 'RUNNING' }),
  advanceStep: () => Promise.resolve(),
  cancelStep: () => Promise.resolve(),
  getEnvironments: () => Promise.resolve([
    { id: 'env1', name: 'dev-environment' }
  ]),
  getEnvironment: () => Promise.resolve({ id: 'env1', name: 'dev-environment' }),
  getEnvironmentVariables: () => Promise.resolve([{ name: 'FOO', value: 'bar' }]),
  getEnvironmentLogs: () => Promise.resolve([]),
  getEnvironmentLogDownloadUrl: () => Promise.resolve('https://example.com/log.zip'),
  getEnvironmentLogTailUrl: () => Promise.reject(new Error('Tail not available in tests')),
  startLogTail: () => Promise.resolve(),
  onLogTailChunk: () => {},
  onLogTailDone: () => {},
  onLogTailError: () => {},
  onLogTailParams: () => {},
  openLogTailWindow: () => Promise.resolve()
};
