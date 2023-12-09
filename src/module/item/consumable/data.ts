import {
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import { SpellSource } from "@item/spell/data.ts";
import type { AmmoStackGroup, ConsumableTrait, OtherConsumableTag } from "./types.ts";

type ConsumableSource = BasePhysicalItemSource<"consumable", ConsumableSystemSource>;

type ConsumableCategory = keyof ConfigPF2e["PF2E"]["consumableTypes"];

interface ConsumableTraits extends PhysicalItemTraits<ConsumableTrait> {
    otherTags: OtherConsumableTag[];
}

interface ConsumableSystemSource extends PhysicalSystemSource {
    traits: ConsumableTraits;

    consumableType: {
        value: ConsumableCategory;
    };
    charges: {
        value: number;
        max: number;
    };
    consume: {
        value: string | null;
    };
    autoDestroy: {
        value: boolean;
    };
    spell: SpellSource | null;

    usage: { value: string };
    stackGroup: AmmoStackGroup | null;
}

interface ConsumableSystemData
    extends Omit<
            ConsumableSystemSource,
            "bulk" | "hp" | "identification" | "material" | "price" | "temporary" | "usage"
        >,
        Omit<PhysicalSystemData, "traits"> {
    stackGroup: AmmoStackGroup | null;
}

export type { ConsumableCategory, ConsumableSource, ConsumableSystemData, ConsumableSystemSource, ConsumableTrait };
