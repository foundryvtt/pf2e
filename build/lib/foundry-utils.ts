import * as R from "remeda";

/**
 * Quickly clone a simple piece of data, returning a copy which can be mutated safely.
 * This method DOES support recursive data structures containing inner objects or arrays.
 * This method DOES NOT support advanced object types like Set, Map, or other specialized classes.
 * @param original Some sort of data
 * @return The clone of that data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepClone<T>(original: T): T extends Set<any> | Map<any, any> | Collection<string, any> ? never : T {
    // Simple types
    if (typeof original !== "object" || original === null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return original as T extends Set<any> | Map<any, any> | Collection<string, any> ? never : T;

    // Arrays
    if (original instanceof Array)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return original.map(deepClone) as unknown as T extends Set<any> | Map<any, any> | Collection<string, any>
            ? never
            : T;

    // Dates
    if (original instanceof Date)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Date(original) as unknown as T extends Set<any> | Map<any, any> | Collection<string, any>
            ? never
            : T;

    // Unsupported advanced objects
    if ((original as { constructor: unknown }).constructor !== Object)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return original as T extends Set<any> | Map<any, any> | Collection<string, any> ? never : T;

    // Other objects
    const clone: Record<string, unknown> = {};
    for (const k of Object.keys(original)) {
        clone[k] = deepClone(original[k as keyof typeof original]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return clone as unknown as T extends Set<any> | Map<any, any> | Collection<string, any> ? never : T;
}

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

class Color extends Number {}

/**
 * Learn the underlying data type of some variable. Supported identifiable types include:
 * undefined, null, number, string, boolean, function, Array, Set, Map, Promise, Error,
 * HTMLElement (client side only), Object (catchall for other object types)
 * @param variable A provided variable
 * @return The named type of the token
 */
export function getType(variable: unknown): string {
    // Primitive types, handled with simple typeof check
    const typeOf = typeof variable;
    if (typeOf !== "object") return typeOf;

    // Special cases of object
    if (variable === null) return "null";
    if (!(variable as object).constructor) return "Object"; // Object with the null prototype.
    if ((variable as object).constructor.name === "Object") return "Object"; // simple objects

    // Match prototype instances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prototypes: [new (...args: any[]) => object, string][] = [
        [Array, "Array"],
        [Set, "Set"],
        [Map, "Map"],
        [Promise, "Promise"],
        [Error, "Error"],
        [Color, "number"],
    ];
    if ("HTMLElement" in globalThis) prototypes.push([globalThis.HTMLElement, "HTMLElement"]);
    for (const [cls, type] of prototypes) {
        if (variable instanceof cls) return type;
    }

    // Unknown Object type
    return "Object";
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

/** Update a source object by replacing its keys and values with those from a target object. */
function mergeObject<T extends object, U extends object = T>(
    original: T,
    other?: U,
    options?: MergeObjectOptions,
    _d?: number,
): T & U;
function mergeObject(
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
    // Force replace a specific key
    if (performDeletions && k.startsWith("==")) {
        (original as Record<string, unknown>)[k.slice(2)] = applySpecialKeys(v);
        return;
    }

    // Delete a specific key
    if (performDeletions && k.startsWith("-=")) {
        if (v !== null)
            throw new Error(
                "Removing a key using the -= deletion syntax requires the value of that" +
                    " deletion key to be null, for example {-=key: null}",
            );
        delete (original as Record<string, unknown>)[k.slice(2)];
        return;
    }

    const canInsert = (_d <= 1 && insertKeys) || (_d > 1 && insertValues);
    if (!canInsert) return;
    // Recursively create simple objects
    if (R.isPlainObject(v)) {
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
    if (R.isPlainObject(v) && R.isPlainObject(x) && recursive) {
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
        if (x !== undefined && tv !== tx && enforceTypes) {
            throw new Error(`Mismatched data types encountered during object merge.`);
        }
        (original as Record<string, unknown>)[k] = applySpecialKeys(v);
    }
}

/**
 * Recurse through an object, applying all special keys.
 * Deletion keys ("-=") are removed.
 * Forced replacement keys ("==") are assigned.
 */

function applySpecialKeys<T>(obj: T): T;
function applySpecialKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(applySpecialKeys);
    if (!R.isPlainObject(obj)) return obj;
    const clone: Record<string, unknown> = {};
    for (const key in obj) {
        const v = obj[key];
        if (isDeletionKey(key)) {
            if (key[0] === "-") {
                if (v !== null)
                    throw new Error(
                        "Removing a key using the -= deletion syntax requires the value of that" +
                            " deletion key to be null, for example {-=key: null}",
                    );
                delete clone[key.substring(2)];
                continue;
            }
            if (key[0] === "=") {
                clone[key.substring(2)] = applySpecialKeys(v);
                continue;
            }
        }
        clone[key] = applySpecialKeys(v);
    }
    return clone;
}

/**
 * Test if two objects contain the same enumerable keys and values.
 * @param a The first object.
 * @param b The second object.
 */
function objectsEqual(a: object | null, b: object | null): boolean {
    if (a === null || b === null) return a === b;
    if (getType(a) !== "Object" || getType(b) !== "Object") return a === b;
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    return Object.entries(a).every(([k, v0]) => {
        const v1 = (b as Record<string, unknown>)[k];
        const t0 = getType(v0);
        const t1 = getType(v1);
        if (t0 !== t1) return false;
        if (v0?.equals instanceof Function) return v0.equals(v1);
        if (t0 === "Object") return objectsEqual(v0, v1 as object | null);
        return v0 === v1;
    });
}

/**
 * Is a string key of an object used for certain deletion or forced replacement operations.
 */
function isDeletionKey(key: string): boolean {
    if (!(typeof key === "string")) return false;
    return key[1] === "=" && (key[0] === "=" || key[0] === "-");
}

function _arrayEquals(arr: unknown[], other: unknown): boolean {
    if (!(other instanceof Array) || other.length !== arr.length) return false;
    return arr.every((v0, i) => {
        const v1 = other[i];
        const t0 = getType(v0);
        const t1 = getType(v1);
        if (t0 !== t1) return false;
        if ((v0 as Maybe<{ equals?: unknown }>)?.equals instanceof Function)
            return (v0 as { equals: (arg: unknown) => boolean }).equals(v1);
        if (t0 === "Object") return objectsEqual(v0 as object, v1);
        return v0 === v1;
    });
}

/**
 * Deeply difference an object against some other, returning the update keys and values.
 * @param original An object comparing data against which to compare
 * @param other An object containing potentially different data
 * @param options Additional options which configure the diff operation
 * @param options.inner Only recognize differences in other for keys which also exist in original
 * @param deletionKeys Apply special logic to deletion keys. They will only be kept if the
 *                                               original object has a corresponding key that could be deleted.
 * @return An object of the data in other which differs from that in original
 */
function diffObject(original: object, other: object, { inner = false, deletionKeys = false } = {}) {
    function _difference(v0: unknown, v1: unknown): [boolean, unknown] {
        // Eliminate differences in types
        const t0 = getType(v0);
        const t1 = getType(v1);
        if (t0 !== t1) return [true, v1];

        // null and undefined
        if (["null", "undefined"].includes(t0)) return [v0 !== v1, v1];

        // If the prototype explicitly exposes an equality-testing method, use it
        if ((v0 as { equals?: unknown }).equals instanceof Function) {
            return [!(v0 as { equals: (arg: unknown) => boolean }).equals(v1), v1];
        }
        if (Array.isArray(v0)) {
            return [!_arrayEquals(v0, v1), v1];
        }

        // Recursively diff objects
        if (t0 === "Object") {
            if (isEmpty(v1)) return [false, {}];
            if (isEmpty(v0)) return [true, v1];
            const d = diffObject(v0 as object, v1 as object, { inner, deletionKeys });
            return [!isEmpty(d), d];
        }

        // Differences in primitives
        return [(v0 as object).valueOf() !== (v1 as object).valueOf(), v1];
    }

    // Recursively call the _difference function
    return Object.keys(other).reduce((obj, key) => {
        const isDeletionKey = key.startsWith("-=");
        if (isDeletionKey && deletionKeys) {
            const otherKey = key.substring(2);
            if (otherKey in original) (obj as Record<string, unknown>)[key] = (other as Record<string, unknown>)[key];
            return obj;
        }
        if (inner && !(key in original)) return obj;
        const [isDifferent, difference] = _difference(
            (original as Record<string, unknown>)[key],
            (other as Record<string, unknown>)[key],
        );
        if (isDifferent) (obj as Record<string, unknown>)[key] = difference;
        return obj;
    }, {});
}

/**
 * Test whether a value is empty-like; either undefined or a content-less object.
 * @param value The value to test
 * @returns     Is the value empty-like?
 */
export function isEmpty(value: unknown): boolean {
    const t = getType(value);
    switch (t) {
        case "undefined":
            return true;
        case "null":
            return true;
        case "Array":
            return !(value as unknown[]).length;
        case "Object":
            return !Object.keys(value as object).length;
        case "Set":
        case "Map":
            return !(value as Map<unknown, unknown>).size;
        default:
            return false;
    }
}

/**
 * Generate a random string ID of a given requested length.
 * @param length The length of the random ID to generate
 * @return Return a string containing random letters and numbers
 */
function randomID(length = 16): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const r = Array.from({ length }, () => (Math.random() * chars.length) >> 0);
    return r.map((i) => chars[i]).join("");
}

abstract class AbstractFormInputElement {}

const f = (global.foundry = {
    applications: {
        elements: { AbstractFormInputElement },
    },
    utils: {
        deepClone,
        diffObject,
        expandObject,
        isEmpty,
        getType,
        mergeObject,
        randomID,
        setProperty,
    },
} as typeof foundry);

global.fu = f.utils;
