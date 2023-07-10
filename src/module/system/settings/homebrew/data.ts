import { BaseWeaponType } from "@item/weapon/types.ts";
import { MenuTemplateData, SettingsTemplateData } from "../menu.ts";

const HOMEBREW_TRAIT_KEYS = [
    "creatureTraits",
    "featTraits",
    "languages",
    "magicSchools",
    "spellTraits",
    "weaponCategories",
    "weaponGroups",
    "baseWeapons",
    "weaponTraits",
    "equipmentTraits",
] as const;

/** Homebrew elements from some of the above records are propagated to related records */
const SECONDARY_TRAIT_RECORDS = {
    creatureTraits: ["ancestryItemTraits"],
    equipmentTraits: ["armorTraits", "consumableTraits"],
    featTraits: ["actionTraits"],
    weaponTraits: ["npcAttackTraits"],
    magicSchools: ["spellTraits"],
} as const;

type HomebrewTraitKey = (typeof HOMEBREW_TRAIT_KEYS)[number];
type HomebrewKey = HomebrewTraitKey | "damageTypes";
type HomebrewTraitSettingsKey = `homebrew.${HomebrewTraitKey}`;

interface HomebrewTag<T extends HomebrewTraitKey = HomebrewTraitKey> {
    id: T extends "baseWeapons"
        ? BaseWeaponType
        : T extends Exclude<HomebrewTraitKey, "baseWeapons">
        ? keyof ConfigPF2e["PF2E"][T]
        : never;
    value: string;
}

type MainDamageCategories = "physical" | "energy";

interface CustomDamageData {
    label: string;
    category: MainDamageCategories;
    icon: string | null;
}

interface HomebrewElementsSheetData extends MenuTemplateData {
    traitSettings: Record<string, SettingsTemplateData>;
    damageCategories: Record<MainDamageCategories, string>;
    customDamageTypes: CustomDamageData[];
}

export {
    CustomDamageData,
    HOMEBREW_TRAIT_KEYS,
    HomebrewElementsSheetData,
    HomebrewKey,
    HomebrewTag,
    HomebrewTraitKey,
    HomebrewTraitSettingsKey,
    SECONDARY_TRAIT_RECORDS,
};
