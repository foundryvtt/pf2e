import { LocalizePF2e } from "@system/localize";

type ArmorTrait = keyof ConfigPF2e["PF2E"]["armorTraits"];
type ArmorCategory = keyof ConfigPF2e["PF2E"]["armorTypes"];
type ArmorGroup = keyof ConfigPF2e["PF2E"]["armorGroups"];
type BaseArmorType = keyof typeof LocalizePF2e.translations.PF2E.Item.Armor.Base;
type ResilientRuneType = "" | "resilient" | "greaterResilient" | "majorResilient";
type OtherArmorTag = "shoddy";

export { ArmorTrait, ArmorCategory, ArmorGroup, BaseArmorType, ResilientRuneType, OtherArmorTag };
