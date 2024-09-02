import type { ActionTrait } from "@item/ability/types.ts";
import type { KingmakerTrait } from "@item/campaign-feature/types.ts";
import * as R from "remeda";

const BASIC_WAR_ACTIONS_FOLDER = "Vqp8b64uH35zkncy";

const ARMY_TYPES = ["infantry", "cavalry", "siege", "skirmisher"] as const;

// Default stat arrays
const ARMY_STATS = {
    scouting: [0, 7, 8, 9, 11, 12, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 28, 29, 30, 32, 33],
    standardDC: [0, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40],
    ac: [0, 16, 18, 19, 21, 22, 24, 25, 27, 28, 30, 31, 33, 34, 36, 37, 39, 40, 42, 43, 45],
    strongSave: [0, 10, 11, 12, 14, 15, 17, 18, 19, 21, 22, 24, 25, 26, 28, 29, 30, 32, 33, 35, 36],
    weakSave: [0, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23, 25, 26, 27, 29, 30],
    attack: [0, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24, 26, 27, 29, 30, 32, 33, 35, 36, 38],
    maxTactics: [0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6],
};

interface ArmyGearData {
    img: string;
    name: string;
    traits: (KingmakerTrait | ActionTrait)[];
    description: string;
    price?: number;
    level?: number;
    ranks?: {
        name: string;
        description: string;
        price: number;
        level: number;
    }[];
}

type ArmyGearType = "melee" | "ranged" | "additional-melee" | "additional-ranged" | "potions" | "armor";

// Data for the gear equipment cards
function getArmyGearData(): Record<ArmyGearType, ArmyGearData> {
    return {
        // Additional melee/ranged weapon
        ...R.mapToObj(["melee", "ranged"] as const, (type) => [
            `additional-${type}`,
            {
                img:
                    type === "melee"
                        ? "icons/weapons/axes/axe-battle-black.webp"
                        : "icons/weapons/crossbows/crossbow-simple-brown.webp",
                name: game.i18n.format("PF2E.Kingmaker.Army.Gear.AdditionalWeapon.Name", {
                    type: game.i18n.format(`PF2E.Kingmaker.Army.Strikes.${type}`),
                }),
                description: "PF2E.Kingmaker.Army.Gear.AdditionalWeapon.Description",
                traits: ["army"],
                level: 1,
                price: 10,
            },
        ]),
        // Magic melee/ranged weapons
        ...R.mapToObj(["melee", "ranged"] as const, (type) => [
            type,
            {
                img:
                    type === "melee"
                        ? "icons/weapons/axes/axe-battle-black.webp"
                        : "icons/weapons/crossbows/crossbow-simple-brown.webp",
                name: game.i18n.format("PF2E.Kingmaker.Army.Gear.MagicWeapons.Name", {
                    type: game.i18n.format(`PF2E.Kingmaker.Army.Strikes.${type}`),
                }),
                description: "PF2E.Kingmaker.Army.Gear.MagicWeapons.Description",
                traits: ["army", "magical"],
                ranks: [
                    { price: 20, level: 2 },
                    { price: 40, level: 10 },
                    { price: 60, level: 16 },
                ].map((d, idx) => ({
                    ...d,
                    name: `PF2E.Kingmaker.Army.Gear.MagicWeapons.rank${idx + 1}.Name`,
                    description: `PF2E.Kingmaker.Army.Gear.MagicWeapons.rank${idx + 1}.Description`,
                })),
            },
        ]),
        potions: {
            img: "icons/consumables/potions/bottle-round-corked-orante-red.webp",
            name: "PF2E.Kingmaker.Army.Gear.Potions.Name",
            description: "PF2E.Kingmaker.Army.Gear.Potions.Description",
            traits: ["army", "consumable", "healing", "magical", "potion"],
            level: 1,
            price: 15,
        },
        armor: {
            img: "icons/equipment/shield/heater-wooden-brown-axe.webp",
            name: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Armor.Name"),
            description: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Armor.Description"),
            traits: ["army", "magical"],
            ranks: [
                { price: 25, level: 5 },
                { price: 50, level: 11 },
                { price: 75, level: 18 },
            ].map((d, idx) => ({
                ...d,
                name: `PF2E.Kingmaker.Army.Gear.Armor.rank${idx + 1}.Name`,
                description: `PF2E.Kingmaker.Army.Gear.Armor.rank${idx + 1}.Description`,
            })),
        },
    };
}

export { ARMY_STATS, ARMY_TYPES, BASIC_WAR_ACTIONS_FOLDER, getArmyGearData };
