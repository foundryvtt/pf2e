module.exports = {
    env: {
        browser: true,
        es6: true,
        'jest/globals': true,
    },
    extends: [
        'prettier',
        'plugin:import/errors',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    ignorePatterns: ['dist/', 'types/foundry/client/pixi.d.ts'],
    rules: {
        'prettier/prettier': 'error',
        'no-console': 'off',
        'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
        'import/no-default-export': 'error',
        'deprecation/deprecation': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        '@typescript-eslint/prefer-namespace-keyword': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-vars': 'off', // Handled by tsconfig
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
    plugins: ['jest', 'prettier', 'deprecation', '@typescript-eslint', 'import'],
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
