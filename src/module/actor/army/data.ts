import { Alignment } from "@actor/creature/index.ts";
import {
    ActorAttributes,
    ActorAttributesSource,
    ActorDetails,
    ActorDetailsSource,
    ActorHitPoints,
    ActorSystemData,
    ActorSystemSource,
    ActorTraitsData,
    ActorTraitsSource,
    BaseActorSourcePF2e,
    BaseHitPointsSource,
} from "@actor/data/base.ts";
import { ARMY_TYPES } from "./values.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";

type ArmySource = BaseActorSourcePF2e<"army", ArmySystemSource>;

interface ArmySystemSource extends ActorSystemSource {
    attributes: ArmyAttributesSource;
    traits: ArmyTraitsSource;
    details: ArmyDetailsSource;

    weapons: {
        bonus: number;
        ranged: {
            name: string;
            unlocked: boolean;
            potency: number;
        };
        melee: {
            name: string;
            unlocked: boolean;
            potency: number;
        };
        ammunition: {
            value: number;
            max: number;
        };
    };
}

interface ArmyAttributesSource extends ActorAttributesSource {
    perception?: never;
    immunities?: never;
    weaknesses?: never;
    resistances?: never;

    hp: ArmyHitPointsSource;

    ac: ArmyArmorClass;

    scouting: { bonus: number };
    maneuver: { bonus: number };
    morale: { bonus: number };

    standardDC: number;
    maxTactics: number;
    consumption: number;
}

interface ArmyHitPointsSource extends Required<BaseHitPointsSource> {
    routThreshold: number;
    potions: number;
}

interface ArmyArmorClass {
    value: number;
    potency: number;
    details: string;
}

interface ArmyTraitsSource extends Required<ActorTraitsSource<string>> {
    languages?: never;
    type: typeof ARMY_TYPES;
    senses?: never;
}

interface ArmyDetailsSource extends Required<ActorDetailsSource> {
    strongSave: string;
    weakSave: string;
    editLock: boolean;
    alignment: Alignment;
    description: string;
    blurb: string;
}

interface ArmySystemData extends Omit<ArmySystemSource, "attributes">, ActorSystemData {
    attributes: ArmyAttributes;
    traits: ArmyTraits;
    details: ArmyDetails;
}

interface ArmyAttributes extends Omit<ArmyAttributesSource, AttributeSourceOmission>, ActorAttributes {
    hp: ArmyHitPoints;
    ac: ArmyArmorClass;

    perception?: never;
    immunities: never[];
    weaknesses: never[];
    resistances: never[];
}
type AttributeSourceOmission = "immunities" | "weaknesses" | "resistances";

interface ArmyHitPoints extends ArmyHitPointsSource, ActorHitPoints {
    negativeHealing: boolean;
    unrecoverable: number;
}

interface ArmyTraits extends ArmyTraitsSource, ActorTraitsData<string> {
    size: ActorSizePF2e;
}

interface ArmyDetails extends ArmyDetailsSource, ActorDetails {}

export type { ArmySource, ArmySystemData };
