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
import { ValueAndMax, ValueAndMaybeMax } from "@module/data.ts";
import { Alignment } from "./types.ts";

type ArmySource = BaseActorSourcePF2e<"army", ArmySystemSource>;

interface ArmySystemSource extends ActorSystemSource {
    ac: ArmyArmorClass;
    attributes: ArmyAttributesSource;
    details: ArmyDetailsSource;
    traits: ArmyTraitsSource;

    consumption: number;
    scouting: number;

    resources: ArmyResourcesSource;

    saves: {
        maneuver: number;
        morale: number;
    };

    weapons: {
        ranged: {
            name: string;
            potency: number;
        };
        melee: {
            name: string;
            potency: number;
        };
    };
}

interface ArmyArmorClass {
    value: number;
    potency: number;
}

interface ArmyTraitsSource extends Required<ActorTraitsSource<string>> {
    languages?: never;
    type: (typeof ARMY_TYPES)[number];
    senses?: never;
    alignment: Alignment;
}

interface ArmyDetailsSource extends Required<ActorDetailsSource> {
    strongSave: string;
    weakSave: string;
    description: string;
}

interface ArmySystemData extends Omit<ArmySystemSource, "attributes">, ActorSystemData {
    attributes: ArmyAttributes;
    traits: ArmyTraits;
    details: ArmyDetails;
    resources: ArmyResourcesData;
    saves: ArmySystemSource["saves"] & {
        strongSave: "maneuver" | "morale";
    };
}

interface ArmyAttributesSource extends ActorAttributesSource {
    perception?: never;
    immunities?: never;
    weaknesses?: never;
    resistances?: never;

    hp: ArmyHitPointsSource;
}

interface ArmyAttributes
    extends Omit<ArmyAttributesSource, "immunities" | "weaknesses" | "resistances" | "perception">,
        ActorAttributes {
    hp: ArmyHitPoints;
}

interface ArmyHitPointsSource extends Required<BaseHitPointsSource> {
    /** Typically half the army's hit points, armies that can't be feared have a threshold of 0 instead */
    routThreshold?: number;
}

interface ArmyHitPoints extends ArmyHitPointsSource, ActorHitPoints {
    negativeHealing: boolean;
    unrecoverable: number;
    routThreshold: number;
}

interface ArmyResourcesSource {
    /** How often this army can use ranged attacks */
    ammunition: ValueAndMax;
    potions: ValueAndMaybeMax;
}

interface ArmyResourcesData extends ArmyResourcesSource {
    potions: ValueAndMax;
}

interface ArmyTraits extends ArmyTraitsSource, ActorTraitsData<string> {
    size: ActorSizePF2e;
}

interface ArmyDetails extends ArmyDetailsSource, ActorDetails {}

export type { ArmySource, ArmySystemData };
