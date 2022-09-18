import { SpellPF2e } from "@item";
import { MagicTradition } from "@item/spell/types";
import { ZeroToTen } from "@module/data";
import { StatisticChatData } from "@system/statistic";
import { PreparationType } from ".";

/** Final render data used for showing a spellcasting ability  */
export interface SpellcastingAbilityData {
    id: string;
    name: string;
    statistic: StatisticChatData;
    tradition: MagicTradition | null;
    castingType: PreparationType;
    isPrepared?: boolean;
    isSpontaneous?: boolean;
    isFlexible?: boolean;
    isInnate?: boolean;
    isFocusPool?: boolean;
    isRitual?: boolean;
    hasCollection: boolean;
}

/** Spell list render data for a SpellcastingEntryPF2e */
export interface SpellcastingEntryListData extends SpellcastingAbilityData {
    flexibleAvailable?: { value: number; max: number };
    levels: SpellcastingSlotLevel[];
    spellPrepList: Record<number, SpellPrepEntry[]> | null;
}

export interface SpellcastingSlotLevel {
    label: string;
    level: ZeroToTen;
    isCantrip: boolean;

    /**
     * Number of uses and max slots or spells.
     * If this is null, allowed usages are infinite.
     * If value is undefined then it's not expendable, it's a count of total spells instead.
     */
    uses?: {
        value?: number;
        max: number;
    };

    active: (ActiveSpell | null)[];
}

export interface SpellPrepEntry {
    spell: Embedded<SpellPF2e>;
    signature?: boolean;
}

export interface ActiveSpell {
    spell: Embedded<SpellPF2e>;
    chatData: Record<string, unknown>;
    expended?: boolean;
    /** Is this spell marked as signature/collection */
    signature?: boolean;
    /** Is the spell not actually of this level? */
    virtual?: boolean;
}
