import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@bg/(.*)$': '<rootDir>/src/bg/ts/$1',
    '^@fg/(.*)$': '<rootDir>/src/fg/ts/$1'
  },
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
  testMatch: [
    '**/*.test.ts',
    '**/*.test.js'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }],
    '^.+\\.js$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 30000,
  // Allow existing JS tests to run alongside new TS tests
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$'
  ]
};

export default config;
