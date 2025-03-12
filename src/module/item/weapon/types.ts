import { PreciousMaterialType } from "@item/physical/types.ts";
import type {
    MELEE_WEAPON_GROUPS,
    WEAPON_CATEGORIES,
    WEAPON_GROUPS,
    WEAPON_PROPERTY_RUNE_TYPES,
    WEAPON_RANGES,
} from "./values.ts";

type WeaponPropertyRuneType = SetElement<typeof WEAPON_PROPERTY_RUNE_TYPES>;

type WeaponCategory = (typeof WEAPON_CATEGORIES)[number];
type MeleeWeaponGroup = SetElement<typeof MELEE_WEAPON_GROUPS>;

type WeaponGroup = SetElement<typeof WEAPON_GROUPS>;
type BaseWeaponType = keyof typeof CONFIG.PF2E.baseWeaponTypes | keyof typeof CONFIG.PF2E.baseShieldTypes;

type WeaponTrait = keyof typeof CONFIG.PF2E.weaponTraits;
type OtherWeaponTag = "improvised" | "shoddy" | "handwraps-of-mighty-blows";

type WeaponRangeIncrement = SetElement<typeof WEAPON_RANGES>;
type WeaponReloadTime = "-" | "0" | "1" | "2" | "3" | "10";

type StrikingRuneType = "striking" | "greaterStriking" | "majorStriking" | "mythicStriking";

type WeaponMaterialType = Exclude<PreciousMaterialType, "dragonhide" | "grisantian-pelt" | "dreamweb">;

export type {
    BaseWeaponType,
    MeleeWeaponGroup,
    OtherWeaponTag,
    StrikingRuneType,
    WeaponCategory,
    WeaponGroup,
    WeaponMaterialType,
    WeaponPropertyRuneType,
    WeaponRangeIncrement,
    WeaponReloadTime,
    WeaponTrait,
};
