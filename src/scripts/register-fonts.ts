export function registerFonts(): void {
    CONFIG.fontDefinitions["Eczar"] = {
        editor: true,
        fonts: [
            { urls: ["systems/pf2e/fonts/eczar-v16-latin-ext_latin-regular.woff2"], style: "normal", weight: "400" },
            { urls: ["systems/pf2e/fonts/eczar-v16-latin-ext_latin-500.woff2"], style: "normal", weight: "500" },
            { urls: ["systems/pf2e/fonts/eczar-v16-latin-ext_latin-600.woff2"], style: "normal", weight: "600" },
            { urls: ["systems/pf2e/fonts/eczar-v16-latin-ext_latin-700.woff2"], style: "normal", weight: "700" },
            { urls: ["systems/pf2e/fonts/eczar-v16-latin-ext_latin-800.woff2"], style: "normal", weight: "800" },
        ],
    };

    CONFIG.fontDefinitions["Gelasio"] = {
        editor: false,
        fonts: [
            { urls: ["systems/pf2e/fonts/gelasio-v9-latin-ext_latin-regular.woff2"], style: "normal", weight: "400" },
            { urls: ["systems/pf2e/fonts/gelasio-v9-latin-ext_latin-italic.woff2"], style: "italic", weight: "400" },
            { urls: ["systems/pf2e/fonts/gelasio-v9-latin-ext_latin-500.woff2"], style: "normal", weight: "500" },
            { urls: ["systems/pf2e/fonts/gelasio-v9-latin-ext_latin-500italic.woff2"], style: "italic", weight: "500" },
            { urls: ["systems/pf2e/fonts/gelasio-v9-latin-ext_latin-600.woff2"], style: "normal", weight: "600" },
            { urls: ["systems/pf2e/fonts/gelasio-v9-latin-ext_latin-600italic.woff2"], style: "italic", weight: "600" },
            { urls: ["systems/pf2e/fonts/gelasio-v9-latin-ext_latin-700.woff2"], style: "normal", weight: "700" },
            { urls: ["systems/pf2e/fonts/gelasio-v9-latin-ext_latin-700italic.woff2"], style: "italic", weight: "700" },
        ],
    };

    // Hand-written script style for journal entries
    CONFIG.fontDefinitions["La Belle Aurore"] = {
        editor: true,
        fonts: [
            { urls: ["systems/pf2e/fonts/la-belle-aurore-v16-latin-regular.woff2"], style: "normal", weight: "400" },
        ],
    };

    // Pathfinder action glyphs
    CONFIG.fontDefinitions["Pathfinder2eActions"] = {
        editor: false,
        fonts: [{ urls: ["systems/pf2e/fonts/Pathfinder2eActions.ttf"] }],
    };

    CONFIG.fontDefinitions["Roboto"] = {
        editor: true,
        fonts: [
            {
                urls: ["systems/pf2e/fonts/roboto-v30-latin-ext_latin_cyrillic-regular.woff2"],
                style: "normal",
                weight: "400",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-v30-latin-ext_latin_cyrillic-italic.woff2"],
                style: "italic",
                weight: "400",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-v30-latin-ext_latin_cyrillic-500.woff2"],
                style: "normal",
                weight: "500",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-v30-latin-ext_latin_cyrillic-500italic.woff2"],
                style: "italic",
                weight: "500",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-v30-latin-ext_latin_cyrillic-700.woff2"],
                style: "normal",
                weight: "700",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-v30-latin-ext_latin_cyrillic-700italic.woff2"],
                style: "italic",
                weight: "700",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-v30-latin-ext_latin_cyrillic-900.woff2"],
                style: "normal",
                weight: "900",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-v30-latin-ext_latin_cyrillic-900italic.woff2"],
                style: "italic",
                weight: "900",
            },
        ],
    };

    CONFIG.fontDefinitions["Roboto Condensed"] = {
        editor: false,
        fonts: [
            {
                urls: ["systems/pf2e/fonts/roboto-condensed-v24-latin-ext_latin_cyrillic-regular.woff2"],
                style: "normal",
                weight: "400",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-condensed-v24-latin-ext_latin_cyrillic-italic.woff2"],
                style: "italic",
                weight: "400",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-condensed-v24-latin-ext_latin_cyrillic-700.woff2"],
                style: "normal",
                weight: "700",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-condensed-v24-latin-ext_latin_cyrillic-700italic.woff2"],
                style: "italic",
                weight: "700",
            },
        ],
    };

    CONFIG.fontDefinitions["Roboto Mono"] = {
        editor: false,
        fonts: [
            {
                urls: ["systems/pf2e/fonts/roboto-mono-v21-latin-ext_latin_cyrillic-regular.woff2"],
                style: "normal",
                weight: "400",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-mono-v21-latin-ext_latin_cyrillic-500.woff2"],
                style: "normal",
                weight: "500",
            },
            {
                urls: ["systems/pf2e/fonts/roboto-mono-v21-latin-ext_latin_cyrillic-700.woff2"],
                style: "italic",
                weight: "700",
            },
        ],
    };

    // Replace core Signika font with latin-extended coverage
    CONFIG.fontDefinitions["Signika"] = {
        editor: true,
        fonts: [
            { urls: ["systems/pf2e/fonts/signika-v19-latin-ext_latin-regular.woff2"], style: "normal", weight: "400" },
            { urls: ["systems/pf2e/fonts/signika-v19-latin-ext_latin-500.woff2"], style: "normal", weight: "500" },
            { urls: ["systems/pf2e/fonts/signika-v19-latin-ext_latin-600.woff2"], style: "normal", weight: "600" },
            { urls: ["systems/pf2e/fonts/signika-v19-latin-ext_latin-700.woff2"], style: "normal", weight: "700" },
        ],
    };

    CONFIG.fontDefinitions["Vollkorn"] = {
        editor: true,
        fonts: [
            {
                urls: ["systems/pf2e/fonts/vollkorn-v20-latin-ext_latin_cyrillic-regular.woff2"],
                style: "normal",
                weight: "400",
            },
            {
                urls: ["systems/pf2e/fonts/vollkorn-v20-latin-ext_latin_cyrillic-500.woff2"],
                style: "normal",
                weight: "500",
            },
            {
                urls: ["systems/pf2e/fonts/vollkorn-v20-latin-ext_latin_cyrillic-700.woff2"],
                style: "normal",
                weight: "600",
            },
            {
                urls: ["systems/pf2e/fonts/vollkorn-v20-latin-ext_latin_cyrillic-900.woff2"],
                style: "normal",
                weight: "700",
            },
        ],
    };

    // Core fonts without cross-OS compatibility
    delete CONFIG.fontDefinitions["Courier"];
    delete CONFIG.fontDefinitions["Times"];
    // Clear legacy fonts array
    CONFIG._fontFamilies = [];
}
