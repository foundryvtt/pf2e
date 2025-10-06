import type {
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import type { SpellSource } from "@item/spell/data.ts";
import type { DamageKind, DamageType } from "@system/damage/index.ts";
import type {
    AmmoBehavior,
    AmmoCategory,
    AmmoType,
    ConsumableCategory,
    ConsumableTrait,
    OtherConsumableTag,
} from "./types.ts";

type ConsumableSource = BasePhysicalItemSource<"consumable", ConsumableSystemSource>;

interface ConsumableTraits extends PhysicalItemTraits<ConsumableTrait> {
    otherTags: OtherConsumableTag[];
}

interface ConsumableSystemSource extends PhysicalSystemSource {
    apex?: never;
    traits: ConsumableTraits;
    category: ConsumableCategory;
    /** If this consumable is ammo, describes its data */
    ammo: ConsumableAmmoSource | null;
    uses: ConsumableUses;
    /** A formula for a healing or damage roll */
    damage: ConsumableDamageHealing | null;
    spell: SpellSource | null;
    usage: { value: string };
    subitems?: never;
}

interface ConsumableAmmoSource {
    /** All valid ammo categories. An empty array means any non-magazine. Null means that baseType is required */
    categories: AmmoCategory[] | null;
    /** The selected category for this ammo. Usually empty for special ammo that is not owned */
    baseType: AmmoType | null;
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
    extends Omit<ConsumableSystemSource, SourceOmission>,
        Omit<PhysicalSystemData, "subitems" | "traits"> {
    apex?: never;
    ammo: ConsumableAmmoData | null;
}

interface ConsumableAmmoData extends ConsumableAmmoSource {
    behavior: AmmoBehavior;
}

type SourceOmission = "bulk" | "description" | "hp" | "identification" | "material" | "price" | "temporary" | "usage";

export type {
    ConsumableDamageHealing,
    ConsumableSource,
    ConsumableSystemData,
    ConsumableSystemSource,
    ConsumableTrait,
};
