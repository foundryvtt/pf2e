import { WeaponGroupProficiencyKey, BaseWeaponProficiencyKey } from "@actor/character/data";
import { ActorSourcePF2e } from "@actor/data";
import { WeaponSource } from "@item";
import { MeleeSource, ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "@module/migration/base";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { isObject, objectHasKey } from "@util";
import { CustomDamageData, HomebrewTraitKey } from "./data";

/** User-defined type guard for checking that an object is a well-formed flag category of module-provided homebrew elements */
export function isHomebrewFlagCategory(
    value: object & { [K in string]?: unknown }
): value is Record<string, string | LabelAndDescription> {
    return Object.entries(value).every(
        ([_hbKey, hbLabel]) => typeof hbLabel === "string" || (isObject(hbLabel) && isLabelAndDescription(hbLabel))
    );
}

export function isHomebrewCustomDamage(value: object): value is Record<string, CustomDamageData> {
    return Object.values(value).every(
        (value) =>
            isObject<CustomDamageData>(value) &&
            typeof value.label === "string" &&
            ["physical", "energy"].includes(value.category ?? "")
    );
}

function isLabelAndDescription(obj: { label?: unknown; description?: unknown }): obj is LabelAndDescription {
    return typeof obj.label === "string" && typeof obj.description === "string";
}

interface LabelAndDescription {
    label: string;
    description: string;
}

export function prepareCleanup(listKey: HomebrewTraitKey, deletions: string[]): MigrationBase {
    const Migration = class extends MigrationBase {
        static override version = MigrationRunnerBase.LATEST_SCHEMA_VERSION;

        override async updateActor(source: ActorSourcePF2e) {
            if (!(source.type === "character" || source.type === "npc")) {
                return;
            }

            switch (listKey) {
                case "creatureTraits": {
                    const traits = source.system.traits;
                    traits.value = traits.value.filter((t) => !deletions.includes(t));
                    break;
                }
                case "languages": {
                    const languages = source.system.traits.languages;
                    languages.value = languages.value.filter((l) => !deletions.includes(l));
                    break;
                }
                case "weaponCategories": {
                    if (source.type === "character") {
                        for (const key of deletions) {
                            if (objectHasKey(source.system.martial, key)) {
                                delete source.system.martial[key];
                                (source.system.martial as unknown as Record<string, unknown>)[`-=${key}`] = null;
                            }
                        }
                    }
                    break;
                }
                case "weaponGroups": {
                    if (source.type === "character") {
                        const proficiencyKeys = deletions.map(
                            (deletion) => `weapon-group-${deletion}`
                        ) as WeaponGroupProficiencyKey[];
                        for (const key of proficiencyKeys) {
                            delete source.system.martial[key];
                            (source.system.martial as unknown as Record<string, unknown>)[`-=${key}`] = null;
                        }
                    }
                    break;
                }
                case "baseWeapons": {
                    if (source.type === "character") {
                        const proficiencyKeys = deletions.map(
                            (deletion) => `weapon-base-${deletion}`
                        ) as BaseWeaponProficiencyKey[];
                        for (const key of proficiencyKeys) {
                            delete source.system.martial[key];
                            (source.system.martial as unknown as Record<string, unknown>)[`-=${key}`] = null;
                        }
                    }
                    break;
                }
                case "weaponTraits": {
                    const weaponsAndAttacks = source.items.filter((i): i is MeleeSource | WeaponSource =>
                        ["melee", "weapon"].includes(i.type)
                    );
                    for (const itemSource of weaponsAndAttacks) {
                        const traits: string[] = itemSource.system.traits.value;
                        for (const deleted of deletions) {
                            traits.findSplice((t) => t === deleted);
                        }
                    }
                }
            }
        }

        override async updateItem(source: ItemSourcePF2e) {
            switch (listKey) {
                // Creature traits can be on many item
                case "creatureTraits": {
                    if (source.system.traits) {
                        const traits = source.system.traits;
                        traits.value = traits.value.filter((t) => !deletions.includes(t));
                    }
                    break;
                }
                case "featTraits": {
                    if (source.type === "feat") {
                        const traits = source.system.traits;
                        traits.value = traits.value.filter((t) => !deletions.includes(t));
                    }
                    break;
                }
                case "magicSchools": {
                    if (source.type === "spell") {
                        const school = source.system.school;
                        school.value = deletions.includes(school.value ?? "") ? "evocation" : school.value;
                    }
                    break;
                }
                case "spellTraits": {
                    if (source.type === "spell") {
                        const traits = source.system.traits;
                        traits.value = traits.value.filter((t) => !deletions.includes(t));
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
            }
        }
    };

    return new Migration();
}
