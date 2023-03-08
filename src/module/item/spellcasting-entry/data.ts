import { AbilityString } from "@actor/types";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemData, ItemSystemSource } from "@item/data/base";
import { MagicTradition } from "@item/spell/types";
import { OneToTen, ZeroToEleven, ZeroToFour } from "@module/data";
import { RollNotePF2e } from "@module/notes";
import { SpellcastingEntryPF2e } from "./document";
import { SpellcastingCategory } from "./types";

// temporary type until the spellcasting entry is migrated to no longer use slotX keys
type SlotKey = `slot${ZeroToEleven}`;

type SpellcastingEntrySource = BaseItemSourcePF2e<"spellcastingEntry", SpellcastingEntrySystemSource>;

interface SpellcastingEntryData
    extends Omit<SpellcastingEntrySource, "flags" | "system" | "type">,
        BaseItemDataPF2e<SpellcastingEntryPF2e, "spellcastingEntry", SpellcastingEntrySource> {}

interface SpellAttackRollModifier {
    breakdown: string;
    notes: RollNotePF2e[];
    roll: Function;
    value: number;
}

interface SpellDifficultyClass {
    breakdown: string;
    notes: RollNotePF2e[];
    value: number;
}

interface SpellPrepData {
    id: string | null;
    expended?: boolean;
    name?: string;
    prepared?: boolean;
}

interface SpellSlotData {
    prepared: Record<number, SpellPrepData>;
    value: number;
    max: number;
}

interface SpellcastingEntrySystemSource extends ItemSystemSource {
    ability: { value: AbilityString | "" };
    spelldc: {
        value: number;
        dc: number;
    };
    tradition: { value: MagicTradition | "" };
    prepared: SpellCollectionTypeSource;
    showSlotlessLevels: {
        value: boolean;
    };
    proficiency: {
        slug: string;
        value: ZeroToFour;
    };
    slots: Record<SlotKey, SpellSlotData>;
    autoHeightenLevel: {
        value: OneToTen | null;
    };
    level?: never;
    traits?: never;
}

interface SpellCollectionTypeSource {
    value: SpellcastingCategory;
    flexible?: boolean;
    validItems?: "scroll" | "" | null;
}

interface SpellcastingEntrySystemData extends SpellcastingEntrySystemSource, Omit<ItemSystemData, "level" | "traits"> {
    prepared: SpellCollectionTypeData;
}

interface SpellCollectionTypeData extends SpellCollectionTypeSource {
    flexible: boolean;
    validItems: "scroll" | null;
}

export {
    SlotKey,
    SpellAttackRollModifier,
    SpellDifficultyClass,
    SpellcastingEntryData,
    SpellcastingEntrySource,
    SpellcastingEntrySystemData,
    SpellcastingEntrySystemSource,
};
