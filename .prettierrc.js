module.exports = {
    trailingComma: 'es5',
    singleQuote: true,
    tabWidth: 4,
    requirePragma: true,
    overrides: [
        {
            files: ['*.scss', '*.css'],
            options: {
                requirePragma: false,
            },
        },
    ],
};
