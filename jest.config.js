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
      '^@actor/(.*)$': '<rootDir>/src/module/actor/$1',
      '^@item/(.*)$': '<rootDir>/src/module/item/$1',
      '^@item$': '<rootDir>/src/module/item',
      '^@module/(.*)$': '<rootDir>/src/module/$1',
      '^@scripts/(.*)$': '<rootDir>/src/scripts/$1',
      '^@system/(.*)$': '<rootDir>/src/module/system/$1',
  },
  setupFiles: [
    './tests/setup.ts',
  ],
  globals: {
    Application: class {}
  },
};
