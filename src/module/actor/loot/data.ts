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
type LootSource = BaseActorSourcePF2e<"loot", LootSystemSource>;

interface LootData
    extends Omit<LootSource, "data" | "effects" | "flags" | "items" | "token" | "type">,
        BaseActorDataPF2e<LootPF2e, "loot", LootSystemData, LootSource> {}

/** The system-level data of loot actors. */
interface LootSystemSource extends ActorSystemSource {
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

type LootSystemData = Omit<ActorSystemData, "attributes"> &
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

export { LootData, LootSource, LootSystemData, LootSystemSource };
