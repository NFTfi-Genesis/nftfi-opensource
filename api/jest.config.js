const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.base.json');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.[jt]s', '**/*.e2e-test.[jt]s'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  roots: ['<rootDir>/components/'],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths /*, { prefix: '<rootDir>/' } */),
  globalSetup: './jest.setup.js',
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.*/test(/.*)?/.*\\.factory\\.ts$'],
  coverageThreshold: {
    global: {
      statements: 95.6,
      branches: 86.9,
      functions: 86.5,
      lines: 95.6
    }
  }
};
