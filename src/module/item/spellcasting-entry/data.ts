import { AbilityString } from '@actor/data/base';
import { ItemSystemData } from '@item/data/base';
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from '@item/data/non-physical';
import { RollNotePF2e } from '@module/notes';
import { SpellcastingEntryPF2e } from '.';

export type SpellcastingEntrySource = BaseNonPhysicalItemSource<'spellcastingEntry', SpellcastingEntrySystemData>;

export class SpellcastingEntryData extends BaseNonPhysicalItemData<SpellcastingEntryPF2e> {
    /** @override */
    static DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/spellcastingEntry.svg';
}

export interface SpellcastingEntryData extends Omit<SpellcastingEntrySource, '_id' | 'effects'> {
    type: SpellcastingEntrySource['type'];
    data: SpellcastingEntrySource['data'];
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

interface SpellSlotData {
    prepared: { id: string }[];
    value: number;
    max: number;
}

export type MagicTradition = keyof ConfigPF2e['PF2E']['magicTraditions'];
export type PreparationType = 'prepared' | 'spontaneous' | 'innate';

export interface SpellSlots {
    slot0: SpellSlotData;
    slot1: SpellSlotData;
    slot2: SpellSlotData;
    slot3: SpellSlotData;
    slot4: SpellSlotData;
    slot5: SpellSlotData;
    slot6: SpellSlotData;
    slot7: SpellSlotData;
    slot8: SpellSlotData;
    slot9: SpellSlotData;
    slot10: SpellSlotData;
    slot11: SpellSlotData;
}

export interface SpellcastingEntrySystemData extends ItemSystemData {
    ability: {
        value: AbilityString | '';
    };
    spelldc: {
        value: number;
        dc: number;
        mod: number;
    };
    attack?: SpellAttackRollModifier;
    dc?: SpellDifficultyClass;
    tradition: {
        value: MagicTradition;
    };
    focus: {
        points: number;
        pool: number;
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
    slots: SpellSlots;
    signatureSpells: {
        value: string[];
    };
}
