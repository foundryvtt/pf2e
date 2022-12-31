import {
    ActorSystemData,
    ActorSystemSource,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    ActorTraitsData,
    ActorTraitsSource,
    GangUpCircumstance,
    ActorAttributesSource,
    ActorAttributes,
} from "@actor/data/base";
import { LootPF2e } from ".";

/** The stored source data of a loot actor */
type LootSource = BaseActorSourcePF2e<"loot", LootSystemSource>;

interface LootData
    extends Omit<LootSource, "data" | "system" | "effects" | "flags" | "items" | "prototypeToken" | "type">,
        BaseActorDataPF2e<LootPF2e, "loot", LootSystemData, LootSource> {}

/** The system-level data of loot actors. */
interface LootSystemSource extends ActorSystemSource {
    attributes: LootAttributesSource;
    details: LootDetailsSource;
    lootSheetType: "Merchant" | "Loot";
    hiddenWhenEmpty: boolean;
    traits: ActorTraitsSource<string>;
}

interface LootSystemData extends Omit<LootSystemSource, "attributes">, Omit<ActorSystemData, "attributes"> {
    attributes: LootAttributesData;

    details: LootDetailsData;

    traits: ActorTraitsData<string>;
}

interface LootAttributesSource extends ActorAttributesSource {
    hp?: never;
    ac?: never;
    immunities?: never;
    weaknesses?: never;
    resistances?: never;
}

interface LootAttributesData extends ActorAttributes {
    hp?: never;
    ac?: never;
    flanking: {
        canFlank: false;
        canGangUp: GangUpCircumstance[];
        flankable: false;
        flatFootable: false;
    };
}

interface LootDetailsSource {
    description: string;
    level: {
        value: number;
    };
}

interface LootDetailsData extends LootDetailsSource {
    alliance: null;
}

export { LootData, LootSource, LootSystemData, LootSystemSource };
