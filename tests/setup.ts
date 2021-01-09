const path = require('path');
const fs = require('fs');

export const fetchSpell = async (name) => {
    const spellsDb = './packs/data/spells.db/';
    const spellFiles = fs.readdirSync(spellsDb);

    for (const file of spellFiles) {
        const content = fs.readFileSync(path.resolve(spellsDb, file));
        const json = JSON.parse(content);
        if (json.name === name) return json;
    }
    return null;
};

//@ts-ignore
global.game = Object.freeze({
    settings: Object.freeze({
        get: (module, settingKey) => {
            switch (settingKey) {
                /* Proficiency Modifiers */
                case 'proficiencyUntrainedModifier':
                    return 0;
                case 'proficiencyTrainedModifier':
                    return 2;
                case 'proficiencyExpertModifier':
                    return 4;
                case 'proficiencyMasterModifier':
                    return 6;
                case 'proficiencyLegendaryModifier':
                    return 8;

                /* Variant rules */
                case 'proficiencyVariant':
                    return 'ProficiencyWithLevel';
                default:
                    throw new Error('Undefined setting.');
            }
        },
    }),
    packs: Object.freeze({
        find: (compendiumID, quantity) => {
            return Object.freeze({
                getEntity: (id) => {
                    switch (id) {
                        case 'JuNPeK5Qm1w6wpb4':
                            return { data: { data: { quantity: { value: 1 }, type: 'pp' } } };
                        case 'B6B7tBWJSqOBz5zz':
                            return { data: { data: { quantity: { value: 1 }, type: 'gp' } } };
                        case 'lzJ8AVhRcbFul5fh':
                            return { data: { data: { quantity: { value: 1 }, type: 'sp' } } };
                        case '5Ew82vBF9YfaiY9f':
                            return { data: { data: { quantity: { value: 1 }, type: 'cp' } } };
                    }
                },
            });
        },
    }),
});

function getType(token) {
    const tof = typeof token;
    if (tof === 'object') {
        if (token === null) return 'null';
        let cn = token.constructor.name;
        if (['String', 'Number', 'Boolean', 'Array', 'Set'].includes(cn)) return cn;
        else if (/^HTML/.test(cn)) return 'HTMLElement';
        else return 'Object';
    }
    return tof;
}

function setProperty(object, key, value) {
    let target = object;
    let changed = false;
    // Convert the key to an object reference if it contains dot notation
    if (key.indexOf('.') !== -1) {
        let parts = key.split('.');
        key = parts.pop();
        target = parts.reduce((o, i) => {
            if (!o.hasOwnProperty(i)) o[i] = {};
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

function duplicate(original) {
    return JSON.parse(JSON.stringify(original));
}

function expandObject(obj, _d = 0) {
    const expanded = {};
    if (_d > 10) throw new Error('Maximum depth exceeded');
    for (let [k, v] of Object.entries(obj)) {
        if (v instanceof Object && !Array.isArray(v)) v = expandObject(v, _d + 1);
        setProperty(expanded, k, v);
    }
    return expanded;
}

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
    let depth = _d + 1;

    // Maybe copy the original data at depth 0
    if (!inplace && _d === 0) original = duplicate(original);

    // Enforce object expansion at depth 0
    if (_d === 0 && Object.keys(original).some((k) => /\./.test(k))) {
        original = expandObject(original);
    }

    if (_d === 0 && Object.keys(other).some((k) => /\./.test(k))) {
        other = expandObject(other);
    }

    // Iterate over the other object
    for (let [k, v] of Object.entries(other)) {
        let tv = getType(v);

        // Prepare to delete
        let toDelete = false;
        if (k.startsWith('-=')) {
            k = k.slice(2);
            toDelete = v === null;
        }

        // Get the existing object
        let x = original[k];
        let has = original.hasOwnProperty(k);
        let tx = getType(x);

        // Ensure that inner objects exist
        if (!has && tv === 'Object') {
            x = original[k] = {};
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
                        insertKeys: insertKeys,
                        insertValues: insertValues,
                        overwrite: overwrite,
                        inplace: true,
                        enforceTypes: enforceTypes,
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
            let canInsert = (depth === 1 && insertKeys) || (depth > 1 && insertValues);
            if (canInsert) original[k] = v;
        }
    }
    // Return the object for use
    return original;
}

// @ts-ignore
global.mergeObject = mergeObject;

// @ts-ignore
Math.clamped = (value, min, max) => Math.min(Math.max(value, min), max);
