// NEXUS ON Estimating — Jest Configuration
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/apps/web', '<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.{test,spec}.{ts,tsx}',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/web/$1',
    '^@on/db$': '<rootDir>/packages/db/src/index.ts',
    '^@on/estimating-core$': '<rootDir>/packages/estimating-core/src/index.ts',
    '^@on/ai$': '<rootDir>/packages/ai/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  collectCoverageFrom: [
    'packages/estimating-core/src/**/*.ts',
    'packages/db/src/**/*.ts',
    'apps/web/lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    // Financial calculations require 100% coverage
    './packages/estimating-core/src/calculator.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};

export default config;
