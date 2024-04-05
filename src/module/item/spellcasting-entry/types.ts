import { ActorPF2e } from "@actor";
import { AttributeString } from "@actor/types.ts";
import { PhysicalItemPF2e } from "@item/physical/index.ts";
import { SpellPF2e } from "@item/spell/document.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { OneToTen } from "@module/data.ts";
import { Statistic, StatisticChatData } from "@system/statistic/index.ts";
import { SpellCollection, SpellCollectionData, SpellSlotGroupId } from "./collection.ts";
import { SpellcastingEntrySystemData } from "./data.ts";

interface BaseSpellcastingEntry<TActor extends ActorPF2e | null = ActorPF2e | null> {
    id: string;
    name: string;
    actor: TActor;
    sort: number;
    category: SpellcastingCategory;
    attribute?: Maybe<AttributeString>;
    isFlexible: boolean;
    isFocusPool: boolean;
    isInnate: boolean;
    isPrepared: boolean;
    isRitual: boolean;
    isSpontaneous: boolean;
    isEphemeral: boolean;
    statistic?: Statistic | null;
    /** A related but more-limited statistic for making counteract checks */
    counteraction?: Statistic | null;
    tradition: MagicTradition | null;
    spells: SpellCollection<NonNullable<TActor>> | null;
    system?: SpellcastingEntrySystemData;

    getSheetData(options?: GetSheetDataOptions<NonNullable<TActor>>): Promise<SpellcastingSheetData>;
    getRollOptions?(prefix: "spellcasting"): string[];

    canCast(spell: SpellPF2e, options?: { origin?: PhysicalItemPF2e }): boolean;

    cast(spell: SpellPF2e, options: CastOptions): Promise<void>;
}

interface GetSheetDataOptions<TActor extends ActorPF2e> {
    spells?: Maybe<SpellCollection<TActor>>;
    prepList?: boolean;
}

interface SpellcastingEntry<TActor extends ActorPF2e | null> extends BaseSpellcastingEntry<TActor> {
    attribute: AttributeString;
    statistic: Statistic;
    counteraction: Statistic;
}

type SpellcastingCategory = keyof ConfigPF2e["PF2E"]["preparationType"];

interface CastOptions {
    slotId?: number;
    /** The rank at which to cast the spell */
    rank?: OneToTen;
    consume?: boolean;
    message?: boolean;
    rollMode?: RollMode;
}

type UnusedProperties = "actor" | "spells" | "getSheetData" | "cast" | "canCast";
type OptionalProperties = "isFlexible" | "isFocusPool" | "isInnate" | "isPrepared" | "isRitual" | "isSpontaneous";

/** Spell list render data for a `BaseSpellcastingEntry` */
interface SpellcastingSheetData
    extends Omit<BaseSpellcastingEntry<ActorPF2e>, "statistic" | OptionalProperties | UnusedProperties>,
        SpellCollectionData {
    statistic: StatisticChatData | null;
    hasCollection: boolean;
    isFlexible?: boolean;
    isFocusPool?: boolean;
    isInnate?: boolean;
    isPrepared?: boolean;
    isRitual?: boolean;
    isSpontaneous?: boolean;
    usesSpellProficiency: boolean;
    showSlotlessLevels?: boolean;
}

interface SpellcastingSlotGroup {
    id: SpellSlotGroupId;
    label: string;
    /** The highest spell rank that can be present in this slot group */
    maxRank: OneToTen;

    /**
     * Number of uses and max slots or spells.
     * If this is null, allowed usages are infinite.
     * If value is undefined then it's not expendable, it's a count of total spells instead.
     */
    uses?: {
        value?: number;
        max: number;
    };

    /** The number corresponding with spellcasting entries' "slotN" object */
    number?: number;

    active: (ActiveSpell | null)[];
}

interface SpellPrepEntry {
    spell: SpellPF2e<ActorPF2e>;
    signature: boolean;
}

interface ActiveSpell {
    spell: SpellPF2e<ActorPF2e>;
    /** The rank at which a spell is cast (if prepared or automatically heighted) */
    castRank?: number;
    expended?: boolean;
    /** Is this spell marked as signature/collection */
    signature?: boolean;
    /** Is the spell not actually of this rank? */
    virtual?: boolean;
}

export type {
    ActiveSpell,
    BaseSpellcastingEntry,
    CastOptions,
    SpellPrepEntry,
    SpellcastingCategory,
    SpellcastingEntry,
    SpellcastingSheetData,
    SpellcastingSlotGroup,
};
