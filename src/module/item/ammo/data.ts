import type { ConsumableTrait } from "@item/consumable/types.ts";
import type {
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import type { AmmoType } from "./types.ts";

type AmmoSource = BasePhysicalItemSource<"ammo", AmmoSystemSource>;

interface AmmoTraits extends PhysicalItemTraits<ConsumableTrait> {}

interface AmmoSystemSource extends PhysicalSystemSource {
    apex?: never;
    traits: AmmoTraits;
    /** The selected category for this ammo. Usually empty for special ammo that is not owned */
    baseItem: AmmoType | null;
    uses: AmmoUses;
    /** All valid ammo categories. An empty array means any non-magazine. Null means that baseType is required */
    craftableAs: AmmoType[] | null;
    subitems?: never;
}

interface AmmoUses {
    value: number;
    max: number;
    /** Whether to delete the ammo upon use if it has no remaining uses and a quantity of 1 */
    autoDestroy: boolean;
}

interface AmmoSystemData
    extends Omit<AmmoSystemSource, SourceOmission>,
        Omit<PhysicalSystemData, "baseItem" | "subitems" | "traits"> {
    apex?: never;
}

type SourceOmission = "bulk" | "description" | "hp" | "identification" | "material" | "price" | "temporary" | "usage";

export type { AmmoSource, AmmoSystemData, AmmoSystemSource };
