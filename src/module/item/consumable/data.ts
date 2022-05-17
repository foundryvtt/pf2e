import {
    ActivatedEffectData,
    BasePhysicalItemData,
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { SpellSource } from "@item/spell/data";
import type { ConsumablePF2e } from ".";

type ConsumableSource = BasePhysicalItemSource<"consumable", ConsumableSystemSource>;

type ConsumableData = Omit<ConsumableSource, "data" | "effects" | "flags"> &
    BasePhysicalItemData<ConsumablePF2e, "consumable", ConsumableSystemData, ConsumableSource>;

type ConsumableType = keyof ConfigPF2e["PF2E"]["consumableTypes"];
type ConsumableTrait = keyof ConfigPF2e["PF2E"]["consumableTraits"];
type ConsumableTraits = PhysicalItemTraits<ConsumableTrait>;

interface ConsumableSystemSource extends PhysicalSystemSource, ActivatedEffectData {
    traits: ConsumableTraits;

    consumableType: {
        value: ConsumableType;
    };
    uses: {
        value: number;
        max: number;
        per: any;
        autoUse: boolean;
        autoDestroy: boolean;
    };
    charges: {
        value: number;
        max: number;
    };
    consume: {
        value: string;
        _deprecated: boolean;
    };
    autoUse: {
        value: boolean;
    };
    autoDestroy: {
        value: boolean;
        _deprecated: boolean;
    };
    spell: {
        data?: SpellSource | null;
        heightenedLevel?: number | null;
    };
}

type ConsumableSystemData = Omit<ConsumableSystemSource, "price"> &
    PhysicalSystemData & {
        equipped: {
            invested?: never;
        };
    };

export { ConsumableData, ConsumableSource, ConsumableTrait, ConsumableType };
