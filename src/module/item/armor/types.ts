import type { ARMOR_PROPERTY_RUNE_TYPES } from "./values.ts";

type ArmorTrait = keyof ConfigPF2e["PF2E"]["armorTraits"];
type ArmorCategory = keyof ConfigPF2e["PF2E"]["armorCategories"];
type ArmorGroup = keyof ConfigPF2e["PF2E"]["armorGroups"];
type ArmorPropertyRuneType = SetElement<typeof ARMOR_PROPERTY_RUNE_TYPES>;
type BaseArmorType = keyof ConfigPF2e["PF2E"]["baseArmorTypes"];
type ResilientRuneType = "" | "resilient" | "greaterResilient" | "majorResilient";
type OtherArmorTag = "shoddy";

export type {
    ArmorCategory,
    ArmorGroup,
    ArmorPropertyRuneType,
    ArmorTrait,
    BaseArmorType,
    OtherArmorTag,
    ResilientRuneType,
};
