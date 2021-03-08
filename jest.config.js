module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: [
      '<rootDir>',
      '<rootDir>/src',
      '<rootDir>/dist',
      '<rootDir>/types/foundry-pc-types',
  ],
  moduleNameMapper: {
      '^@utils$': '<rootDir>/src/module/utils.ts',
      '^@scripts/(.*)$': '<rootDir>/src/scripts/$1',
  },
  setupFiles: [
    './tests/setup.ts',
  ],
  globals: {
    Application: class {}
  },
};
