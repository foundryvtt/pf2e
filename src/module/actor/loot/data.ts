import {
    ActorSystemData,
    ActorSystemSource,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseTraitsData,
    BaseTraitsSource,
} from "@actor/data/base";
import { LootPF2e } from ".";

/** The stored source data of a loot actor */
export type LootSource = BaseActorSourcePF2e<"loot", LootSystemSource>;

export class LootData extends BaseActorDataPF2e<LootPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/loot.svg";
}

/** Wrapper type for loot-specific data. */
export interface LootData extends Omit<LootSource, "effects" | "flags" | "items" | "token"> {
    type: LootSource["type"];
    data: LootSystemData;
    readonly _source: LootSource;
}

/** The system-level data of loot actors. */
export interface LootSystemSource extends ActorSystemSource {
    attributes: {
        hp?: never;
    };
    details: {
        description: {
            value: string;
        };
        level: {
            value: number;
        };
    };
    lootSheetType: "Merchant" | "Loot";
    hiddenWhenEmpty: boolean;
    traits: BaseTraitsSource;
}

export interface LootSystemData extends Omit<ActorSystemData, "attributes">, LootSystemSource {
    traits: BaseTraitsData;
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}
