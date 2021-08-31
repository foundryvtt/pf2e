import { AbilityString } from "@actor/data/base";
import { ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { MAGIC_TRADITIONS } from "@item/spell/data";
import { OneToTen, ZeroToEleven } from "@module/data";
import { RollNotePF2e } from "@module/notes";
import { SpellcastingEntryPF2e } from "..";

// temporary type until the spellcasting entry is migrated to no longer use slotX keys
export type SlotKey = `slot${ZeroToEleven}`;

export type SpellcastingEntrySource = BaseNonPhysicalItemSource<"spellcastingEntry", SpellcastingEntrySystemData>;

export class SpellcastingEntryData extends BaseNonPhysicalItemData<SpellcastingEntryPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/spellcastingEntry.svg";
}

export interface SpellcastingEntryData extends Omit<SpellcastingEntrySource, "_id" | "effects"> {
    type: SpellcastingEntrySource["type"];
    data: SpellcastingEntrySource["data"];
    readonly _source: SpellcastingEntrySource;
}

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
    attack?: SpellAttackRollModifier;
    dc?: SpellDifficultyClass;
    tradition: {
        value: MagicTradition | "";
    };
    prepared: {
        value: PreparationType;
    };
    showUnpreparedSpells: {
        value: boolean;
    };
    proficiency: {
        value: number;
    };
    displayLevels: Record<number, boolean>;
    slots: Record<SlotKey, SpellSlotData>;
    signatureSpells: {
        value: string[];
    };
    autoHeightenLevel: {
        value: OneToTen | null;
    };
}
