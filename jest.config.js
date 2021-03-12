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
      '^@actor/(.*)$': '<rootDir>/src/actor/$1',
      '^@item/(.*)$': '<rootDir>/src/item/$1',
      '^@module/(.*)$': '<rootDir>/src/module/$1',
      '^@scripts/(.*)$': '<rootDir>/src/scripts/$1',
  },
  setupFiles: [
    './tests/setup.ts',
  ],
  globals: {
    Application: class {}
  },
};
