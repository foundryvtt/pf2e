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
    attributes: LootAttributesSource;
    details: LootDetailsSource;
    lootSheetType: "Merchant" | "Loot";
    hiddenWhenEmpty: boolean;
    traits: BaseTraitsSource;
}

interface LootSystemData extends LootSystemSource, Omit<ActorSystemData, "attributes"> {
    attributes: LootAttributesData;

    details: LootDetailsData;

    traits: BaseTraitsData;
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

interface LootAttributesSource {
    hp?: never;
    ac?: never;
}

interface LootAttributesData extends LootAttributesSource {
    flanking: {
        canFlank: false;
        canGangUp: GangUpCircumstance[];
        flankable: false;
        flatFootable: false;
    };
}

interface LootDetailsSource {
    description: {
        value: string;
    };
    level: {
        value: number;
    };
}

interface LootDetailsData extends LootDetailsSource {
    alliance: null;
}

export { LootData, LootSource, LootSystemData, LootSystemSource };
