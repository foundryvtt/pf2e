import { Rarity } from "@module/data";
import { ActorPF2e } from "./base";
import { ActorAttributes, ActorSystemData, ActorSystemSource, BaseActorSourcePF2e } from "./data/base";
import { ActorSizePF2e } from "./data/size";
import { ActorAlliance } from "./types";

class ArmyPF2e extends ActorPF2e {
    override get allowedItemTypes(): ["action", "melee"] {
        return ["action", "melee"];
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.system.traits.value = [];
        this.system.traits.size = new ActorSizePF2e({ value: "med" });
    }
}

interface ArmyPF2e extends ActorPF2e {
    _source: ArmySource;
    system: ArmySystemData;
}

type ArmySource = BaseActorSourcePF2e<"army", ArmySystemSource>;
interface ArmySystemSource extends ActorSystemSource {
    attributes: ArmyAttributesSource;

    details: {
        alliance?: ActorAlliance;
        level: { value: number };
    };

    traits: {
        rarity: Rarity;
        type: "infantry" | "cavalry" | "skirmishers" | "siege";
        value: never[];
    };
}

interface ArmyAttributesSource {
    hp: {
        value: number;
        max: number;
        temp: number;
        details: string;
        negativeHealing: boolean;
    };

    ac: {
        value: number;
    };

    immunities?: never;
    weaknesses?: never;
    resistances?: never;
}

interface ArmySystemData extends Omit<ArmySystemSource, "attributes">, Omit<ActorSystemData, "details" | "traits"> {
    attributes: ArmyAttributes;
    details: {
        alliance: ActorAlliance;
        level: { value: number };
    };
    traits: {
        rarity: Rarity;
        type: "infantry" | "cavalry" | "skirmishers" | "siege";
        size: ActorSizePF2e;
        value: never[];
    };
}

interface ArmyAttributes
    extends Omit<ArmyAttributesSource, "immunities" | "weaknesses" | "resistances">,
        Omit<ActorAttributes, "ac" | "hp"> {
    immunities: never[];
    weaknesses: never[];
    resistances: never[];
}

export { ArmyPF2e, ArmySource };
