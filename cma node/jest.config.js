module.exports = {
  // Specify the test environment for Node.js backend
  testEnvironment: 'node',

  // Pattern to find test files across __tests__ directory and subfolders
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Display individual test results with hierarchy during test run
  verbose: true,

  // Default timeout in milliseconds for asynchronous test execution
  testTimeout: 10000,
};
