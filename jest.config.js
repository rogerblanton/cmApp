/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['src/api.js', 'src/store.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
};
