global.deepClone = <T>(original: T): T => {
    // Simple types
    if (typeof original !== "object" || original === null) return original;

    // Arrays
    if (Array.isArray(original)) return original.map(deepClone) as unknown as T;

    // Dates
    if (original instanceof Date) return new Date(original) as T & Date;

    // Unsupported advanced objects
    if ("constructor" in original && (original as { constructor?: unknown })["constructor"] !== Object) return original;

    // Other objects
    const clone: Record<string, unknown> = {};
    for (const k of Object.keys(original)) {
        clone[k] = deepClone((original as Record<string, unknown>)[k]);
    }
    return clone as T;
};

global.randomID = function randomID(length = 16): string {
    const rnd = () => Math.random().toString(36).substring(2);
    let id = "";
    while (id.length < length) id += rnd();
    return id.substring(0, length);
};
