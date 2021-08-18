import { AbilityString } from "@actor/data/base";
import type { ActionData, ActionSource } from "@item/action/data";
import type { AncestryData, AncestrySource } from "@item/ancestry/data";
import type { ArmorData, ArmorSource } from "@item/armor/data";
import type { BackgroundData, BackgroundSource } from "@item/background/data";
import type { ClassData, ClassSource } from "@item/class/data";
import type { ConditionData, ConditionSource } from "@item/condition/data";
import type { ConsumableData, ConsumableSource } from "@item/consumable/data";
import type { ContainerData, ContainerSource } from "@item/container/data";
import { CraftingEntryData, CraftingEntrySource } from "@item/crafting-entry/data";
import { MartialData } from "@item/deprecated";
import type { EffectData, EffectSource } from "@item/effect/data";
import type { EquipmentData, EquipmentSource } from "@item/equipment/data";
import type { FeatData, FeatSource } from "@item/feat/data";
import { FormulaData, FormulaSource } from "@item/formula/data";
import type { KitData, KitSource } from "@item/kit/data";
import type { LoreData, LoreSource } from "@item/lore/data";
import type { MeleeData, MeleeSource } from "@item/melee/data";
import type { SpellData, SpellSource } from "@item/spell/data";
import type { SpellcastingEntryData, SpellcastingEntrySource } from "@item/spellcasting-entry/data";
import type { TreasureData, TreasureSource } from "@item/treasure/data";
import type { WeaponData, WeaponSource } from "@item/weapon/data";
import { PhysicalItemType } from "../physical/data";
import { NonPhysicalItemType } from "./non-physical";

export type ProficiencyRank = "untrained" | "trained" | "expert" | "master" | "legendary";

export interface TrickMagicItemCastData {
    ability: AbilityString;
    data: { spelldc: { value: number; dc: number } };
    _id: string;
}

export type ItemType = NonPhysicalItemType | PhysicalItemType;

/** Actual physical items which you carry (as opposed to feats, lore, proficiencies, statuses, etc). */
export type PhysicalItemData = ArmorData | ConsumableData | ContainerData | EquipmentData | TreasureData | WeaponData;
export type MagicItemData = Exclude<PhysicalItemData, ConsumableData | TreasureData>;
export type MagicItemSource = Exclude<PhysicalItemSource, ConsumableSource | TreasureSource>;

export type ItemDataPF2e =
    | PhysicalItemData
    | ActionData
    | AncestryData
    | BackgroundData
    | ClassData
    | ConditionData
    | EffectData
    | FeatData
    | KitData
    | LoreData
    | MartialData
    | MeleeData
    | SpellcastingEntryData
    | SpellData
    | FormulaData
    | CraftingEntryData;

export type PhysicalItemSource = PhysicalItemData["_source"];
export type ItemSourcePF2e = ItemDataPF2e["_source"];

export interface TraitChatData {
    value: string;
    label: string;
    description?: string;
    mystified?: boolean;
    excluded?: boolean;
}

export type {
    ArmorData,
    ConsumableData,
    ContainerData,
    EquipmentData,
    TreasureData,
    WeaponData,
    ActionData,
    AncestryData,
    BackgroundData,
    ClassData,
    ConditionData,
    EffectData,
    FeatData,
    KitData,
    LoreData,
    MeleeData,
    SpellcastingEntryData,
    SpellData,
    FormulaData,
    CraftingEntryData,
};

export {
    ArmorSource,
    ConsumableSource,
    ContainerSource,
    EquipmentSource,
    TreasureSource,
    WeaponSource,
    ActionSource,
    AncestrySource,
    BackgroundSource,
    ClassSource,
    ConditionSource,
    EffectSource,
    FeatSource,
    KitSource,
    LoreSource,
    MeleeSource,
    SpellcastingEntrySource,
    SpellSource,
    FormulaSource,
    CraftingEntrySource,
};
