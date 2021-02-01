module.exports = {
    env: {
        browser: true,
        es6: true,
        'jest/globals': true,
    },
    extends: ['prettier'],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    rules: {
        'prettier/prettier': 'error',
        'no-restricted-syntax': 'off',
        'no-new': 'off',
        'no-underscore-dangle': 'off',
        'no-console': 'off',
        'class-methods-use-this': 'off',
        'max-classes-per-file': 'off',
        'import/extensions': 'off',
        'no-param-reassign': 'off',
        'prefer-destructuring': 'off',
        'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
        'import/no-default-export': 'error',
        'no-continue': 'off',
        'no-constant-condition': ['error', { checkLoops: false }],
        'import/prefer-default-export': 'off',
        'no-else-return': 'off',
        'no-unused-vars': 'off',
        'lines-between-class-members': 'off',
        'no-dupe-class-members': 'off',
        '@typescript-eslint/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        'no-unused-expressions': 'off',
        '@typescript-eslint/no-unused-expressions': 'error',
    },
    settings: {
        'import/resolver': {
            node: {
                paths: ['src', 'types', '', 'dist'],
                extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
            },
        },
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
