module.exports = {
    printWidth: 120,
    tabWidth: 4,
    overrides: [
        {
            files: ["*.scss", "*.css"],
            options: {
                requirePragma: false,
                parser: "scss",
            },
        },
        {
            files: "*.html",
            options: {
                requirePragma: false,
                parser: "html",
                htmlWhitespaceSensitivity: "ignore",
            },
        },
    ],
};
