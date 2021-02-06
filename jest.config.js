module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: [
    '<rootDir>',
    '<rootDir>/src',
    '<rootDir>/dist',
    '<rootDir>/types/foundry-pc-types',
  ],
  setupFiles: [
    './tests/setup.ts',
  ],
  globals: {
    Application: class {}
  },
};
