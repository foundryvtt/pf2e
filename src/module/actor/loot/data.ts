import {
    ActorSystemData,
    ActorSystemSource,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
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
    traits?: never;
}

interface LootSystemData extends LootSystemSource, ActorSystemData {
    attributes: LootAttributesData;
    details: LootDetailsData;
    traits?: never;
}

interface LootAttributesSource extends ActorAttributesSource {
    hp?: never;
    ac?: never;
    immunities: never[];
    weaknesses: never[];
    resistances: never[];
}

type LootAttributesData = LootAttributesSource & ActorAttributes;

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
