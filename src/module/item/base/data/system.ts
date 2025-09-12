import type { DocumentFlags, DocumentFlagsSource } from "@common/data/_types.d.mts";
import type * as fields from "@common/data/fields.d.mts";
import type { MigrationRecord, OneToThree, PublicationData, Rarity } from "@module/data.ts";
import type { RuleElementSource } from "@module/rules/index.ts";
import type { Predicate } from "@system/predication.ts";
import type { ItemTrait } from "../types.ts";
import type { ItemType } from "./index.ts";

type BaseItemSourcePF2e<
    TType extends ItemType,
    TSystemSource extends ItemSystemSource = ItemSystemSource,
> = foundry.documents.ItemSource<TType, TSystemSource> & {
    flags: ItemSourceFlagsPF2e;
};

type ActionType = keyof typeof CONFIG.PF2E.actionTypes;

interface ActionCost {
    type: Exclude<ActionType, "passive">;
    value: OneToThree | null;
}

interface TraitConfig {
    volley?: number;
    tracking?: number;
    resilient?: number;
    [key: string]: number | undefined;
}

interface ItemTraits<T extends ItemTrait = ItemTrait> {
    value: T[];
    rarity: Rarity;
    otherTags: string[];
    config?: TraitConfig;
}

interface ItemTraitsNoRarity<T extends ItemTrait = ItemTrait> extends Omit<ItemTraits<T>, "rarity"> {
    rarity?: never;
}

interface RarityTraitAndOtherTags {
    rarity: Rarity;
    otherTags: string[];
    value?: never;
    config?: never;
}

interface OtherTagsOnly {
    otherTags: string[];
    value?: never;
    rarity?: never;
    config?: never;
}

type ItemFlagsPF2e = DocumentFlags & {
    pf2e: {
        rulesSelections: Record<string, string | number | object | null>;
        itemGrants: Record<string, ItemGranterData>;
        grantedBy: ItemGrantData | null;
        [key: string]: unknown;
    };
};

type ItemSourceFlagsPF2e = DocumentFlagsSource & {
    pf2e?: {
        rulesSelections?: Record<string, string | number | object>;
        itemGrants?: Record<string, ItemGranterSource>;
        grantedBy?: ItemGrantSource | null;
        [key: string]: unknown;
    };
};

interface ItemGrantSource {
    /** The ID of a granting or granted item */
    id: string;
    /** The action taken when the user attempts to delete the item referenced by `id` */
    onDelete?: ItemGrantDeleteAction;
}

type ItemGrantData = Required<ItemGrantSource>;

interface ItemGranterSource extends ItemGrantSource {
    /** Is this granted item visually nested under its granter: only applies to feats and features */
    nested?: boolean | null;
}

interface ItemGranterData extends Required<ItemGranterSource> {}

type ItemGrantDeleteAction = "cascade" | "detach" | "restrict";

type ItemSystemSource = {
    level?: { value: number };
    description: ItemDescriptionSource;
    traits: ItemTraits | ItemTraitsNoRarity | RarityTraitAndOtherTags | OtherTagsOnly;
    rules: RuleElementSource[];
    /** A non-unique but human-readable identifier for this item */
    slug: string | null;

    /** Information concerning the publication from which this item originates */
    publication: PublicationData;

    /** A record of this actor's current world schema version as well a log of the last migration to occur */
    _migration: MigrationRecord;
    /** Legacy location of `MigrationRecord` */
    schema?: object;
};

interface ItemDescriptionSource {
    gm: string;
    value: string;
}

interface ItemSystemData extends Omit<ItemSystemSource, "schema"> {
    description: ItemDescriptionData;
}

interface ItemDescriptionData extends ItemDescriptionSource {
    /** Additional text added by rule elements */
    addenda: {
        label: string;
        contents: AlteredDescriptionContent[];
    }[];
    override: AlteredDescriptionContent[] | null;
    /** True if lazy loaded description altering properties have been applied */
    initialized?: boolean;
}

interface AlteredDescriptionContent {
    title: string | null;
    text: string;
    divider: boolean;
    predicate: Predicate;
    processed?: boolean;
}

type FrequencyInterval = keyof typeof CONFIG.PF2E.frequencies;

interface FrequencySource {
    value: number | undefined;
    max: number;
    /** Gap between recharges as an ISO8601 duration, or "day" for daily prep. */
    per: FrequencyInterval;
}

type ItemSchemaPF2e = Omit<foundry.documents.ItemSchema, "system"> & {
    system: fields.TypeDataField;
};

interface Frequency extends FrequencySource {
    value: number;
}

export type {
    ActionCost,
    ActionType,
    BaseItemSourcePF2e,
    Frequency,
    FrequencyInterval,
    FrequencySource,
    ItemDescriptionData,
    ItemFlagsPF2e,
    ItemGrantData,
    ItemGrantDeleteAction,
    ItemGranterSource,
    ItemGrantSource,
    ItemSchemaPF2e,
    ItemSourceFlagsPF2e,
    ItemSystemData,
    ItemSystemSource,
    ItemTrait,
    ItemTraits,
    ItemTraitsNoRarity,
    OtherTagsOnly,
    RarityTraitAndOtherTags,
    TraitConfig,
};
