module.exports = {
  env: {
    browser: true,
    es6: true,
    'jest/globals': true,
  },
  extends: ['airbnb-base', 'prettier'],
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
    Combat: 'writable',
    canvas: 'readonly',
    ActorSheet: 'readonly',
    Actor: 'readonly',
    Actors: 'readonly',
    fetchSpell: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
    'no-restricted-syntax': 0,
    'no-new': 0,
    'no-underscore-dangle': 0,
    'no-console': 0,
    'import/extensions': [1, 'always'],
    'class-methods-use-this': 0,
  },
  settings: {
    'import/resolver': {
      node: {
        paths: ['src', '', 'dist'],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
  plugins: ['jest', 'prettier'],
  overrides: [
    {
      files: 'tests/**/*',
      rules: {
        'global-require': 'off',
      },
    },
  ],
  parser: 'babel-eslint',
};
