import {
    ActorSystemData,
    ActorSystemSource,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseTraitsData,
    BaseTraitsSource,
    GangUpCircumstance,
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
        ac?: never;
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

export type LootSystemData = Omit<ActorSystemData, "attributes"> &
    LootSystemSource & {
        attributes: {
            flanking: {
                canFlank: false;
                canGangUp: GangUpCircumstance[];
                flankable: false;
                flatFootable: false;
            };
        };

        traits: BaseTraitsData;
        // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
        [key: string]: any;
    };
