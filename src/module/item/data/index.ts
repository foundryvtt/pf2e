import { ActionItemSource } from "@item/action/data";
import { AfflictionSource } from "@item/affliction/data";
import { AncestrySource } from "@item/ancestry/data";
import { ArmorSource } from "@item/armor/data";
import { BackgroundSource } from "@item/background/data";
import { BookSource } from "@item/book";
import { ClassSource } from "@item/class/data";
import { ConditionSource } from "@item/condition/data";
import { ConsumableSource } from "@item/consumable/data";
import { ContainerSource } from "@item/container/data";
import { DeitySource } from "@item/deity/data";
import { EffectSource } from "@item/effect/data";
import { EquipmentSource } from "@item/equipment/data";
import { FeatSource } from "@item/feat/data";
import { HeritageSource } from "@item/heritage/data";
import { KitSource } from "@item/kit/data";
import { LoreSource } from "@item/lore/data";
import { MeleeSource } from "@item/melee/data";
import { PhysicalItemType } from "@item/physical/types";
import { SpellSource } from "@item/spell/data";
import { SpellcastingEntrySource } from "@item/spellcasting-entry/data";
import { TreasureSource } from "@item/treasure/data";
import { WeaponSource } from "@item/weapon/data";
import { PROFICIENCY_RANKS } from "@module/data";

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
