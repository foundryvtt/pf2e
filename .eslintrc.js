module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    ItemSheet: 'readonly',
    game: 'readonly',
    mergeObject: 'readonly',
    CONFIG: 'writable',
    duplicate: 'readonly',
    $: 'readonly',
    Tabs: 'readonly',
    Hooks: 'readonly',
    Items: 'readonly',
    loadTemplates: 'readonly',
    Combat: 'writable'
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    "no-restricted-syntax": 0,
    "no-new": 0,
    "no-underscore-dangle": 0,
    "no-console": 0
  },
};
