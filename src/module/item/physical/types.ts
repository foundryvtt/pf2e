import type { ArmorTrait } from "@item/armor/types.ts";
import type { ConsumableTrait } from "@item/consumable/types.ts";
import type { EquipmentTrait } from "@item/equipment/types.ts";
import type { ShieldTrait } from "@item/shield/types.ts";
import type { WeaponTrait } from "@item/weapon/types.ts";
import type { PHYSICAL_ITEM_TYPES, PRECIOUS_MATERIAL_GRADES, PRECIOUS_MATERIAL_TYPES } from "./values.ts";

type BaseMaterialType = "bone" | "cloth" | "glass" | "leather" | "paper" | "rope" | "steel" | "stone" | "wood";
type BaseMaterialThickness = "thin" | "standard" | "structure";
type BaseMaterial = { type: BaseMaterialType; thickness: BaseMaterialThickness };

type CoinDenomination = "pp" | "gp" | "sp" | "cp";

type PhysicalItemTrait = ArmorTrait | ConsumableTrait | EquipmentTrait | ShieldTrait | WeaponTrait;
type PhysicalItemType = SetElement<typeof PHYSICAL_ITEM_TYPES>;

type PreciousMaterialType = SetElement<typeof PRECIOUS_MATERIAL_TYPES>;
type PreciousMaterialGrade = SetElement<typeof PRECIOUS_MATERIAL_GRADES>;

type Grade = keyof typeof CONFIG.PF2E.grades;

interface StackDefinition {
    size: number;
    lightBulk: number;
}

export type {
    BaseMaterial,
    CoinDenomination,
    Grade,
    PhysicalItemTrait,
    PhysicalItemType,
    PreciousMaterialGrade,
    PreciousMaterialType,
    StackDefinition,
};
