const api = require('../src/api');

const mockOrg = {
  clientId: 'test-client-id',
  clientSecret: 'test-secret',
  organizationId: 'org123@AdobeOrg',
  scope: 'https://ims-na1.adobelogin.com/s/ent_cloudmgr_sdk'
};

describe('Cloud Manager API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAccessToken', () => {
    it('returns access token on successful auth', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mock-token-123' })
      });
      const token = await api.getAccessToken(mockOrg);
      expect(token).toBe('mock-token-123');
      expect(fetch).toHaveBeenCalledWith(
        'https://ims-na1.adobelogin.com/ims/token/v3',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      );
      const body = fetch.mock.calls[0][1].body;
      expect(body).toContain('grant_type=client_credentials');
      expect(body).toContain('client_id=test-client-id');
      expect(body).toContain('scope=');
    });

    it('throws on auth failure', async () => {
      fetch.mockResolvedValueOnce({ ok: false, text: async () => 'invalid_client' });
      await expect(api.getAccessToken(mockOrg)).rejects.toThrow('Token error');
    });
  });

  describe('getPrograms', () => {
    it('extracts programs from _embedded.programs', async () => {
      fetch.mockResolvedValueOnce({ ok: false });
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          _embedded: { programs: [{ id: 'p1', name: 'Program 1' }] }
        })
      });
      const programs = await api.getPrograms(mockOrg, 'token');
      expect(programs).toEqual([{ id: 'p1', name: 'Program 1' }]);
    });

    it('extracts programs from tenant API when tenants exist', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({
            _embedded: { tenants: [{ id: 't1' }] }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({
            _embedded: { programs: [{ id: 'p1', name: 'Prog' }] }
          })
        });
      const programs = await api.getPrograms(mockOrg, 'token');
      expect(programs).toEqual([{ id: 'p1', name: 'Prog' }]);
    });
  });

  describe('getPipelines', () => {
    it('extracts pipelines from _embedded', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          _embedded: { pipelines: [{ id: 'pl1', name: 'Pipeline 1' }] }
        })
      });
      const pipelines = await api.getPipelines(mockOrg, 'token', 'prog1');
      expect(pipelines).toEqual([{ id: 'pl1', name: 'Pipeline 1' }]);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/program/prog1/pipelines'),
        expect.any(Object)
      );
    });

    it('adds type query param when provided', async () => {
      fetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ _embedded: { pipelines: [] } }) });
      await api.getPipelines(mockOrg, 'token', 'prog1', 'CI_CD');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=CI_CD'),
        expect.any(Object)
      );
    });
  });

  describe('getExecutions', () => {
    it('extracts executions from _embedded.pipelineExecutions', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          _embedded: {
            pipelineExecutions: [{ id: 'e1', status: 'FINISHED' }]
          }
        })
      });
      const execs = await api.getExecutions(mockOrg, 'token', 'prog1', 'pl1');
      expect(execs).toEqual([{ id: 'e1', status: 'FINISHED' }]);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('executions?start=0&limit=50'),
        expect.any(Object)
      );
    });
  });

  describe('getEnvironments', () => {
    it('extracts environments from _embedded', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          _embedded: {
            environments: [{ id: 'env1', name: 'dev' }]
          }
        })
      });
      const envs = await api.getEnvironments(mockOrg, 'token', 'prog1');
      expect(envs).toEqual([{ id: 'env1', name: 'dev' }]);
    });
  });

  describe('getEnvironmentLogs', () => {
    it('includes days param between 1 and 7', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ _embedded: { logs: [] } })
      });
      await api.getEnvironmentLogs(mockOrg, 'token', 'prog1', 'env1', 7);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('days=7'),
        expect.any(Object)
      );
    });
  });

  describe('apiRequest', () => {
    it('throws on non-ok response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: 'Not found' })
      });
      await expect(
        api.getProgram(mockOrg, 'token', 'prog1')
      ).rejects.toThrow('API 404');
    });
  });
});
