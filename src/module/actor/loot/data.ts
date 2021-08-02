import { ActorSystemData, BaseActorDataPF2e, BaseActorSourcePF2e } from "@actor/data/base";
import { LootPF2e } from ".";

/** The stored source data of a loot actor */
export type LootSource = BaseActorSourcePF2e<"loot", LootSystemData>;

export class LootData extends BaseActorDataPF2e<LootPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/loot.svg";
}

/** Wrapper type for loot-specific data. */
export interface LootData extends Omit<LootSource, "effects" | "items" | "token"> {
    type: LootSource["type"];
    data: LootSource["data"];
    readonly _source: LootSource;
}

/** The system-level data of loot actors. */
export interface LootSystemData extends ActorSystemData {
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
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}
