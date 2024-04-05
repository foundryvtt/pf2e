import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import { isObject } from "@util";
import * as R from "remeda";
import { CustomDamageData, HomebrewTraitKey } from "./data.ts";
import { HomebrewElements } from "./menu.ts";

/** User-defined type guard for checking that an object is a well-formed flag category of module-provided homebrew elements */
function isHomebrewFlagCategory(value: unknown): value is Record<string, string | LabelAndDescription> {
    return (
        R.isObject(value) &&
        Object.entries(value).every(
            ([_hbKey, hbLabel]) => typeof hbLabel === "string" || (isObject(hbLabel) && isLabelAndDescription(hbLabel)),
        )
    );
}

function isHomebrewCustomDamage(value: object): value is Record<string, CustomDamageData> {
    return Object.values(value).every(
        (value) =>
            isObject<CustomDamageData>(value) &&
            typeof value.label === "string" &&
            (!value.category || ["physical", "energy"].includes(value.category)),
    );
}

function isLabelAndDescription(obj: { label?: unknown; description?: unknown }): obj is LabelAndDescription {
    return typeof obj.label === "string" && typeof obj.description === "string";
}

interface LabelAndDescription {
    label: string;
    description: string;
}

function prepareReservedTerms(): ReservedTermsRecord {
    const universalReservedTerms = new Set([
        ...Object.keys(CONFIG.PF2E.classTraits),
        ...Object.keys(CONFIG.PF2E.damageCategories),
        ...Object.keys(CONFIG.PF2E.damageTypes),
        ...Object.keys(CONFIG.PF2E.immunityTypes),
        ...Object.keys(CONFIG.PF2E.resistanceTypes),
        ...Object.keys(CONFIG.PF2E.saves),
        ...Object.keys(CONFIG.PF2E.skillList),
        ...Object.keys(CONFIG.PF2E.skills),
        ...Object.keys(CONFIG.PF2E.weaknessTypes),
        "damage",
        "healing",
        "perception",
        "spellcasting",
        "none",
        "null",
        "undefined",
    ]);

    return {
        baseWeapons: new Set([...Object.keys(CONFIG.PF2E.baseWeaponTypes), ...universalReservedTerms]),
        creatureTraits: new Set([...Object.keys(CONFIG.PF2E.creatureTraits), ...universalReservedTerms]),
        damageTypes: universalReservedTerms,
        equipmentTraits: new Set([...Object.keys(CONFIG.PF2E.equipmentTraits), ...universalReservedTerms]),
        featTraits: new Set([...Object.keys(CONFIG.PF2E.actionTraits), ...universalReservedTerms]),
        languages: new Set([...Object.keys(CONFIG.PF2E.languages), ...universalReservedTerms]),
        spellTraits: new Set([...Object.keys(CONFIG.PF2E.spellTraits), ...universalReservedTerms]),
        weaponCategories: new Set([...Object.keys(CONFIG.PF2E.weaponCategories), ...universalReservedTerms]),
        weaponGroups: new Set([...Object.keys(CONFIG.PF2E.weaponGroups), ...universalReservedTerms]),
        weaponTraits: new Set([...Object.keys(CONFIG.PF2E.weaponTraits), ...universalReservedTerms]),
    };
}

type ReservedTermsRecord = Record<HomebrewTraitKey | "damageTypes", Set<string>>;

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
    type ReservedTermsRecord,
};
