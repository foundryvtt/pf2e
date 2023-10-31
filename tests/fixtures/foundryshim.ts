/**
 * A helper function which searches through an object to assign a value using a string key
 * This string key supports the notation a.b.c which would target object[a][b][c]
 *
 * @param obj {Object}   The object to update
 * @param key {String}      The string key
 * @param value             The value to be assigned
 *
 * @return A flag for whether or not the object was updated
 */
function setProperty(obj: object, key: string, value: unknown): boolean {
    let target = obj;
    let changed = false;

    // Convert the key to an object reference if it contains dot notation
    if (key.indexOf(".") !== -1) {
        const parts = key.split(".");
        key = parts.pop() ?? "";
        target = parts.reduce((o, i) => {
            if (!Object.prototype.hasOwnProperty.call(o, i)) (o as Record<string, unknown>)[i] = {};
            return (o as Record<string, unknown>)[i] as unknown as Record<string, unknown>;
        }, obj);
    }

    // Update the target
    if ((target as Record<string, unknown>)[key] !== value) {
        changed = true;
        (target as Record<string, unknown>)[key] = value;
    }

    // Return changed status
    return changed;
}

/**
 * Learn the named type of a token - extending the functionality of typeof to recognize some core Object types
 * @param token     Some passed token
 * @return The named type of the token
 */
function getType(token: unknown): string {
    const tof = typeof token;
    if (typeof token === "object") {
        if (token === null) return "null";
        const cn = token.constructor.name;
        if (["String", "Number", "Boolean", "Array", "Set"].includes(cn)) return cn;
        else if (/^HTML/.test(cn)) return "HTMLElement";
        else return "Object";
    }
    return tof;
}

/**
 * Expand a flattened object to be a standard multi-dimensional nested Object by converting all dot-notation keys to
 * inner objects.
 *
 * @param obj  The object to expand
 * @param _d   Recursion depth, to prevent overflow
 * @return An expanded object
 */
function expandObject(obj: object, _d = 0) {
    const expanded = {};
    if (_d > 10) throw new Error("Maximum depth exceeded");
    for (const [k, v0] of Object.entries(obj)) {
        let v = v0;
        if (v instanceof Object && !Array.isArray(v)) v = expandObject(v, _d + 1);
        setProperty(expanded, k, v);
    }
    return expanded;
}

/**
 * A cheap data duplication trick, surprisingly relatively performant
 * @param original Some sort of data
 */
function duplicate<T>(original: T): T {
    return JSON.parse(JSON.stringify(original));
}

/** Update a source object by replacing its keys and values with those from a target object. */
export function mergeObject<T extends object, U extends object = T>(
    original: T,
    other?: U,
    options?: MergeObjectOptions,
    _d?: number,
): T & U;
export function mergeObject(
    original: object,
    other: object = {},
    {
        insertKeys = true,
        insertValues = true,
        overwrite = true,
        recursive = true,
        inplace = true,
        enforceTypes = false,
        performDeletions = false,
    } = {},
    _d = 0,
): object {
    other = other || {};
    if (!(original instanceof Object) || !(other instanceof Object)) {
        throw new Error("One of original or other are not Objects!");
    }
    const options = { insertKeys, insertValues, overwrite, recursive, inplace, enforceTypes, performDeletions };

    // Special handling at depth 0
    if (_d === 0) {
        if (Object.keys(other).some((k) => /\./.test(k))) other = expandObject(other);
        if (Object.keys(original).some((k) => /\./.test(k))) {
            const expanded = expandObject(original);
            if (inplace) {
                Object.keys(original).forEach((k) => delete (original as Record<string, unknown>)[k]);
                Object.assign(original, expanded);
            } else original = expanded;
        } else if (!inplace) original = deepClone(original);
    }

    // Iterate over the other object
    for (const k of Object.keys(other)) {
        const v = (other as Record<string, unknown>)[k];
        if (Object.hasOwn(original, k)) _mergeUpdate(original, k, v, options, _d + 1);
        else _mergeInsert(original, k, v, options, _d + 1);
    }
    return original;
}

/** A helper function for merging objects when the target key does not exist in the original */
function _mergeInsert(
    original: object,
    k: string,
    v: unknown,
    {
        insertKeys,
        insertValues,
        performDeletions,
    }: { insertKeys?: boolean; insertValues?: boolean; performDeletions?: boolean } = {},
    _d: number,
): object | void {
    // Delete a key
    if (k.startsWith("-=") && performDeletions) {
        delete (original as Record<string, unknown>)[k.slice(2)];
        return;
    }

    const canInsert = (_d <= 1 && insertKeys) || (_d > 1 && insertValues);
    if (!canInsert) return;

    // Recursively create simple objects
    if (v?.constructor === Object) {
        (original as Record<string, unknown>)[k] = mergeObject({}, v, {
            insertKeys: true,
            inplace: true,
            performDeletions,
        });
        return;
    }

    // Insert a key
    (original as Record<string, unknown>)[k] = v;
}

/** A helper function for merging objects when the target key exists in the original */
function _mergeUpdate(
    original: object,
    k: string,
    v: unknown,
    {
        insertKeys,
        insertValues,
        enforceTypes,
        overwrite,
        recursive,
        performDeletions,
    }: Partial<MergeObjectOptions> = {},
    _d: number,
): object | void {
    const x = (original as Record<string, unknown>)[k];
    const tv = getType(v);
    const tx = getType(x);

    // Recursively merge an inner object
    if (tv === "Object" && tx === "Object" && recursive) {
        return mergeObject(
            x as object,
            v as object,
            {
                insertKeys,
                insertValues,
                overwrite,
                enforceTypes,
                performDeletions,
                inplace: true,
            },
            _d,
        );
    }

    // Overwrite an existing value
    if (overwrite) {
        if (tx !== "undefined" && tv !== tx && enforceTypes) {
            throw new Error(`Mismatched data types encountered during object merge.`);
        }
        (original as Record<string, unknown>)[k] = v;
    }
}

function arrayEquals(self: unknown[], other: unknown[]): boolean {
    if (!(other instanceof Array) || other.length !== self.length) return false;
    return self.every((v, i) => other[i] === v);
}

/**
 * Deeply difference an object against some other, returning the update keys and values
 * @param original     An object comparing data against which to compare.
 * @param other        An object containing potentially different data.
 * @param [inner]     Only recognize differences in other for keys which also exist in original.
 * @return An object of the data in other which differs from that in original.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function diffObject(original: any, other: any, { inner = false } = {}): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function _difference(v0: any, v1: any): [boolean, any] {
        const t0 = getType(v0);
        const t1 = getType(v1);
        if (t0 !== t1) return [true, v1];
        if (t0 === "Array") return [!arrayEquals(v0, v1), v1];
        if (t0 === "Object") {
            const v0IsEmpty = Object.keys(v0).length === 0;
            const v1IsEmpty = Object.keys(v1).length === 0;
            if (v0IsEmpty !== v1IsEmpty) return [true, v1];
            const d = diffObject(v0, v1, { inner });
            return [Object.keys(d).length > 0, d];
        }
        return [v0 !== v1, v1];
    }

    // Recursively call the _difference function
    return Object.keys(other).reduce(
        (obj, key) => {
            if (inner && original[key] === undefined) return obj;
            const [isDifferent, difference] = _difference(original[key], other[key]);
            if (isDifferent) obj[key] = difference;
            return obj;
        },
        {} as Record<string, unknown>,
    );
}

export function populateFoundryUtilFunctions(): void {
    global.setProperty = setProperty;
    global.getType = getType;
    global.mergeObject = mergeObject;
    global.diffObject = diffObject;
    global.duplicate = duplicate;
}
