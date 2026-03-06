const mockStoreData = new Map();
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: (key, defaultValue) => {
      const val = mockStoreData.get(key);
      return val !== undefined ? val : defaultValue;
    },
    set: (key, value) => {
      mockStoreData.set(key, value);
    },
    delete: (key) => {
      mockStoreData.delete(key);
    }
  }));
});

const store = require('../src/store');

describe('Store', () => {
  beforeEach(() => {
    mockStoreData.clear();
  });

  it('getOrgs returns empty array initially', () => {
    const orgs = store.getOrgs();
    expect(orgs).toEqual([]);
  });

  it('saveOrg adds new org with generated id', () => {
    const org = {
      name: 'Test Org',
      organizationId: 'org@AdobeOrg',
      clientId: 'cid',
      clientSecret: 'secret'
    };
    const saved = store.saveOrg(org);
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Test Org');
    expect(saved.createdAt).toBeDefined();
    const orgs = store.getOrgs();
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe('Test Org');
  });

  it('saveOrg updates existing org by id', () => {
    const org1 = store.saveOrg({
      name: 'Org 1',
      organizationId: 'o1',
      clientId: 'c1',
      clientSecret: 's1'
    });
    const orgsBefore = store.getOrgs();
    expect(orgsBefore).toHaveLength(1);
    store.saveOrg({ ...org1, name: 'Org 1 Updated' });
    const orgsAfter = store.getOrgs();
    expect(orgsAfter).toHaveLength(1);
    expect(orgsAfter[0].name).toBe('Org 1 Updated');
  });

  it('deleteOrg removes org by id', () => {
    const saved = store.saveOrg({
      name: 'To Delete',
      organizationId: 'o1',
      clientId: 'c1',
      clientSecret: 's1'
    });
    expect(store.getOrgs()).toHaveLength(1);
    store.deleteOrg(saved.id);
    expect(store.getOrgs()).toHaveLength(0);
  });

  it('setActiveOrg and getActiveOrgId persist active org', () => {
    store.setActiveOrg('org-123');
    expect(store.getActiveOrgId()).toBe('org-123');
  });

  it('deleteOrg clears activeOrgId when deleting active org', () => {
    const saved = store.saveOrg({
      name: 'Active',
      organizationId: 'o1',
      clientId: 'c1',
      clientSecret: 's1'
    });
    store.setActiveOrg(saved.id);
    store.deleteOrg(saved.id);
    expect(store.getActiveOrgId()).toBeUndefined();
  });
});
