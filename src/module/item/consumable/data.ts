import {
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import { SpellSource } from "@item/spell/data.ts";
import type { ConsumableTrait, OtherConsumableTag } from "./types.ts";

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
        value: string;
    };
    autoDestroy: {
        value: boolean;
    };
    spell: SpellSource | null;
}

interface ConsumableSystemData
    extends Omit<ConsumableSystemSource, "identification" | "price" | "temporary" | "usage">,
        Omit<PhysicalSystemData, "traits"> {}

export { ConsumableCategory, ConsumableSource, ConsumableSystemData, ConsumableSystemSource, ConsumableTrait };
