import { AbilityString } from "@actor/data/base";
import { SpellPF2e } from "@item";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemData } from "@item/data/base";
import { MAGIC_TRADITIONS } from "@item/spell/data";
import { OneToFour, OneToTen, ZeroToEleven } from "@module/data";
import { RollNotePF2e } from "@module/notes";
import { Statistic, StatisticChatData } from "@system/statistic";
import { SpellcastingEntryPF2e } from "..";

export interface SpellcastingEntry {
    id: string;
    statistic: Statistic;
    cast(spell: SpellPF2e, options: {}): Promise<void>;
}

// temporary type until the spellcasting entry is migrated to no longer use slotX keys
export type SlotKey = `slot${ZeroToEleven}`;

type SpellcastingEntrySource = BaseItemSourcePF2e<"spellcastingEntry", SpellcastingEntrySystemData>;

type SpellcastingEntryData = Omit<SpellcastingEntrySource, "effects" | "flags"> &
    BaseItemDataPF2e<SpellcastingEntryPF2e, "spellcastingEntry", SpellcastingEntrySystemData, SpellcastingEntrySource>;

export interface SpellAttackRollModifier {
    breakdown: string;
    notes: RollNotePF2e[];
    roll: Function;
    value: number;
}

export interface SpellDifficultyClass {
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

export type MagicTradition = typeof MAGIC_TRADITIONS[number];
export type PreparationType = keyof ConfigPF2e["PF2E"]["preparationType"];

export interface SpellcastingEntrySystemData extends ItemSystemData {
    ability: {
        value: AbilityString | "";
    };
    spelldc: {
        value: number;
        dc: number;
        mod: number;
    };
    statisticData?: StatisticChatData;
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
        value: OneToFour;
    };
    slots: Record<SlotKey, SpellSlotData>;
    autoHeightenLevel: {
        value: OneToTen | null;
    };
}

export { SpellcastingEntryData, SpellcastingEntrySource };
