import * as path from "path";
import * as fs from "fs";
import { FakeActor } from "./fakes/fake-actor";
import { FakeItem } from "./fakes/fake-item";
import { FakeToken } from "./fakes/fake-token";

export const fetchSpell = (name: string) => {
    const spellsDb = "./packs/data/spells.db/";
    const spellFiles = fs.readdirSync(spellsDb);

    for (const file of spellFiles) {
        const content = fs.readFileSync(path.resolve(spellsDb, file), "utf-8");
        const json = JSON.parse(content);
        if (json.name === name) return json;
    }
    return null;
};

// @ts-ignore
global.game = Object.freeze({
    settings: Object.freeze({
        get: (_module: string, settingKey: string) => {
            switch (settingKey) {
                /* Proficiency Modifiers */
                case "proficiencyUntrainedModifier":
                    return 0;
                case "proficiencyTrainedModifier":
                    return 2;
                case "proficiencyExpertModifier":
                    return 4;
                case "proficiencyMasterModifier":
                    return 6;
                case "proficiencyLegendaryModifier":
                    return 8;

                /* Variant rules */
                case "proficiencyVariant":
                    return "ProficiencyWithLevel";
                case "automaticBonusVariant":
                    return "automaticBonusVariant";
                default:
                    throw new Error("Undefined setting.");
            }
        },
    }),
    packs: Object.freeze({
        find: (_compendiumID: string, _quantity: number) => {
            return Object.freeze({
                getEntity: (id: string) => {
                    switch (id) {
                        case "JuNPeK5Qm1w6wpb4":
                            return { data: require("../packs/data/equipment.db/platinum-pieces.json") };
                        case "B6B7tBWJSqOBz5zz":
                            return { data: require("../packs/data/equipment.db/gold-pieces.json") };
                        case "5Ew82vBF9YfaiY9f":
                            return { data: require("../packs/data/equipment.db/silver-pieces.json") };
                        case "lzJ8AVhRcbFul5fh":
                            return { data: require("../packs/data/equipment.db/copper-pieces.json") };
                        default:
                            return { data: {} };
                    }
                },
            });
        },
    }),
    user: {},
    i18n: {
        localize: (path: string) => path,
    },
});

function getType(token: Token | null) {
    const tof = typeof token;
    if (tof === "object") {
        if (token === null) return "null";
        const cn = token.constructor.name;
        if (["String", "Number", "Boolean", "Array", "Set"].includes(cn)) return cn;
        else if (/^HTML/.test(cn)) return "HTMLElement";
        else return "Object";
    }
    return tof;
}

function setProperty(object: Record<string, any>, key: string, value: unknown) {
    let target = object;
    let changed = false;
    // Convert the key to an object reference if it contains dot notation
    if (key.indexOf(".") !== -1) {
        const parts = key.split(".");
        key = parts.pop() ?? "";
        target = parts.reduce((o, i) => {
            if (!(i in o)) o[i] = {};
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

function duplicate(original: unknown) {
    return JSON.parse(JSON.stringify(original));
}

/**
 * Quickly clone a simple piece of data, returning a copy which can be mutated safely.
 * This method DOES support recursive data structures containing inner objects or arrays.
 * This method DOES NOT support advanced object types like Set, Map, or other specialized classes.
 * @param original Some sort of data
 * @return The clone of that data
 */
function deepClone<T>(original: T): T extends Set<any> | Map<any, any> | Collection<any> ? never : T {
    // Simple types
    if (typeof original !== "object" || original === null)
        return original as T extends Set<any> | Map<any, any> | Collection<any> ? never : T;

    // Arrays
    if (original instanceof Array)
        return original.map(deepClone) as unknown as T extends Set<any> | Map<any, any> | Collection<any> ? never : T;

    // Dates
    if (original instanceof Date)
        return new Date(original) as unknown as T extends Set<any> | Map<any, any> | Collection<any> ? never : T;

    // Unsupported advanced objects
    if ((original as { constructor: unknown }).constructor !== Object)
        return original as T extends Set<any> | Map<any, any> | Collection<any> ? never : T;

    // Other objects
    const clone: Record<string, unknown> = {};
    for (const k of Object.keys(original)) {
        clone[k] = deepClone(original[k as keyof typeof original]);
    }
    return clone as unknown as T extends Set<any> | Map<any, any> | Collection<any> ? never : T;
}

function expandObject(obj: Record<string, any>, _d = 0) {
    const expanded = {};
    if (_d > 10) throw new Error("Maximum depth exceeded");
    for (const entry of Object.entries(obj)) {
        const k = entry[0];
        let v = entry[1];
        if (v instanceof Object && !Array.isArray(v)) v = expandObject(v, _d + 1);
        setProperty(expanded, k, v);
    }
    return expanded;
}

function mergeObject(
    original: any,
    other: any = {},
    {
        insertKeys = true,
        insertValues = true,
        overwrite = true,
        recursive = true,
        inplace = true,
        enforceTypes = false,
    } = {},
    _d = 0
): any {
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
    for (let k of Object.keys(other)) {
        const v = other[k];
        const tv = getType(v as any);

        // Prepare to delete
        let toDelete = false;
        if (k.startsWith("-=")) {
            k = k.slice(2);
            toDelete = v === null;
        }

        // Get the existing object
        let x = original[k];
        let has = k in original;
        let tx = getType(x);

        // Ensure that inner objects exist
        if (!has && tv === "Object") {
            x = original[k] = {};
            has = true;
            tx = "Object";
        }

        // Case 1 - Key exists
        if (has) {
            // 1.1 - Recursively merge an inner object
            if (tv === "Object" && tx === "Object" && recursive) {
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

globalThis.mergeObject = mergeObject;
globalThis.duplicate = duplicate;
globalThis.deepClone = deepClone;
(global as any).Actor = FakeActor;
(global as any).Item = FakeItem;
(global as any).Token = FakeToken;
(global as any).FormApplication = class {};
(global as any).Roll = class {};
(global as any).Application = class {};
(global as any).Hooks = class {
    static on(..._args: any) {}
};

Math.clamped = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
