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
        return ["action", "effect"];
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
            value: number;
            max: number;
            temp: number;
            details: string;
            negativeHealing: boolean;
        };

        ac: {
            value: number;
            details: string;
        };

        scouting: {
            value: number;
            details: string;
            darkvision: boolean;
        };
    };

    saves: {
        maneuver: number;
        morale: number;
        details: string;
    };

    details: {
        alliance: ActorAlliance;
        level: { value: number };
        alignment: Alignment;
        description: string;
        blurb: string;
        recruitmentDC: number;
        consumption: number;
    };

    gear: {
        potions: {
            name: "Healing Potions";
            traits: ["Army", "Consumable", "Healing", "Magical", "Necromancy", "Potion"];
            description: "An army equipped with healing potions (these rules are the same if you instead supply the army with alchemical healing elixirs) can use a single dose as part of any Maneuver action. When an army uses a dose of healing potions, it regains 1 HP. An army can be outfitted with up to 3 doses of healing potions at a time; unlike ranged Strike shots, healing potion doses do not automatically replenish after a war encounter—new doses must be purchased.";
            price: 15;
            unlocked: number;
        };
        armor: {
            magic: {
                name: "Magical Armor";
                traits: ["Abjuration", "Army", "Magical"];
                description: "Magic armor is magically enchanted to bolster the protection it affords to the soldiers.";
                rank: "Mundane Armor" | "Magic Armor" | "Greater Magic Armor" | "Major Magic Armor";
                level: 0 | 5 | 11 | 18;
                price: 0 | 25 | 50 | 75;
                bonus: number;
            };
        };
        melee: {
            unlocked: boolean;
            name: string;
            bonus: number;
            magic: {
                name: "Magic Weapons";
                traits: ["Army", "Evocation", "Magical"];
                description: "The army's weapons are magic. If the army has melee and ranged weapons, choose which one is made magic when this gear is purchased. You can buy this gear twice—once for melee weapons and once for ranged weapons. If you purchase a more powerful version, it replaces the previous version, and the RP cost of the more powerful version is reduced by the RP cost of the replaced weapons.";
                rank: "Mundane Weapons" | "Magic Weapons" | "Greater Magic Weapons" | "Major Magic Weapons";
                level: 0 | 2 | 10 | 16;
                price: 0 | 20 | 40 | 60;
                bonus: number;
            };
        };
        ranged: {
            unlocked: boolean;
            name: string;
            bonus: number;
            magic: {
                name: "Magic Weapons";
                traits: ["Army", "Evocation", "Magical"];
                description: "The army's weapons are magic. If the army has melee and ranged weapons, choose which one is made magic when this gear is purchased. You can buy this gear twice—once for melee weapons and once for ranged weapons. If you purchase a more powerful version, it replaces the previous version, and the RP cost of the more powerful version is reduced by the RP cost of the replaced weapons.";
                rank: "Mundane Weapons" | "Magic Weapons" | "Greater Magic Weapons" | "Major Magic Weapons";
                level: 0 | 2 | 10 | 16;
                price: 0 | 20 | 40 | 60;
                bonus: number;
            };
        };
    };

    conditions: {
        visibility: "clear" | "dim" | "dark";
        range: "engaged" | "near" | "distant";
        status: "OK" | "defeated" | "destroyed";
        position: "OK" | "outflanked" | "pinned";
        difficultterrain: boolean;
        wind: boolean;
        concealed: boolean;
        efficient: boolean;
        fortified: boolean;
        lost: boolean;
        mired: number;
        shaken: number;
        routed: boolean;
        weary: number;
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
