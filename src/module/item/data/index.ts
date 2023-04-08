import { ActionItemSource } from "@item/action/data.ts";
import { AfflictionSource } from "@item/affliction/data.ts";
import { AncestrySource } from "@item/ancestry/data.ts";
import { ArmorSource } from "@item/armor/data.ts";
import { BackgroundSource } from "@item/background/data.ts";
import { BookSource } from "@item/book/data.ts";
import { ClassSource } from "@item/class/data.ts";
import { ConditionSource } from "@item/condition/data.ts";
import { ConsumableSource } from "@item/consumable/data.ts";
import { ContainerSource } from "@item/container/data.ts";
import { DeitySource } from "@item/deity/data.ts";
import { EffectSource } from "@item/effect/data.ts";
import { EquipmentSource } from "@item/equipment/data.ts";
import { FeatSource } from "@item/feat/data.ts";
import { HeritageSource } from "@item/heritage/data.ts";
import { KitSource } from "@item/kit/data.ts";
import { LoreSource } from "@item/lore/data.ts";
import { MeleeSource } from "@item/melee/data.ts";
import { PhysicalItemType } from "@item/physical/types.ts";
import { SpellSource } from "@item/spell/data.ts";
import { SpellcastingEntrySource } from "@item/spellcasting-entry/data.ts";
import { TreasureSource } from "@item/treasure/data.ts";
import { WeaponSource } from "@item/weapon/data.ts";
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
