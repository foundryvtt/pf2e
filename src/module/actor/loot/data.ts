import {
    ActorAttributes,
    ActorAttributesSource,
    ActorDetails,
    ActorSystemData,
    ActorSystemSource,
    BaseActorSourcePF2e,
} from "@actor/data/base.ts";

/** The stored source data of a loot actor */
type LootSource = BaseActorSourcePF2e<"loot", LootSystemSource>;

/** The system-level data of loot actors. */
interface LootSystemSource extends ActorSystemSource {
    attributes: LootAttributesSource;
    details: LootDetailsSource;
    lootSheetType: "Merchant" | "Loot";
    hiddenWhenEmpty: boolean;
    traits?: never;
}

interface LootSystemData extends Omit<LootSystemSource, "attributes" | "details">, ActorSystemData {
    attributes: LootAttributes;
    details: LootDetails;
    traits?: never;
}

interface LootAttributesSource extends ActorAttributesSource {
    hp?: never;
    ac?: never;
    perception?: never;
    immunities?: never;
    weaknesses?: never;
    resistances?: never;
}

interface LootAttributes
    extends Omit<LootAttributesSource, "immunities" | "weaknesses" | "resistances">,
        Omit<ActorAttributes, "perception" | "hp" | "ac"> {
    initiative?: never;
}

interface LootDetailsSource {
    alliance?: never;
    description: string;
    level: {
        value: number;
    };
}

interface LootDetails extends Omit<LootDetailsSource, "alliance">, ActorDetails {
    alliance: null;
}

export type { LootSource, LootSystemData, LootSystemSource };
