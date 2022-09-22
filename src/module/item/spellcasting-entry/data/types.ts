import { ActorPF2e } from "@actor";
import { AbilityString } from "@actor/types";
import { SpellPF2e } from "@item";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemData } from "@item/data/base";
import { MagicTradition } from "@item/spell/types";
import { OneToTen, ZeroToEleven, ZeroToFour } from "@module/data";
import { RollNotePF2e } from "@module/notes";
import { Statistic } from "@system/statistic";
import { SpellcastingEntryPF2e } from "..";

interface BaseSpellcastingEntry {
    id: string;
    actor: ActorPF2e | null;
    ability: AbilityString;
    tradition: MagicTradition;
    statistic: Statistic;
    cast(spell: SpellPF2e, options: {}): Promise<void>;
}

interface SpellcastingEntry extends BaseSpellcastingEntry {
    isPrepared: boolean;
    isSpontaneous: boolean;
    isInnate: boolean;
    isFocusPool: boolean;
}

// temporary type until the spellcasting entry is migrated to no longer use slotX keys
type SlotKey = `slot${ZeroToEleven}`;

type SpellcastingEntrySource = BaseItemSourcePF2e<"spellcastingEntry", SpellcastingEntrySystemData>;

type SpellcastingEntryData = Omit<SpellcastingEntrySource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<SpellcastingEntryPF2e, "spellcastingEntry", SpellcastingEntrySystemData, SpellcastingEntrySource>;

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

type PreparationType = keyof ConfigPF2e["PF2E"]["preparationType"];

interface SpellcastingEntrySystemData extends ItemSystemData {
    ability: {
        value: AbilityString | "";
    };
    spelldc: {
        value: number;
        dc: number;
    };
    tradition: {
        value: MagicTradition | "";
    };
    prepared: {
        value: PreparationType;
        flexible?: boolean;
    };
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
}

export {
    BaseSpellcastingEntry,
    PreparationType,
    SlotKey,
    SpellAttackRollModifier,
    SpellDifficultyClass,
    SpellcastingEntry,
    SpellcastingEntryData,
    SpellcastingEntrySource,
    SpellcastingEntrySystemData,
};
