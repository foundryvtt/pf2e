export { TagSelectorBasic } from "./basic";
export { TraitSelectorResistances } from "./resistances";
export { TraitSelectorSenses } from "./senses";
export { TraitSelectorSpeeds } from "./speeds";
export { TraitSelectorWeaknesses } from "./weaknesses";

/* Basic trait selector options */
export interface BasicSelectorOptions extends FormApplicationOptions {
    /* The base property to update e.g. 'data.traits.languages' */
    objectProperty: string;
    /* An array of keys from CONFIG.PF2E */
    configTypes: SelectableTagField[];
    /* A custom window title. Defaults to 'PF2E.TraitsLabel'. */
    title?: string;
    /* Show the custom input field (defaults to true) */
    allowCustom?: boolean;
    /* Custom choices to add to the list of choices */
    customChoices?: Record<string, string>;
}
export interface TagSelectorOptions extends FormApplicationOptions, Partial<BasicSelectorOptions> {}

export const TAG_SELECTOR_TYPES = ["basic", "resistances", "senses", "speed-types", "weaknesses"] as const;
export type TagSelectorType = typeof TAG_SELECTOR_TYPES[number];

// CONFIG properties that can be used in a tag selector
export const SELECTABLE_TAG_FIELDS = [
    "abilities",
    "skills",
    "martialSkills",
    "currencies",
    "saves",
    "armorTraits",
    "preciousMaterialGrades",
    "armorPotencyRunes",
    "armorResiliencyRunes",
    "armorPropertyRunes",
    "weaponPotencyRunes",
    "weaponStrikingRunes",
    "weaponPropertyRunes",
    "rarityTraits",
    "damageTypes",
    "weaponDamage",
    "healingTypes",
    "weaponTypes",
    "weaponGroups",
    "consumableTraits",
    "weaponDescriptions",
    "weaponTraits",
    "traitsDescriptions",
    "weaponHands",
    "equipmentTraits",
    "itemBonuses",
    "damageDie",
    "weaponRange",
    "weaponMAP",
    "weaponReload",
    "armorTypes",
    "armorGroups",
    "consumableTypes",
    "magicTraditions",
    "preparationType",
    "spellTraits",
    "featTraits",
    "areaTypes",
    "areaSizes",
    "classTraits",
    "ancestryTraits",
    "alignment",
    "skillList",
    "spellComponents",
    "spellTypes",
    "magicTraditions",
    "spellLevels",
    "featTypes",
    "featActionTypes",
    "actionTypes",
    "actionTypes",
    "actionsNumber",
    "actionCategories",
    "proficiencyLevels",
    "heroPointLevels",
    "actorSizes",
    "bulkTypes",
    "conditionTypes",
    "immunityTypes",
    "resistanceTypes",
    "weaknessTypes",
    "languages",
    "creatureTraits",
    "monsterTraits",
    "spellScalingModes",
    "attackEffects",
    "hazardTraits",
    "attributes",
    "speedTypes",
    "senses",
    "preciousMaterials",
    "prerequisitePlaceholders",
    "ancestryItemTraits",
    "levels",
    "dcAdjustments",
] as const;

export type SelectableTagField = typeof SELECTABLE_TAG_FIELDS[number];
