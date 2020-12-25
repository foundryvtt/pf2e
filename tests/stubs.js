function mergeObject(original, other = {}, {
    insertKeys = true,
    insertValues = true,
    overwrite = true,
    recursive = true,
    inplace = true,
    enforceTypes = false
} = {}, _d = 0) {
    other = other || {};
    if (!(original instanceof Object) || !(other instanceof Object)) {
        throw new Error('One of original or other are not Objects!');
    }
    let depth = _d + 1;

    // Maybe copy the original data at depth 0
    if (!inplace && (_d === 0)) original = duplicate(original);

    // Enforce object expansion at depth 0
    if ((_d === 0) && Object.keys(original)
        .some(k => /\./.test(k))) {
        original = expandObject(original);
    }

    if ((_d === 0) && Object.keys(other)
        .some(k => /\./.test(k))) {
        other = expandObject(other);
    }

    // Iterate over the other object
    for (let [k, v] of Object.entries(other)) {
        let tv = getType(v);

        // Prepare to delete
        let toDelete = false;
        if (k.startsWith('-=')) {
            k = k.slice(2);
            toDelete = (v === null);
        }

        // Get the existing object
        let x = original[k];
        let has = original.hasOwnProperty(k);
        let tx = getType(x);

        // Ensure that inner objects exist
        if (!has && (tv === 'Object')) {
            x = original[k] = {};
            has = true;
            tx = 'Object';
        }

        // Case 1 - Key exists
        if (has) {
            // 1.1 - Recursively merge an inner object
            if ((tv === 'Object') && (tx === 'Object') && recursive) {
                mergeObject(x, v, {
                    insertKeys: insertKeys,
                    insertValues: insertValues,
                    overwrite: overwrite,
                    inplace: true,
                    enforceTypes: enforceTypes
                }, depth);
            }

            // 1.2 - Remove an existing key
            else if (toDelete) {
                delete original[k];
            }

            // 1.3 - Overwrite existing value
            else if (overwrite) {
                if (tx && (tv !== tx) && enforceTypes) {
                    throw new Error(`Mismatched data types encountered during object merge.`);
                }

                original[k] = v;
            }

            // 1.4 - Insert new value
            else if ((x === undefined) && insertValues) {
                original[k] = v;
            }
        }

        // Case 2 - Key does not exist
        else if (!toDelete) {
            let canInsert = (depth === 1 && insertKeys) || (depth > 1 && insertValues);
            if (canInsert) original[k] = v;
        }
    }
    // Return the object for use
    return original;
}

module.exports = {mergeObject}