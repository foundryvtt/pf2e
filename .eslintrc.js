module.exports = {
    env: {
        browser: true,
        es6: true,
        'jest/globals': true,
    },
    extends: [
        'prettier',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/errors',
        'plugin:import/typescript',
    ],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    rules: {
        'prettier/prettier': 'error',
        'no-console': 'off',
        'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
        'import/export': 'off', // Handled by typescript not allowing duplicate identifiers
        'import/no-default-export': 'error',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
    },
    settings: {
        'import/resolver': {
            node: {
                paths: ['src', 'types', '', 'dist'],
                extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
            },
            'eslint-import-resolver-typescript': true,
            typescript: {
                alwaysTryTypes: true,
            },
        },
        'import/parsers': { '@typescript-eslint/parser': ['.ts'] },
    },
    plugins: ['jest', 'prettier', '@typescript-eslint', 'import'],
    overrides: [
        {
            files: 'tests/**/*',
            rules: {
                'global-require': 'off',
            },
        },
    ],
    parser: '@typescript-eslint/parser',
};
