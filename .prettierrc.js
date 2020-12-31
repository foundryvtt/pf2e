module.exports = {
    trailingComma: 'none',
    tabWidth: 4,
    printWidth: 110,
    requirePragma: true,
    overrides: [
        {
            files: ['*.ts', '*.js'],
            options: {
                singleQuote: true,
                semicolons: true
            }
        },
        {
            files: ['*.scss', '*.css'],
            options: {
                requirePragma: false,
                parser: 'scss'
            },
        },
        {
            files: '*.html',
            options: {
                requirePragma: false,
                tabWidth: 2,
                parser: 'html',
                htmlWhitespaceSensitivity: 'ignore'
            }
        },
        {
            files: '*.json',
            options: {
                requirePragma: false,
                parser: 'json',
                htmlWhitespaceSensitivity: 'ignore'
            }
        }
    ],
};
