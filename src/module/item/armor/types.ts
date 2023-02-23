import { LocalizePF2e } from "@system/localize";
import { PreciousMaterialType, ARMOR_PROPERTY_RUNE_TYPES } from "@module/item";

type ArmorTrait = keyof ConfigPF2e["PF2E"]["armorTraits"];
type ArmorCategory = keyof ConfigPF2e["PF2E"]["armorTypes"];
type ArmorGroup = keyof ConfigPF2e["PF2E"]["armorGroups"];
type BaseArmorType = keyof typeof LocalizePF2e.translations.PF2E.Item.Armor.Base;
type ResilientRuneType = "" | "resilient" | "greaterResilient" | "majorResilient";
type OtherArmorTag = "shoddy";
type ArmorMaterialType = Exclude<PreciousMaterialType, "dragonhide" | "grisantian-pelt">; // TODO: add delete dragonhide and add peachwood and warpglass
type ArmorPropertyRuneType = SetElement<typeof ARMOR_PROPERTY_RUNE_TYPES>;

export {
    ArmorTrait,
    ArmorCategory,
    ArmorGroup,
    BaseArmorType,
    ResilientRuneType,
    OtherArmorTag,
    ArmorMaterialType,
    ArmorPropertyRuneType,
};
