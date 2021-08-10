import {
    ActivatedEffectData,
    BasePhysicalItemData,
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
} from "@item/physical/data";
import { SpellSource } from "@item/spell/data";
import type { ConsumablePF2e } from ".";

export type ConsumableSource = BasePhysicalItemSource<"consumable", ConsumableSystemData>;

export class ConsumableData extends BasePhysicalItemData<ConsumablePF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/consumable.svg";
}

export interface ConsumableData extends Omit<ConsumableSource, "_id" | "effects"> {
    type: ConsumableSource["type"];
    data: ConsumableSource["data"];
    readonly _source: ConsumableSource;
}

export type ConsumableType = keyof ConfigPF2e["PF2E"]["consumableTypes"];
export type ConsumableTrait = keyof ConfigPF2e["PF2E"]["consumableTraits"];
type ConsumableTraits = PhysicalItemTraits<ConsumableTrait>;

export interface ConsumableSystemData extends PhysicalSystemData, ActivatedEffectData {
    traits: ConsumableTraits;

    consumableType: {
        value: ConsumableType;
    };
    uses: {
        value: number;
        max: number;
        per: null | "day";
        autoDestroy: boolean;
    };
    /** Used to roll the result of consumption */
    consume: {
        value: string;
    };
    spell: {
        data?: SpellSource | null;
        heightenedLevel?: number | null;
    };
}
