import { ActorSystemSource, BaseActorSourcePF2e } from "@actor/data/base.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { Rarity } from "@module/data.ts";
import { ActorAlliance } from "@actor/types.ts";
import { Alignment } from "@actor/creature/index.ts";
import { ActorPF2e, HitPointsSummary } from "../base.ts";
import { ItemType } from "@item/data/index.ts";
import { armyTraits } from "@scripts/config/traits.ts";

class ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    override get allowedItemTypes(): (ItemType | "physical")[] {
        return ["action", "feat", "effect"];
    }
}

interface ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    _source: ArmySource;
    system: ArmySystemSource;

    get hitPoints(): HitPointsSummary;
}

type ArmySource = BaseActorSourcePF2e<"army", ArmySystemSource>;

interface ArmySystemSource extends ActorSystemSource {
    attributes: {
        immunities: never;
        weaknesses: never;
        resistances: never;
        perception?: never;
        initiative?: never;
        shield?: never;
        flanking: {
            canFlank: never;
            canGangUp: never;
            flankable: never;
            flatFootable: never;
        };

        hp: {
            negativeHealing: boolean;
            unrecoverable: number;
            value: number;
            max: number;
            temp: number;
            details: string;
            routThreshold: number;
            potions: number;
        };

        ac: {
            value: number;
            potency: number;
            details: string;
        };

        scouting: { bonus: number };
        maneuver: { bonus: number };
        morale: { bonus: number };

        standardDC: number;
        maxTactics: number;
        consumption: number;
    };

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

    details: {
        alliance: ActorAlliance;
        strongSave: string;
        weakSave: string;
        editLock: boolean;
        level: { value: number };
        alignment: Alignment;
        description: string;
        blurb: string;
    };

    traits: {
        rarity: Rarity;
        type: typeof armyTraits;
        size: ActorSizePF2e;
        value: never[];
    };

    tokenEffects: [];
    autoChanges: {};
}

export { ArmyPF2e, ArmySource };
