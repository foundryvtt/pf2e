import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import { ErrorPF2e, setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";
import {
    CustomDamageData,
    HOMEBREW_ELEMENT_KEYS,
    HomebrewTag,
    HomebrewTraitKey,
    ModuleHomebrewData,
    TRAIT_PROPAGATIONS,
} from "./data.ts";
import { HomebrewElements } from "./menu.ts";

/** User-defined type guard for checking that an object is a well-formed flag category of module-provided homebrew elements */
function isHomebrewFlagCategory(value: unknown): value is Record<string, string | LabelAndDescription> {
    return (
        R.isPlainObject(value) &&
        Object.entries(value).every(
            ([_hbKey, hbLabel]) =>
                typeof hbLabel === "string" || (R.isPlainObject(hbLabel) && isLabelAndDescription(hbLabel)),
        )
    );
}

function isHomebrewCustomDamage(value: object): value is Record<string, CustomDamageData> {
    return Object.values(value).every(
        (value) =>
            R.isPlainObject(value) &&
            typeof value.label === "string" &&
            (!value.category || tupleHasValue(["physical", "energy"], value.category)),
    );
}

function isLabelAndDescription(obj: { label?: unknown; description?: unknown }): obj is LabelAndDescription {
    return typeof obj.label === "string" && typeof obj.description === "string";
}

interface LabelAndDescription {
    label: string;
    description: string;
}

function isSkillData(obj: unknown): obj is { additional: ModuleHomebrewData["skills"] } {
    return (
        R.isPlainObject(obj) &&
        R.isPlainObject(obj.additional) &&
        Object.values(obj.additional).every(
            (d) =>
                R.isPlainObject(d) &&
                typeof d.label === "string" &&
                setHasElement(ATTRIBUTE_ABBREVIATIONS, d.attribute),
        )
    );
}

function prepareReservedTerms(): ReservedTermsRecord {
    const universalReservedTerms = new Set([
        ...Object.keys(CONFIG.PF2E.classTraits),
        ...Object.keys(CONFIG.PF2E.damageCategories),
        ...Object.keys(CONFIG.PF2E.damageTypes),
        ...Object.keys(CONFIG.PF2E.immunityTypes),
        ...Object.keys(CONFIG.PF2E.resistanceTypes),
        ...Object.keys(CONFIG.PF2E.saves),
        ...Object.keys(CONFIG.PF2E.skills),
        ...Object.keys(CONFIG.PF2E.weaknessTypes),
        ...Object.keys(CONFIG.PF2E.environmentTypes),
        "damage",
        "healing",
        "perception",
        "spellcasting",
        "none",
        "null",
        "undefined",
    ]);

    return {
        armorGroups: new Set([...Object.keys(CONFIG.PF2E.armorGroups), ...universalReservedTerms]),
        baseArmors: new Set([...Object.keys(CONFIG.PF2E.baseArmorTypes), ...universalReservedTerms]),
        weaponCategories: new Set([...Object.keys(CONFIG.PF2E.weaponCategories), ...universalReservedTerms]),
        weaponGroups: new Set([...Object.keys(CONFIG.PF2E.weaponGroups), ...universalReservedTerms]),
        baseWeapons: new Set([...Object.keys(CONFIG.PF2E.baseWeaponTypes), ...universalReservedTerms]),
        creatureTraits: new Set([...Object.keys(CONFIG.PF2E.creatureTraits), ...universalReservedTerms]),
        damageTypes: universalReservedTerms,
        equipmentTraits: new Set([
            ...Object.keys(CONFIG.PF2E.equipmentTraits),
            ...TRAIT_PROPAGATIONS.equipmentTraits.flatMap((t) => Object.keys(CONFIG.PF2E[t])),
            ...universalReservedTerms,
        ]),
        featTraits: new Set([...Object.keys(CONFIG.PF2E.actionTraits), ...universalReservedTerms]),
        languages: new Set([...Object.keys(CONFIG.PF2E.languages), ...universalReservedTerms]),
        shieldTraits: new Set([...Object.keys(CONFIG.PF2E.shieldTraits), ...universalReservedTerms]),
        spellTraits: new Set([...Object.keys(CONFIG.PF2E.spellTraits), ...universalReservedTerms]),
        skills: universalReservedTerms,
        weaponTraits: new Set([...Object.keys(CONFIG.PF2E.weaponTraits), ...universalReservedTerms]),
    };
}

type ReservedTermsRecord = Record<HomebrewTraitKey | "damageTypes" | "skills", Set<string>>;

/** Reads homebrew settings from all modules */
function readModuleHomebrewSettings(): ModuleHomebrewData {
    const results: ModuleHomebrewData = {
        skills: {},
        damageTypes: {},
        traits: R.mapToObj(HOMEBREW_ELEMENT_KEYS, (k) => [k, []]),
        traitDescriptions: {},
    };

    const activeModules = [...game.modules.entries()].filter(([_key, foundryModule]) => foundryModule.active);

    for (const [key, foundryModule] of activeModules) {
        const homebrew = foundryModule.flags[key]?.["pf2e-homebrew"];
        if (!R.isPlainObject(homebrew)) continue;

        for (const [recordKey, elements] of Object.entries(homebrew)) {
            if (recordKey === "skills") {
                if (!isSkillData(elements)) {
                    console.warn(ErrorPF2e(`Homebrew record skills is malformed in module ${key}`).message);
                    continue;
                }

                for (const [slug, data] of Object.entries(elements.additional)) {
                    if (HomebrewElements.reservedTerms.skills.has(slug)) {
                        console.warn(
                            ErrorPF2e(`Homebrew skill "${slug}" from module ${foundryModule.title} is a reserved term.`)
                                .message,
                        );
                    } else {
                        results.skills[slug] = data;
                    }
                }
            } else if (recordKey === "damageTypes") {
                if (!R.isPlainObject(elements) || !isHomebrewCustomDamage(elements)) {
                    console.warn(ErrorPF2e(`Homebrew record damageTypes is malformed in module ${key}`).message);
                    continue;
                }

                for (const [slug, value] of Object.entries(elements)) {
                    if (HomebrewElements.reservedTerms.damageTypes.has(slug)) {
                        console.warn(
                            ErrorPF2e(
                                `Homebrew damage type "${slug}" from module ${foundryModule.title} is a reserved term.`,
                            ).message,
                        );
                    } else {
                        results.damageTypes[slug] = value;
                    }
                }
            } else if (tupleHasValue(HOMEBREW_ELEMENT_KEYS, recordKey)) {
                if (!R.isPlainObject(elements) || !isHomebrewFlagCategory(elements)) {
                    console.warn(ErrorPF2e(`Homebrew record ${recordKey} is malformed in module ${key}`).message);
                    continue;
                }

                const elementEntries = Object.entries(elements);

                // A registered tag can be a string label or an object containing a label and description
                results.traits[recordKey].push(
                    ...elementEntries.map(
                        ([id, value]) =>
                            ({
                                id,
                                value: typeof value === "string" ? value : value.label,
                            }) as HomebrewTag,
                    ),
                );

                // Register descriptions if present
                for (const [key, value] of elementEntries) {
                    if (typeof value === "object") {
                        results.traitDescriptions[key] = value.description;
                    }
                }
            } else {
                console.warn(ErrorPF2e(`Invalid homebrew record "${recordKey}" in module ${key}`).message);
                continue;
            }
        }
    }

    return results;
}

function prepareCleanup(listKey: HomebrewTraitKey, deletions: string[]): MigrationBase {
    const Migration = class extends MigrationBase {
        static override version = MigrationRunnerBase.LATEST_SCHEMA_VERSION;

        override async updateActor(source: ActorSourcePF2e) {
            if (!(source.type === "character" || source.type === "npc")) {
                return;
            }

            switch (listKey) {
                case "creatureTraits": {
                    const traits = source.system.traits;
                    if (!traits) break;
                    traits.value = traits.value.filter(
                        (t) => HomebrewElements.reservedTerms.creatureTraits.has(t) || !deletions.includes(t),
                    );
                    break;
                }
                case "languages": {
                    const languages = source.system.details.languages;
                    languages.value = languages.value.filter(
                        (l) => HomebrewElements.reservedTerms.languages.has(l) || !deletions.includes(l),
                    );
                    break;
                }
                case "weaponCategories": {
                    if (source.type === "character") {
                        const attacks: Record<string, unknown> = source.system.proficiencies?.attacks ?? {};
                        for (const category of deletions) {
                            if (attacks[category] && !HomebrewElements.reservedTerms.weaponCategories.has(category)) {
                                attacks[`-=${category}`] = null;
                            }
                        }
                    }
                    break;
                }
                case "weaponGroups": {
                    if (source.type === "character") {
                        const attacks: Record<string, unknown> = source.system.proficiencies?.attacks ?? {};
                        for (const group of deletions) {
                            const key = `weapon-group-${group}`;
                            if (attacks[key] && !HomebrewElements.reservedTerms.weaponGroups.has(group)) {
                                attacks[`-=${key}`] = null;
                            }
                        }
                    }
                    break;
                }
                case "baseWeapons": {
                    if (source.type === "character") {
                        const attacks: Record<string, unknown> = source.system.proficiencies?.attacks ?? {};
                        for (const base of deletions) {
                            const key = `weapon-base-${base}`;
                            if (attacks[key] && !HomebrewElements.reservedTerms.baseWeapons.has(base)) {
                                attacks[`-=${key}`] = null;
                            }
                        }
                    }
                    break;
                }
            }
        }

        override async updateItem(source: ItemSourcePF2e) {
            switch (listKey) {
                // Creature traits can be on many items
                case "creatureTraits": {
                    if (source.system.traits?.value) {
                        const traits: { value: string[] } = source.system.traits;
                        traits.value = traits.value.filter(
                            (t) => HomebrewElements.reservedTerms.creatureTraits.has(t) || !deletions.includes(t),
                        );
                    }
                    break;
                }
                case "featTraits": {
                    if (itemIsOfType(source, "action", "feat")) {
                        const traits = source.system.traits;
                        traits.value = traits.value.filter(
                            (t) => HomebrewElements.reservedTerms.featTraits.has(t) || !deletions.includes(t),
                        );
                    }
                    break;
                }
                case "spellTraits": {
                    if (source.type === "spell") {
                        const traits = source.system.traits;
                        traits.value = traits.value.filter(
                            (t) => HomebrewElements.reservedTerms.spellTraits.has(t) || !deletions.includes(t),
                        );
                    }
                    break;
                }
                case "languages": {
                    if (source.type === "ancestry") {
                        const { languages } = source.system;
                        languages.value = languages.value.filter(
                            (l) => HomebrewElements.reservedTerms.languages.has(l) || !deletions.includes(l),
                        );
                    }
                    break;
                }
                case "weaponCategories": {
                    if (source.type === "weapon") {
                        const systemData: { category: string } = source.system;
                        systemData.category = deletions.includes(systemData.category ?? "")
                            ? "simple"
                            : systemData.category;
                    }
                    break;
                }
                case "weaponGroups": {
                    if (source.type === "weapon") {
                        const systemData: { group: string | null } = source.system;
                        systemData.group = deletions.includes(systemData.group ?? "") ? null : systemData.group;
                    }
                    break;
                }
                case "baseWeapons": {
                    if (source.type === "weapon") {
                        const base = source.system.baseItem;
                        source.system.baseItem = deletions.includes(base ?? "") ? null : base;
                    }
                    break;
                }
                case "weaponTraits": {
                    const traits: { value: string[] } = itemIsOfType(source, "melee", "weapon")
                        ? source.system.traits
                        : { value: [] };
                    traits.value = traits.value.filter(
                        (t) => HomebrewElements.reservedTerms.weaponTraits.has(t) || !deletions.includes(t),
                    );
                    break;
                }
            }
        }
    };

    return new Migration();
}

export {
    isHomebrewCustomDamage,
    isHomebrewFlagCategory,
    prepareCleanup,
    prepareReservedTerms,
    readModuleHomebrewSettings,
    type ReservedTermsRecord,
};
