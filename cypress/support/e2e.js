// Cypress support file - commands and global config
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught errors (e.g. from renderer)
  return false;
});
