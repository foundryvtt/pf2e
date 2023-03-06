import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { SpellSource } from "@item/spell/data";
import type { ConsumablePF2e } from ".";
import { ConsumableTrait, OtherConsumableTag } from "./types";

type ConsumableSource = BasePhysicalItemSource<"consumable", ConsumableSystemSource>;

interface ConsumableData
    extends Omit<ConsumableSource, "flags" | "system" | "type">,
        BasePhysicalItemData<ConsumablePF2e, "consumable", ConsumableSource> {}

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

export {
    ConsumableCategory,
    ConsumableData,
    ConsumableSource,
    ConsumableSystemData,
    ConsumableSystemSource,
    ConsumableTrait,
};
