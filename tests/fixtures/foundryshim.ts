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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setProperty(obj: Record<string, any>, key: string, value: any): boolean {
    let target = obj;
    let changed = false;

    // Convert the key to an object reference if it contains dot notation
    if (key.indexOf(".") !== -1) {
        const parts = key.split(".");
        key = parts.pop() ?? "";
        target = parts.reduce((o, i) => {
            if (!Object.prototype.hasOwnProperty.call(o, i)) o[i] = {};
            return o[i];
        }, obj);
    }

    // Update the target
    if (target[key] !== value) {
        changed = true;
        target[key] = value;
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expandObject(obj: any, _d = 0) {
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

/**
 * Update a source object by replacing its keys and values with those from a target object.
 *
 * @param original     The initial object which should be updated with values from the target
 * @param other        A new object whose values should replace those in the source
 *
 * @param [insertKeys]      Control whether to insert new top-level objects into the resulting structure
 *                                    which do not previously exist in the original object.
 * @param [insertValues]    Control whether to insert new nested values into child objects in the resulting
 *                                    structure which did not previously exist in the original object.
 * @param [overwrite]       Control whether to replace existing values in the source, or only merge values
 *                                    which do not already exist in the original object.
 * @param [recursive]       Control whether to merge inner-objects recursively (if true), or whether to
 *                                    simply replace inner objects with a provided new value.
 * @param [inplace]         Control whether to apply updates to the original object in-place (if true),
 *                                    otherwise the original object is duplicated and the copy is merged.
 * @param [enforceTypes]    Control whether strict type checking requires that the value of a key in the
 *                                    other object must match the data type in the original data to be merged.
 * @param [_d]               A privately used parameter to track recursion depth.
 *
 * @returns The original source object including updated, inserted, or overwritten records.
 *
 * @example <caption>Control how new keys and values are added</caption>
 * mergeObject({k1: "v1"}, {k2: "v2"}, {insertKeys: false}); // {k1: "v1"}
 * mergeObject({k1: "v1"}, {k2: "v2"}, {insertKeys: true});  // {k1: "v1", k2: "v2"}
 * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {insertValues: false}); // {k1: {i1: "v1"}}
 * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {insertValues: true}); // {k1: {i1: "v1", i2: "v2"}}
 *
 * @example <caption>Control how existing data is overwritten</caption>
 * mergeObject({k1: "v1"}, {k1: "v2"}, {overwrite: true}); // {k1: "v2"}
 * mergeObject({k1: "v1"}, {k1: "v2"}, {overwrite: false}); // {k1: "v1"}
 *
 * @example <caption>Control whether merges are performed recursively</caption>
 * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {recursive: false}); // {k1: {i1: "v2"}}
 * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {recursive: true}); // {k1: {i1: "v1", i2: "v2"}}
 *
 * @example <caption>Deleting an existing object key</caption>
 * mergeObject({k1: "v1", k2: "v2"}, {"-=k1": null});   // {k2: "v2"}
 */
function mergeObject(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    original: any,
    other = {},
    {
        insertKeys = true,
        insertValues = true,
        overwrite = true,
        recursive = true,
        inplace = true,
        enforceTypes = false,
    } = {},
    _d = 0
) {
    other = other || {};
    if (!(original instanceof Object) || !(other instanceof Object)) {
        throw Error("One of original or other are not Objects!");
    }
    const depth = _d + 1;

    // Maybe copy the original data at depth 0
    if (!inplace && _d === 0) original = duplicate(original);

    // Enforce object expansion at depth 0
    if (_d === 0 && Object.keys(original).some((k) => /\./.test(k))) original = expandObject(original);
    if (_d === 0 && Object.keys(other).some((k) => /\./.test(k))) other = expandObject(other);

    // Iterate over the other object
    for (const [k0, v] of Object.entries(other)) {
        let k = k0;
        const tv = getType(v as Token);

        // Prepare to delete
        let toDelete = false;
        if (k.startsWith("-=")) {
            k = k.slice(2);
            toDelete = v === null;
        }

        // Get the existing object
        let x = original[k];
        let has = Object.hasOwnProperty.call(original, k);
        let tx = getType(x);

        // Ensure that inner objects exist
        if (!has && tv === "Object") {
            x = {};
            original[k] = {};
            has = true;
            tx = "Object";
        }

        // Case 1 - Key exists
        if (has) {
            // 1.1 - Recursively merge an inner object
            if (tv === "Object" && tx === "Object" && recursive) {
                mergeObject(
                    x,
                    v as Token,
                    {
                        insertKeys,
                        insertValues,
                        overwrite,
                        inplace: true,
                        enforceTypes,
                    },
                    depth
                );
            }

            // 1.2 - Remove an existing key
            else if (toDelete) {
                delete original[k];
            }

            // 1.3 - Overwrite existing value
            else if (overwrite) {
                if (tx && tv !== tx && enforceTypes) {
                    throw new Error(`Mismatched data types encountered during object merge.`);
                }
                original[k] = v;
            }

            // 1.4 - Insert new value
            else if (x === undefined && insertValues) {
                original[k] = v;
            }
        }

        // Case 2 - Key does not exist
        else if (!toDelete) {
            const canInsert = (depth === 1 && insertKeys) || (depth > 1 && insertValues);
            if (canInsert) original[k] = v;
        }
    }

    // Return the object for use
    return original;
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
    return Object.keys(other).reduce((obj, key) => {
        if (inner && original[key] === undefined) return obj;
        const [isDifferent, difference] = _difference(original[key], other[key]);
        if (isDifferent) obj[key] = difference;
        return obj;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {} as Record<string, any>);
}

export function populateFoundryUtilFunctions(): void {
    global.setProperty = setProperty;
    global.getType = getType;
    global.mergeObject = mergeObject;
    global.diffObject = diffObject;
    global.duplicate = duplicate;
}
