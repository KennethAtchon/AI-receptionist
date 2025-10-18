module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/fixtures/',
    '/__tests__/mocks/',
    '/__tests__/setup.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!src/index.ts', // Main export file
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 50,
      lines: 45,
      statements: 45,
    },
  },
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
};
