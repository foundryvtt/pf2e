import { PreciousMaterialType } from "@item/physical/types";

type WeaponMaterialType = Exclude<PreciousMaterialType, "dragonhide" | "grisantian-pelt">;

type WeaponMaterialEffect = Extract<
    WeaponMaterialType,
    "abysium" | "adamantine" | "coldIron" | "djezet" | "mithral" | "noqual" | "peachwood" | "silver" | "sovereignSteel"
>;

export { WeaponMaterialEffect, WeaponMaterialType };
