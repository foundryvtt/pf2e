import { PreciousMaterialType } from "@item/physical/types";

type WeaponMaterialType = Exclude<PreciousMaterialType, "dragonhide" | "grisantian-pelt">;

type WeaponMaterialEffect = Extract<
    WeaponMaterialType,
    "abysium" | "adamantine" | "coldIron" | "djezet" | "mithral" | "noqual" | "peachwood" | "silver" | "sovereignSteel"
>;

type WeaponReloadTime = "-" | "0" | "1" | "2" | "3" | "10";

export { WeaponMaterialEffect, WeaponMaterialType, WeaponReloadTime };
