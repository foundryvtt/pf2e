import type { OneToTen } from "@module/data.ts";

type SpellRankUuids = Record<OneToTen, string | null>;

interface SpellConsumableCategory {
    name: string;
    nameTemplate: string;
    compendiumUuids: SpellRankUuids;
    /** If true, only offered when the spell is a cantrip, and the spell isn't embedded into the created item. */
    cantripsOnly?: boolean;
}

type Pf2eSpellConsumables = {
    scroll: SpellConsumableCategory;
    wand: SpellConsumableCategory;
    cantripDeck5: SpellConsumableCategory;
};
type Sf2eSpellConsumables = {
    "spell-gem": SpellConsumableCategory;
};

interface SpellConsumablesBySystem {
    pf2e: Pf2eSpellConsumables;
    sf2e: Sf2eSpellConsumables;
}

/** Spell consumable categories with all keys optional. The system fills its own, modules may fill the rest. */
type SpellConsumableEntries = Partial<Pf2eSpellConsumables & Sf2eSpellConsumables>;

const SPELL_CONSUMABLES_BY_SYSTEM: Record<SystemId, SpellConsumableEntries> = {
    pf2e: {
        scroll: {
            name: "PF2E.Item.Consumable.Category.scroll",
            nameTemplate: "PF2E.Item.Physical.FromSpell.Scroll",
            compendiumUuids: {
                1: "Compendium.pf2e.equipment-srd.Item.RjuupS9xyXDLgyIr",
                2: "Compendium.pf2e.equipment-srd.Item.Y7UD64foDbDMV9sx",
                3: "Compendium.pf2e.equipment-srd.Item.ZmefGBXGJF3CFDbn",
                4: "Compendium.pf2e.equipment-srd.Item.QSQZJ5BC3DeHv153",
                5: "Compendium.pf2e.equipment-srd.Item.tjLvRWklAylFhBHQ",
                6: "Compendium.pf2e.equipment-srd.Item.4sGIy77COooxhQuC",
                7: "Compendium.pf2e.equipment-srd.Item.fomEZZ4MxVVK3uVu",
                8: "Compendium.pf2e.equipment-srd.Item.iPki3yuoucnj7bIt",
                9: "Compendium.pf2e.equipment-srd.Item.cFHomF3tty8Wi1e5",
                10: "Compendium.pf2e.equipment-srd.Item.o1XIHJ4MJyroAHfF",
            },
        },
        wand: {
            name: "PF2E.Item.Consumable.Category.wand",
            nameTemplate: "PF2E.Item.Physical.FromSpell.Wand",
            compendiumUuids: {
                1: "Compendium.pf2e.equipment-srd.Item.UJWiN0K3jqVjxvKk",
                2: "Compendium.pf2e.equipment-srd.Item.vJZ49cgi8szuQXAD",
                3: "Compendium.pf2e.equipment-srd.Item.wrDmWkGxmwzYtfiA",
                4: "Compendium.pf2e.equipment-srd.Item.Sn7v9SsbEDMUIwrO",
                5: "Compendium.pf2e.equipment-srd.Item.5BF7zMnrPYzyigCs",
                6: "Compendium.pf2e.equipment-srd.Item.kiXh4SUWKr166ZeM",
                7: "Compendium.pf2e.equipment-srd.Item.nmXPj9zuMRQBNT60",
                8: "Compendium.pf2e.equipment-srd.Item.Qs8RgNH6thRPv2jt",
                9: "Compendium.pf2e.equipment-srd.Item.Fgv722039TVM5JTc",
                10: null,
            },
        },
        cantripDeck5: {
            name: "PF2E.SpellcastingItemCreator.CantripDeck5",
            nameTemplate: "PF2E.Item.Physical.FromSpell.CantripDeck5",
            compendiumUuids: {
                1: "Compendium.pf2e.equipment-srd.Item.tLa4bewBhyqzi6Ow",
                2: null,
                3: null,
                4: null,
                5: null,
                6: null,
                7: null,
                8: null,
                9: null,
                10: null,
            },
            cantripsOnly: true,
        },
    },
    sf2e: {
        "spell-gem": {
            name: "PF2E.Item.Consumable.Category.spell-gem",
            nameTemplate: "PF2E.Item.Physical.FromSpell.spell-gem",
            compendiumUuids: {
                1: "Compendium.sf2e.equipment.Item.R6LuVXimv1Hh8ehE",
                2: "Compendium.sf2e.equipment.Item.p5DYjh3sCSjzrBBg",
                3: "Compendium.sf2e.equipment.Item.Nwl7YydQ0r8cAhw7",
                4: "Compendium.sf2e.equipment.Item.88IBM9viOjJ0kJbm",
                5: "Compendium.sf2e.equipment.Item.BVCQFla90m2JDepV",
                6: "Compendium.sf2e.equipment.Item.9PAmdF8UqVQKXWPA",
                7: "Compendium.sf2e.equipment.Item.JgvLQeWK45OxFrx0",
                8: "Compendium.sf2e.equipment.Item.Vt6VVUXFf1boNs3P",
                9: "Compendium.sf2e.equipment.Item.8nNTrkf4ZCqkApNT",
                10: "Compendium.sf2e.equipment.Item.ulNSlan9Q5j1ozPI",
            },
        },
    },
} as const satisfies SpellConsumablesBySystem;

export { SPELL_CONSUMABLES_BY_SYSTEM };
export type { SpellConsumableCategory, SpellConsumableEntries, SpellRankUuids };
