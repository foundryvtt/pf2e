const ALIGNMENTS = new Set(["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"] as const);

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

// Data for the gear equipment cards
function fetchArmyGearData(gearType: String): Object {
    switch (gearType) {
        case "melee":
        case "ranged":
            return {
                img:
                    gearType === "melee"
                        ? "icons/weapons/axes/axe-battle-black.webp"
                        : "icons/weapons/crossbows/crossbow-simple-brown.webp",
                name: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Weapons.name"),
                description: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Weapons.description"),
                traits: ["army", "magical"],
                level: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Weapons.level"),
                ranks: [
                    { price: 20, level: 2 },
                    { price: 40, level: 10 },
                    { price: 60, level: 16 },
                ],
            };
        case "potions":
            return {
                img: "icons/consumables/potions/bottle-round-corked-orante-red.webp",
                name: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Potions.name"),
                description: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Potions.description"),
                traits: ["army", "consumable", "healing", "magical", "potion"],
                level: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Potions.level"),
                price: 15,
            };
        case "armor":
            return {
                img: "icons/equipment/shield/heater-wooden-brown-axe.webp",
                name: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Armor.name"),
                description: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Armor.description"),
                traits: ["army", "magical"],
                level: game.i18n.localize("PF2E.Kingmaker.Army.Gear.Armor.level"),
                ranks: [
                    { price: 25, level: 5 },
                    { price: 50, level: 11 },
                    { price: 75, level: 18 },
                ],
            };
        default:
            return {};
    }
}

export { ALIGNMENTS, ARMY_STATS, fetchArmyGearData, ARMY_TYPES };
