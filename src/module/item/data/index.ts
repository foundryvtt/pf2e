import type { ActionItemData, ActionItemSource } from "@item/action/data";
import { AfflictionData } from "@item/affliction/data";
import type { AncestryData, AncestrySource } from "@item/ancestry/data";
import type { ArmorData, ArmorSource } from "@item/armor/data";
import type { BackgroundData, BackgroundSource } from "@item/background/data";
import type { BookData, BookSource } from "@item/book";
import type { ClassData, ClassSource } from "@item/class/data";
import type { ConditionData, ConditionSource } from "@item/condition/data";
import type { ConsumableData, ConsumableSource } from "@item/consumable/data";
import type { ContainerData, ContainerSource } from "@item/container/data";
import { DeityData, DeitySource } from "@item/deity/data";
import type { EffectData, EffectSource } from "@item/effect/data";
import type { EquipmentData, EquipmentSource } from "@item/equipment/data";
import type { FeatData, FeatSource } from "@item/feat/data";
import { HeritageData } from "@item/heritage";
import type { KitData, KitSource } from "@item/kit/data";
import type { LoreData, LoreSource } from "@item/lore/data";
import type { MeleeData, MeleeSource } from "@item/melee/data";
import { PhysicalItemType } from "@item/physical/types";
import type { SpellData, SpellSource } from "@item/spell/data";
import type { SpellcastingEntryData, SpellcastingEntrySource } from "@item/spellcasting-entry/data";
import type { TreasureData, TreasureSource } from "@item/treasure/data";
import type { WeaponData, WeaponSource } from "@item/weapon/data";
import { PROFICIENCY_RANKS } from "@module/data";
import { PhysicalItemTraits } from "../physical/data";

type ProficiencyRank = (typeof PROFICIENCY_RANKS)[number];

type NonPhysicalItemType =
    | "action"
    | "affliction"
    | "ancestry"
    | "background"
    | "class"
    | "condition"
    | "deity"
    | "effect"
    | "feat"
    | "heritage"
    | "kit"
    | "lore"
    | "melee"
    | "spell"
    | "spellcastingEntry";

type ItemType = NonPhysicalItemType | PhysicalItemType;

/** Actual physical items which you carry (as opposed to feats, lore, proficiencies, statuses, etc). */
type PhysicalItemData = { system: { traits: PhysicalItemTraits } } & (
    | ArmorData
    | BookData
    | ConsumableData
    | ContainerData
    | EquipmentData
    | TreasureData
    | WeaponData
);
type MagicItemData = Exclude<PhysicalItemData, ConsumableData | TreasureData>;
type MagicItemSource = Exclude<PhysicalItemSource, ConsumableSource | TreasureSource>;

type ItemDataPF2e =
    | PhysicalItemData
    | ActionItemData
    | AfflictionData
    | AncestryData
    | BackgroundData
    | ClassData
    | ConditionData
    | DeityData
    | EffectData
    | FeatData
    | HeritageData
    | KitData
    | LoreData
    | MeleeData
    | SpellcastingEntryData
    | SpellData;

type PhysicalItemSource = PhysicalItemData["_source"];
type ItemSourcePF2e = ItemDataPF2e["_source"];

interface ItemSummaryData {
    [key: string]: unknown;
    description?: {
        value: string;
    };
    traits?: TraitChatData[];
    properties?: (string | number | null)[];
}

interface TraitChatData {
    value: string;
    label: string;
    description?: string;
    mystified?: boolean;
    excluded?: boolean;
}

export type {
    ActionItemData,
    AncestryData,
    ArmorData,
    BackgroundData,
    ClassData,
    ConditionData,
    ConsumableData,
    ContainerData,
    DeityData,
    EffectData,
    EquipmentData,
    FeatData,
    KitData,
    LoreData,
    MeleeData,
    SpellcastingEntryData,
    SpellData,
    TreasureData,
    WeaponData,
};

export {
    ActionItemSource,
    AncestrySource,
    ArmorSource,
    BackgroundSource,
    BookSource,
    ClassSource,
    ConditionSource,
    ConsumableSource,
    ContainerSource,
    DeitySource,
    EffectSource,
    EquipmentSource,
    FeatSource,
    ItemDataPF2e,
    ItemSourcePF2e,
    ItemSummaryData,
    ItemType,
    KitSource,
    LoreSource,
    MagicItemData,
    MagicItemSource,
    MeleeSource,
    NonPhysicalItemType,
    PhysicalItemData,
    PhysicalItemSource,
    ProficiencyRank,
    SpellSource,
    SpellcastingEntrySource,
    TraitChatData,
    TreasureSource,
    WeaponSource,
};
