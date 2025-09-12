const TAG_SELECTOR_TYPES = ["basic", "languages", "senses", "speed-types"] as const;
type TagSelectorType = (typeof TAG_SELECTOR_TYPES)[number];

// CONFIG properties that can be used in a tag selector
const SELECTABLE_TAG_FIELDS = [
    "abilities",
    "actionTraits",
    "attackEffects",
    "creatureTraits",
    "damageCategories",
    "levels",
    "materialDamageEffects",
    "otherArmorTags",
    "otherConsumableTags",
    "otherWeaponTags",
    "senses",
    "skills",
    "vehicleTraits",
    "weaponTraits",
] as const;

type SelectableTagField = (typeof SELECTABLE_TAG_FIELDS)[number] | "languages";

export type { TagSelectorOptions } from "./base.ts";
export { TagSelectorBasic } from "./basic.ts";
export type { BasicConstructorOptions, BasicSelectorOptions } from "./basic.ts";
export { LanguageSelector } from "./languages.ts";
export { SenseSelector } from "./senses.ts";
export { SpeedSelector } from "./speeds.ts";
export { SELECTABLE_TAG_FIELDS, TAG_SELECTOR_TYPES };
export type { SelectableTagField, TagSelectorType };
