describe('Adobe Cloud Manager App', () => {
  beforeEach(() => {
    cy.visit('/cypress/test-app/index.html');
    cy.get('.app').should('be.visible');
  });

  it('displays the app header', () => {
    cy.contains('h1', 'Adobe Cloud Manager').should('be.visible');
    cy.get('#addOrgBtn').should('contain', 'Add Org');
    cy.get('#manageOrgsBtn').should('contain', 'Manage Orgs');
  });

  it('loads orgs and displays program list when org selected', () => {
    // Mock returns org1, so org selector should populate
    cy.get('#orgSelect', { timeout: 3000 }).should('not.be.disabled');
    cy.get('#orgSelect option').should('have.length.at.least', 2);
    cy.get('#orgSelect').select('org1');
    // After selecting org, programs/pipelines/environments load
    cy.get('#programList', { timeout: 5000 }).within(() => {
      cy.get('.list-item').should('have.length.at.least', 1);
    });
  });

  it('opens Add Org modal when clicking + Add Org', () => {
    cy.get('#addOrgBtn').click();
    cy.get('#orgModal').should('be.visible');
    cy.get('#orgModalTitle').should('contain', 'Add Organization');
    cy.get('#orgName').should('be.visible');
    cy.get('#orgFormCancel').click();
    cy.get('#orgModal').should('not.be.visible');
  });

  it('opens Manage Orgs modal when clicking Manage Orgs', () => {
    cy.get('#manageOrgsBtn').click();
    cy.get('#manageOrgsModal').should('be.visible');
    cy.contains('h2', 'Manage Organizations').should('be.visible');
    cy.get('#manageOrgsClose').click();
    cy.get('#manageOrgsModal').should('not.be.visible');
  });

  it('navigates from program to pipeline to execution', () => {
    cy.get('#orgSelect', { timeout: 3000 }).select('org1');
    // Select a program
    cy.get('#programList .list-item').first().click();
    // Select pipeline
    cy.get('#pipelineList .list-item', { timeout: 3000 }).first().click();
    // Should show pipeline detail with executions
    cy.get('.breadcrumb').should('contain', 'Deploy to Dev');
    cy.get('.execution-item, #startPipelineBtn').should('exist');
  });

  it('navigates to environment and shows detail', () => {
    cy.get('#orgSelect', { timeout: 3000 }).select('org1');
    cy.get('#programList .list-item').first().click();
    cy.get('#environmentList .list-item', { timeout: 3000 }).first().click();
    cy.get('.breadcrumb').should('contain', 'dev-environment');
    cy.get('.detail-content').should('be.visible');
  });
});
