module.exports = {
    trailingComma: 'all',
    singleQuote: true,
    printWidth: 120,
    tabWidth: 4,
    useTabs: false,
    requirePragma: false,
    overrides: [
        {
            files: ['*.scss', '*.css'],
            options: {
                requirePragma: false,
                parser: 'scss',
            },
        },
        {
            files: '*.html',
            options: {
                requirePragma: false,
                parser: 'html',
                htmlWhitespaceSensitivity: 'ignore',
            }
        }
    ],
};
