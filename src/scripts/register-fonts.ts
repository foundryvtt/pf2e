export function registerFonts(): void {
    const fontDir = `systems/${SYSTEM_ID}/fonts`;
    CONFIG.fontDefinitions["Eczar"] = {
        editor: true,
        fonts: [
            { urls: [`${fontDir}/eczar-v16-latin-ext_latin-regular.woff2`], style: "normal", weight: "400" },
            { urls: [`${fontDir}/eczar-v16-latin-ext_latin-500.woff2`], style: "normal", weight: "500" },
            { urls: [`${fontDir}/eczar-v16-latin-ext_latin-600.woff2`], style: "normal", weight: "600" },
            { urls: [`${fontDir}/eczar-v16-latin-ext_latin-700.woff2`], style: "normal", weight: "700" },
            { urls: [`${fontDir}/eczar-v16-latin-ext_latin-800.woff2`], style: "normal", weight: "800" },
        ],
    };

    CONFIG.fontDefinitions["Gelasio"] = {
        editor: false,
        fonts: [
            { urls: [`${fontDir}/gelasio-v9-latin-ext_latin-regular.woff2`], style: "normal", weight: "400" },
            { urls: [`${fontDir}/gelasio-v9-latin-ext_latin-italic.woff2`], style: "italic", weight: "400" },
            { urls: [`${fontDir}/gelasio-v9-latin-ext_latin-500.woff2`], style: "normal", weight: "500" },
            { urls: [`${fontDir}/gelasio-v9-latin-ext_latin-500italic.woff2`], style: "italic", weight: "500" },
            { urls: [`${fontDir}/gelasio-v9-latin-ext_latin-600.woff2`], style: "normal", weight: "600" },
            { urls: [`${fontDir}/gelasio-v9-latin-ext_latin-600italic.woff2`], style: "italic", weight: "600" },
            { urls: [`${fontDir}/gelasio-v9-latin-ext_latin-700.woff2`], style: "normal", weight: "700" },
            { urls: [`${fontDir}/gelasio-v9-latin-ext_latin-700italic.woff2`], style: "italic", weight: "700" },
        ],
    };

    // Hand-written script style for journal entries
    CONFIG.fontDefinitions["La Belle Aurore"] = {
        editor: true,
        fonts: [{ urls: [`${fontDir}/la-belle-aurore-v16-latin-regular.woff2`], style: "normal", weight: "400" }],
    };

    // Pathfinder action glyphs
    CONFIG.fontDefinitions["Pathfinder2eActions"] = {
        editor: false,
        fonts: [{ urls: [`${fontDir}/pathfinder-2e-actions.woff2`] }],
    };

    CONFIG.fontDefinitions["Roboto"] = {
        editor: true,
        fonts: [
            { urls: [`${fontDir}/roboto-v30-latin-ext_latin_cyrillic-regular.woff2`], style: "normal", weight: "400" },
            { urls: [`${fontDir}/roboto-v30-latin-ext_latin_cyrillic-italic.woff2`], style: "italic", weight: "400" },
            { urls: [`${fontDir}/roboto-v30-latin-ext_latin_cyrillic-500.woff2`], style: "normal", weight: "500" },
            {
                urls: [`${fontDir}/roboto-v30-latin-ext_latin_cyrillic-500italic.woff2`],
                style: "italic",
                weight: "500",
            },
            { urls: [`${fontDir}/roboto-v30-latin-ext_latin_cyrillic-700.woff2`], style: "normal", weight: "700" },
            {
                urls: [`${fontDir}/roboto-v30-latin-ext_latin_cyrillic-700italic.woff2`],
                style: "italic",
                weight: "700",
            },
            { urls: [`${fontDir}/roboto-v30-latin-ext_latin_cyrillic-900.woff2`], style: "normal", weight: "900" },
            {
                urls: [`${fontDir}/roboto-v30-latin-ext_latin_cyrillic-900italic.woff2`],
                style: "italic",
                weight: "900",
            },
        ],
    };

    CONFIG.fontDefinitions["Roboto Condensed"] = {
        editor: false,
        fonts: [
            {
                urls: [`${fontDir}/roboto-condensed-v24-latin-ext_latin_cyrillic-regular.woff2`],
                style: "normal",
                weight: "400",
            },
            {
                urls: [`${fontDir}/roboto-condensed-v24-latin-ext_latin_cyrillic-italic.woff2`],
                style: "italic",
                weight: "400",
            },
            {
                urls: [`${fontDir}/roboto-condensed-v24-latin-ext_latin_cyrillic-700.woff2`],
                style: "normal",
                weight: "700",
            },
            {
                urls: [`${fontDir}/roboto-condensed-v24-latin-ext_latin_cyrillic-700italic.woff2`],
                style: "italic",
                weight: "700",
            },
        ],
    };

    CONFIG.fontDefinitions["Roboto Mono"] = {
        editor: false,
        fonts: [
            {
                urls: [`${fontDir}/roboto-mono-v21-latin-ext_latin_cyrillic-regular.woff2`],
                style: "normal",
                weight: "400",
            },
            { urls: [`${fontDir}/roboto-mono-v21-latin-ext_latin_cyrillic-500.woff2`], style: "normal", weight: "500" },
            { urls: [`${fontDir}/roboto-mono-v21-latin-ext_latin_cyrillic-700.woff2`], style: "italic", weight: "700" },
        ],
    };

    CONFIG.fontDefinitions["Vollkorn"] = {
        editor: true,
        fonts: [
            {
                urls: [`${fontDir}/vollkorn-v20-latin-ext_latin_cyrillic-regular.woff2`],
                style: "normal",
                weight: "400",
            },
            { urls: [`${fontDir}/vollkorn-v20-latin-ext_latin_cyrillic-500.woff2`], style: "normal", weight: "500" },
            { urls: [`${fontDir}/vollkorn-v20-latin-ext_latin_cyrillic-700.woff2`], style: "normal", weight: "600" },
            { urls: [`${fontDir}/vollkorn-v20-latin-ext_latin_cyrillic-900.woff2`], style: "normal", weight: "700" },
        ],
    };

    // Core fonts without cross-OS compatibility
    delete CONFIG.fontDefinitions["Arial"];
    delete CONFIG.fontDefinitions["Courier"];
    delete CONFIG.fontDefinitions["Courier New"];
    delete CONFIG.fontDefinitions["Times"];
    delete CONFIG.fontDefinitions["Times New Roman"];
}
