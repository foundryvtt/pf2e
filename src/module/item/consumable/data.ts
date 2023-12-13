import type {
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import type { SpellSource } from "@item/spell/data.ts";
import type { DamageKind, DamageType } from "@system/damage/index.ts";
import type { AmmoStackGroup, ConsumableCategory, ConsumableTrait, OtherConsumableTag } from "./types.ts";

type ConsumableSource = BasePhysicalItemSource<"consumable", ConsumableSystemSource>;

interface ConsumableTraits extends PhysicalItemTraits<ConsumableTrait> {
    otherTags: OtherConsumableTag[];
}

interface ConsumableSystemSource extends PhysicalSystemSource {
    traits: ConsumableTraits;
    category: ConsumableCategory;
    uses: ConsumableUses;
    /** A formula for a healing or damage roll */
    damage: ConsumableDamageHealing | null;
    spell: SpellSource | null;
    usage: { value: string };
    stackGroup: AmmoStackGroup | null;
}

type ConsumableUses = {
    value: number;
    max: number;
    /** Whether to delete the consumable upon use if it has no remaining uses and a quantity of 1 */
    autoDestroy: boolean;
};

type ConsumableDamageHealing = {
    formula: string;
    type: DamageType;
    kind: DamageKind;
};

interface ConsumableSystemData
    extends Omit<
            ConsumableSystemSource,
            "bulk" | "hp" | "identification" | "material" | "price" | "temporary" | "usage"
        >,
        Omit<PhysicalSystemData, "traits"> {
    stackGroup: AmmoStackGroup | null;
}

export type {
    ConsumableDamageHealing,
    ConsumableSource,
    ConsumableSystemData,
    ConsumableSystemSource,
    ConsumableTrait,
};
