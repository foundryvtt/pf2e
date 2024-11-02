import type { ActorPF2e } from "@actor/base.ts";
import type { FeatPF2e, HeritagePF2e, ItemPF2e } from "@item";
import type { ItemSystemData } from "@item/base/data/index.ts";
import type { FeatOrFeatureCategory } from "@item/feat/types.ts";
import type { FeatGroup } from "./group.ts";

/** Any document that is similar enough to a feat/feature to be used as a feat for the purposes of feat groups */
interface FeatLike<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly level: number | null;
    category: string;
    group: FeatGroup<NonNullable<TParent>, this> | null;
    isFeat: boolean;
    isFeature: boolean;
    system: ItemSystemData & {
        location: string | null;
    };
}

/** Data that defines how a feat group is structured */
interface FeatGroupData {
    id: string;
    label: string;
    supported?: FeatOrFeatureCategory[];
    filter?: FeatBrowserFilterProps;
    slots?: (FeatSlotData | number)[];
    /** If true, all slots are sorted by their level. Only applies if slotless */
    sorted?: boolean;
    /** If set to true, all slots except the first will be hidden unless its been assigned to */
    requiresInitial?: boolean;
    /** Default placeholder text for empty slots */
    placeholder?: string;
    /** If given, this is feat group has a configurable limit independent of level */
    customLimit?: {
        label: string;
        min: number;
        max: number;
    } | null;
}

/** Compendium browser filter properties when using the browse features. These do not perform validation */
interface FeatBrowserFilterProps {
    categories?: FeatOrFeatureCategory[];
    traits?: string[];
    omitTraits?: string[];
    conjunction?: "or" | "and";
}

/** Data used to describe a feat slot when creating a new feat group */
interface FeatSlotData {
    /**
     * A globally unique id. In future versions this may become locally unique instead.
     * If omitted, it is <group id>-<level>.
     */
    id?: string;
    /** Short label for the feat slot, displayeed on the left. By default it is the level */
    label?: Maybe<string>;
    /** The level of the feat that should go in this slot */
    level?: Maybe<number>;
    /**
     * The limit value the group needs in order to display this feat.
     * This can be different from level if the group is based on tiers.
     */
    tier?: Maybe<number>;
    /** The text to display when the feat slot is empty */
    placeholder?: Maybe<string>;
    /** If given, these filters will be prioritized over the group's filters */
    filter?: FeatBrowserFilterProps;
}

/** An active feat slot in a feat group, including any feats that it might be containing */
interface FeatSlot<TItem extends FeatLike | HeritagePF2e = FeatPF2e> extends FeatSlotData {
    id: string;
    level: number | null;
    feat?: Maybe<TItem>;
    children: FeatSlot<FeatLike | HeritagePF2e>[];
}

export type { FeatBrowserFilterProps, FeatGroupData, FeatLike, FeatSlot, FeatSlotData };
