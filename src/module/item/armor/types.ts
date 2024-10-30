import type { ARMOR_CATEGORIES, ARMOR_GROUPS, ARMOR_PROPERTY_RUNE_TYPES } from "./values.ts";

type ArmorCategory = (typeof ARMOR_CATEGORIES)[number];
type ArmorGroup = (typeof ARMOR_GROUPS)[number];
type ArmorPropertyRuneType = SetElement<typeof ARMOR_PROPERTY_RUNE_TYPES>;
type ArmorTrait = keyof typeof CONFIG.PF2E.armorTraits;
type BaseArmorType = keyof typeof CONFIG.PF2E.baseArmorTypes;
type OtherArmorTag = "shoddy";
type ResilientRuneType = "" | "resilient" | "greaterResilient" | "majorResilient" | "mythicResilient";

export type {
    ArmorCategory,
    ArmorGroup,
    ArmorPropertyRuneType,
    ArmorTrait,
    BaseArmorType,
    OtherArmorTag,
    ResilientRuneType,
};
