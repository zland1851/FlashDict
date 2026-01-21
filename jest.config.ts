import type { Config } from 'jest';

const config: Config = {
  // Use projects to separate unit tests (jsdom) from E2E tests (node)
  projects: [
    // Unit tests - use jsdom environment for DOM testing
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/tests/unit'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@bg/(.*)$': '<rootDir>/src/bg/ts/$1',
        '^@fg/(.*)$': '<rootDir>/src/fg/ts/$1'
      },
      testMatch: ['**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }]
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
    },
    // E2E tests - use node environment for Puppeteer
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests/e2e'],
      testMatch: ['**/*.test.js'],
      transform: {
        '^.+\\.js$': 'babel-jest'
      },
      moduleFileExtensions: ['js', 'json'],
    }
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/lib/**',
    '!src/dict/**',
    '!src/**/*.d.ts'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true,
  testTimeout: 30000,
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$'
  ]
};

export default config;
