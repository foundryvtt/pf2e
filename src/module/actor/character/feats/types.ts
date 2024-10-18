import type { ActorPF2e } from "@actor/base.ts";
import type { FeatPF2e, HeritagePF2e, ItemPF2e } from "@item";
import type { ItemSystemData } from "@item/base/data/index.ts";
import type { FeatOrFeatureCategory } from "@item/feat/types.ts";
import type { FeatGroup } from "./group.ts";

/** Any document that is similar enough to a feat/feature to be used as a feat for the purposes of feat groups */
interface FeatLike<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
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
    featFilter?: string[];
    supported?: FeatOrFeatureCategory[];
    slots?: (FeatSlotCreationData | string | number)[];
}

interface FeatSlot<TItem extends FeatLike | HeritagePF2e = FeatPF2e> {
    id: string;
    label?: Maybe<string>;
    level: number | null;
    feat?: Maybe<TItem>;
    children: FeatSlot<FeatLike | HeritagePF2e>[];
}

interface FeatSlotCreationData extends Omit<FeatSlot, "children" | "feat" | "level"> {
    level?: Maybe<number>;
}

export type { FeatGroupData, FeatLike, FeatSlot, FeatSlotCreationData };
