/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/application/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../packages/shared-types/src/$1'
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        paths: {
          '@shared/*': ['../../packages/shared-types/src/*']
        }
      }
    }
  }
};
