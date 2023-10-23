// Army types

import { kingmakerTraits } from "@scripts/config/traits.ts";
const ARMY_TYPES = [
    kingmakerTraits.infantry,
    kingmakerTraits.cavalry,
    kingmakerTraits.siege,
    kingmakerTraits.skirmisher,
];

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

// Data for the gear equipment cards
function fetchArmyGearData(gearType: String): Object {
    const ARMY_GEAR_WEAPONS = {
        img: "",
        name: game.i18n.localize("PF2E.Warfare.Gear.Weapons.name"),
        level: game.i18n.localize("PF2E.Warfare.Gear.Weapons.level"),
        description: game.i18n.localize("PF2E.Warfare.Gear.Weapons.description"),
        traits: [
            {
                name: CONFIG.PF2E.kingmakerTraits.army,
                description: CONFIG.PF2E.traitsDescriptions.army,
            },
            {
                name: CONFIG.PF2E.weaponTraits.evocation,
                description: CONFIG.PF2E.traitsDescriptions.evocation,
            },
            {
                name: CONFIG.PF2E.weaponTraits.magical,
                description: CONFIG.PF2E.traitsDescriptions.magical,
            },
        ],
        ranks: [
            {
                name: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank1.name"),
                desc: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank1.desc"),
                price: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank1.price"),
                level: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank1.level"),
            },
            {
                name: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank2.name"),
                desc: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank2.desc"),
                price: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank2.price"),
                level: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank2.level"),
            },
            {
                name: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank3.name"),
                desc: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank3.desc"),
                price: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank3.price"),
                level: game.i18n.localize("PF2E.Warfare.Gear.Weapons.rank3.level"),
            },
        ],
    };

    const ARMY_GEAR_POTIONS = {
        img: "icons/consumables/potions/bottle-round-corked-orante-red.webp",
        name: game.i18n.localize("PF2E.Warfare.Gear.Potions.name"),
        level: game.i18n.localize("PF2E.Warfare.Gear.Potions.level"),
        description: game.i18n.localize("PF2E.Warfare.Gear.Potions.description"),
        price: game.i18n.localize("PF2E.Warfare.Gear.Potions.price"),
        traits: [
            {
                name: CONFIG.PF2E.kingmakerTraits.army,
                description: CONFIG.PF2E.traitsDescriptions.army,
            },
            {
                name: CONFIG.PF2E.consumableTraits.consumable,
                description: CONFIG.PF2E.traitsDescriptions.consumable,
            },
            {
                name: CONFIG.PF2E.consumableTraits.healing,
                description: CONFIG.PF2E.traitsDescriptions.magical,
            },
            {
                name: CONFIG.PF2E.consumableTraits.magical,
                description: CONFIG.PF2E.traitsDescriptions.magical,
            },
            {
                name: CONFIG.PF2E.consumableTraits.necromancy,
                description: CONFIG.PF2E.traitsDescriptions.necromancy,
            },
            {
                name: CONFIG.PF2E.consumableTraits.potion,
                description: CONFIG.PF2E.traitsDescriptions.potion,
            },
        ],
    };

    const ARMY_GEAR_ARMOR = {
        img: "icons/equipment/shield/heater-wooden-brown-axe.webp",
        name: game.i18n.localize("PF2E.Warfare.Gear.Armor.name"),
        level: game.i18n.localize("PF2E.Warfare.Gear.Armor.level"),
        description: game.i18n.localize("PF2E.Warfare.Gear.Armor.description"),
        ranks: [
            {
                name: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank1.name"),
                desc: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank1.desc"),
                price: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank1.price"),
                level: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank1.level"),
            },
            {
                name: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank2.name"),
                desc: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank2.desc"),
                price: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank2.price"),
                level: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank2.level"),
            },
            {
                name: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank3.name"),
                desc: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank3.desc"),
                price: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank3.price"),
                level: game.i18n.localize("PF2E.Warfare.Gear.Armor.rank3.level"),
            },
        ],
        traits: [
            {
                name: CONFIG.PF2E.armorTraits.abjuration,
                description: CONFIG.PF2E.traitsDescriptions.abjuration,
            },
            {
                name: CONFIG.PF2E.kingmakerTraits.army,
                description: CONFIG.PF2E.traitsDescriptions.army,
            },
            {
                name: CONFIG.PF2E.armorTraits.magical,
                description: CONFIG.PF2E.traitsDescriptions.magical,
            },
        ],
    };

    switch (gearType) {
        case "melee":
            ARMY_GEAR_WEAPONS.img = "icons/weapons/axes/axe-battle-black.webp";
            return ARMY_GEAR_WEAPONS;
        case "ranged":
            ARMY_GEAR_WEAPONS.img = "icons/weapons/crossbows/crossbow-simple-brown.webp";
            return ARMY_GEAR_WEAPONS;
        case "potions":
            return ARMY_GEAR_POTIONS;
        case "armor":
            return ARMY_GEAR_ARMOR;
        default:
            return {};
    }
}

export { ARMY_STATS, fetchArmyGearData, ARMY_TYPES };
