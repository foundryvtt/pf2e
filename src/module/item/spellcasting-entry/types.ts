import { ActorPF2e } from "@actor";
import { AbilityString } from "@actor/types.ts";
import { PhysicalItemPF2e } from "@item/physical/index.ts";
import { SpellPF2e } from "@item/spell/document.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { ZeroToTen } from "@module/data.ts";
import { Statistic, StatisticChatData } from "@system/statistic/index.ts";
import { SpellCollection } from "./collection.ts";
import { SpellcastingEntrySystemData } from "./data.ts";

interface BaseSpellcastingEntry<TActor extends ActorPF2e | null = ActorPF2e | null> {
    id: string;
    name: string;
    actor: TActor;
    sort: number;
    category: SpellcastingCategory;
    ability?: AbilityString;
    isFlexible: boolean;
    isFocusPool: boolean;
    isInnate: boolean;
    isPrepared: boolean;
    isRitual: boolean;
    isSpontaneous: boolean;
    statistic?: Statistic | null;
    tradition: MagicTradition | null;
    spells: SpellCollection<NonNullable<TActor>, this> | null;
    system?: SpellcastingEntrySystemData;

    getSheetData(): Promise<SpellcastingSheetData>;

    canCast(spell: SpellPF2e, options?: { origin?: PhysicalItemPF2e }): boolean;

    cast(spell: SpellPF2e, options: CastOptions): Promise<void>;
}

interface SpellcastingEntry<TActor extends ActorPF2e | null> extends BaseSpellcastingEntry<TActor> {
    ability: AbilityString;
    statistic: Statistic;
}

type SpellcastingCategory = keyof ConfigPF2e["PF2E"]["preparationType"];

interface CastOptions {
    slot?: number;
    /** The spell level to consume to cast the spell at */
    level?: number;
    message?: boolean;
    rollMode?: RollMode;
}

interface SpellcastingEntryPF2eCastOptions extends CastOptions {
    consume?: boolean;
}

type UnusedProperties = "actor" | "spells" | "getSheetData" | "cast" | "canCast";
type OptionalProperties = "isFlexible" | "isFocusPool" | "isInnate" | "isPrepared" | "isRitual" | "isSpontaneous";

/** Spell list render data for a `BaseSpellcastingEntry` */
interface SpellcastingSheetData
    extends Omit<BaseSpellcastingEntry<ActorPF2e>, "statistic" | OptionalProperties | UnusedProperties> {
    statistic: StatisticChatData | null;
    hasCollection: boolean;
    flexibleAvailable?: { value: number; max: number } | null;
    levels: SpellcastingSlotLevel[];
    spellPrepList: Record<number, SpellPrepEntry[]> | null;
    isFlexible?: boolean;
    isFocusPool?: boolean;
    isInnate?: boolean;
    isPrepared?: boolean;
    isRitual?: boolean;
    isSpontaneous?: boolean;
    showSlotlessLevels?: boolean;
}

interface SpellcastingSlotLevel {
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

interface SpellPrepEntry {
    spell: SpellPF2e<ActorPF2e>;
    signature?: boolean;
}

interface ActiveSpell {
    spell: SpellPF2e<ActorPF2e>;
    /** The level at which a spell is cast (if prepared or automatically heighted) */
    castLevel?: number;
    expended?: boolean;
    /** Is this spell marked as signature/collection */
    signature?: boolean;
    /** Is the spell not actually of this level? */
    virtual?: boolean;
}

export {
    ActiveSpell,
    BaseSpellcastingEntry,
    CastOptions,
    SpellPrepEntry,
    SpellcastingCategory,
    SpellcastingEntry,
    SpellcastingEntryPF2eCastOptions,
    SpellcastingSheetData,
    SpellcastingSlotLevel,
};
