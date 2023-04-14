import type { ActionItemSource } from "@item/action/data.ts";
import type { AfflictionSource } from "@item/affliction/data.ts";
import type { AncestrySource } from "@item/ancestry/data.ts";
import type { ArmorSource } from "@item/armor/data.ts";
import type { BackgroundSource } from "@item/background/data.ts";
import type { BookSource } from "@item/book/data.ts";
import type { ClassSource } from "@item/class/data.ts";
import type { ConditionSource } from "@item/condition/data.ts";
import type { ConsumableSource } from "@item/consumable/data.ts";
import type { ContainerSource } from "@item/container/data.ts";
import type { DeitySource } from "@item/deity/data.ts";
import type { EffectSource } from "@item/effect/data.ts";
import type { EquipmentSource } from "@item/equipment/data.ts";
import type { FeatSource } from "@item/feat/data.ts";
import type { HeritageSource } from "@item/heritage/data.ts";
import type { KitSource } from "@item/kit/data.ts";
import type { LoreSource } from "@item/lore/data.ts";
import type { MeleeSource } from "@item/melee/data.ts";
import type { PhysicalItemType } from "@item/physical/types.ts";
import type { SpellSource } from "@item/spell/data.ts";
import type { SpellcastingEntrySource } from "@item/spellcasting-entry/data.ts";
import type { TreasureSource } from "@item/treasure/data.ts";
import type { WeaponSource } from "@item/weapon/data.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";

export * from "./helpers.ts";

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

type PhysicalItemSource =
    | ArmorSource
    | BookSource
    | ConsumableSource
    | ContainerSource
    | EquipmentSource
    | TreasureSource
    | WeaponSource;

type ItemSourcePF2e =
    | PhysicalItemSource
    | ActionItemSource
    | AfflictionSource
    | AncestrySource
    | BackgroundSource
    | ClassSource
    | ConditionSource
    | DeitySource
    | EffectSource
    | FeatSource
    | HeritageSource
    | KitSource
    | LoreSource
    | MeleeSource
    | SpellSource
    | SpellcastingEntrySource;

type MagicItemSource = Exclude<PhysicalItemSource, ConsumableSource | TreasureSource>;

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
    ItemSourcePF2e,
    ItemSummaryData,
    ItemType,
    KitSource,
    LoreSource,
    MagicItemSource,
    MeleeSource,
    NonPhysicalItemType,
    PhysicalItemSource,
    ProficiencyRank,
    SpellSource,
    SpellcastingEntrySource,
    TraitChatData,
    TreasureSource,
    WeaponSource,
};
