/**
 * A helper function which searches through an object to assign a value using a string key
 * This string key supports the notation a.b.c which would target object[a][b][c]
 *
 * @param object {Object}   The object to update
 * @param key {String}      The string key
 * @param value             The value to be assigned
 *
 * @return {Boolean}        A flag for whether or not the object was updated
 */
function setProperty(object: object, key: string, value): boolean {
    let target = object;
    let changed = false;

    // Convert the key to an object reference if it contains dot notation
    if (key.indexOf('.') !== -1) {
        const parts = key.split('.');
        key = parts.pop();
        target = parts.reduce((o, i) => {
            if (!Object.prototype.hasOwnProperty.call(o, i)) o[i] = {};
            return o[i];
        }, object);
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
 * @param {*} token     Some passed token
 * @return {string}     The named type of the token
 */
function getType(token) {
    const tof = typeof token;
    if (tof === 'object') {
        if (token === null) return 'null';
        const cn = token.constructor.name;
        if (['String', 'Number', 'Boolean', 'Array', 'Set'].includes(cn)) return cn;
        else if (/^HTML/.test(cn)) return 'HTMLElement';
        else return 'Object';
    }
    return tof;
}

/**
 * Expand a flattened object to be a standard multi-dimensional nested Object by converting all dot-notation keys to
 * inner objects.
 *
 * @param {Object} obj  The object to expand
 * @param {Number} _d   Recursion depth, to prevent overflow
 * @return {Object}     An expanded object
 */
function expandObject(obj, _d = 0) {
    const expanded = {};
    if (_d > 10) throw new Error('Maximum depth exceeded');
    for (const [k, v0] of Object.entries(obj)) {
        let v = v0;
        if (v instanceof Object && !Array.isArray(v)) v = expandObject(v, _d + 1);
        setProperty(expanded, k, v);
    }
    return expanded;
}

/**
 * A simple function to test whether or not an Object is empty
 * @param {Object} obj    The object to test
 * @return {Boolean}      Is the object empty?
 */
function isObjectEmpty(obj) {
    if (getType(obj) !== 'Object') throw new Error('The provided data is not an object!');
    return Object.keys(obj).length === 0;
}

/**
 * A cheap data duplication trick, surprisingly relatively performant
 * @param {Object} original   Some sort of data
 */
function duplicate(original) {
    return JSON.parse(JSON.stringify(original));
}

/**
 * Update a source object by replacing its keys and values with those from a target object.
 *
 * @param {Object} original     The initial object which should be updated with values from the target
 * @param {Object} other        A new object whose values should replace those in the source
 *
 * @param {boolean} [insertKeys]      Control whether to insert new top-level objects into the resulting structure
 *                                    which do not previously exist in the original object.
 * @param {boolean} [insertValues]    Control whether to insert new nested values into child objects in the resulting
 *                                    structure which did not previously exist in the original object.
 * @param {boolean} [overwrite]       Control whether to replace existing values in the source, or only merge values
 *                                    which do not already exist in the original object.
 * @param {boolean} [recursive]       Control whether to merge inner-objects recursively (if true), or whether to
 *                                    simply replace inner objects with a provided new value.
 * @param {boolean} [inplace]         Control whether to apply updates to the original object in-place (if true),
 *                                    otherwise the original object is duplicated and the copy is merged.
 * @param {boolean} [enforceTypes]    Control whether strict type checking requires that the value of a key in the
 *                                    other object must match the data type in the original data to be merged.
 * @param {number} [_d]               A privately used parameter to track recursion depth.
 *
 * @returns {Object}            The original source object including updated, inserted, or overwritten records.
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
    original,
    other = {},
    {
        insertKeys = true,
        insertValues = true,
        overwrite = true,
        recursive = true,
        inplace = true,
        enforceTypes = false,
    } = {},
    _d = 0,
) {
    other = other || {};
    if (!(original instanceof Object) || !(other instanceof Object)) {
        throw new Error('One of original or other are not Objects!');
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
        const tv = getType(v);

        // Prepare to delete
        let toDelete = false;
        if (k.startsWith('-=')) {
            k = k.slice(2);
            toDelete = v === null;
        }

        // Get the existing object
        let x = original[k];
        let has = Object.hasOwnProperty.call(original, k);
        let tx = getType(x);

        // Ensure that inner objects exist
        if (!has && tv === 'Object') {
            x = {};
            original[k] = {};
            has = true;
            tx = 'Object';
        }

        // Case 1 - Key exists
        if (has) {
            // 1.1 - Recursively merge an inner object
            if (tv === 'Object' && tx === 'Object' && recursive) {
                mergeObject(
                    x,
                    v,
                    {
                        insertKeys,
                        insertValues,
                        overwrite,
                        inplace: true,
                        enforceTypes,
                    },
                    depth,
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

function arrayEquals(self: any[], other: any[]) {
    if (!(other instanceof Array) || other.length !== self.length) return false;
    return self.every((v, i) => other[i] === v);
}

/**
 * Deeply difference an object against some other, returning the update keys and values
 * @param {object} original     An object comparing data against which to compare.
 * @param {object} other        An object containing potentially different data.
 * @param {boolean} [inner]     Only recognize differences in other for keys which also exist in original.
 * @return {object}             An object of the data in other which differs from that in original.
 */
function diffObject(original, other, { inner = false } = {}) {
    function _difference(v0, v1) {
        let t0 = getType(v0);
        let t1 = getType(v1);
        if (t0 !== t1) return [true, v1];
        if (t0 === 'Array') return [!arrayEquals(v0, v1), v1];
        if (t0 === 'Object') {
            if (isObjectEmpty(v0) !== isObjectEmpty(v1)) return [true, v1];
            let d = diffObject(v0, v1, { inner });
            return [!isObjectEmpty(d), d];
        }
        return [v0 !== v1, v1];
    }

    // Recursively call the _difference function
    return Object.keys(other).reduce((obj, key) => {
        if (inner && original[key] === undefined) return obj;
        let [isDifferent, difference] = _difference(original[key], other[key]);
        if (isDifferent) obj[key] = difference;
        return obj;
    }, {});
}

export function populateFoundryUtilFunctions() {
    global.setProperty = setProperty;
    global.isObjectEmpty = isObjectEmpty;
    global.getType = getType;
    global.mergeObject = mergeObject;
    global.diffObject = diffObject;
    global.expandObject = expandObject;
    global.duplicate = duplicate;
}
