import { CharacterSheetPF2e } from "@actor/character/sheet";
import { NPCLegacySheetPF2e } from "@actor/npc/legacy-sheet";
import { ActionSheetPF2e } from "@item/action/sheet";
import { HazardSheetPF2e } from "@actor/hazard/sheet";
import { LootSheetPF2e } from "@actor/loot/sheet";
import { FamiliarSheetPF2e } from "@actor/familiar/sheet";
import { VehicleSheetPF2e } from "@actor/vehicle/sheet";
import { NPCSheetPF2e } from "@actor/npc/sheet";
import { ItemSheetPF2e } from "@item/sheet/base";
import { KitSheetPF2e } from "@item/kit/sheet";
import { AncestrySheetPF2e } from "@item/ancestry/sheet";
import { BackgroundSheetPF2e } from "@item/background/sheet";
import { ClassSheetPF2e } from "@item/class/sheet";
import { SpellSheetPF2e } from "@item/spell/sheet";
import { LocalizePF2e } from "@system/localize";
import { PhysicalItemSheetPF2e } from "@item/physical/sheet";
import { FeatSheetPF2e } from "@item/feat/sheet";
import { PHYSICAL_ITEM_TYPES } from "@item/data/values";
import { WeaponSheetPF2e } from "@item/weapon/sheet";
import { EffectSheetPF2e } from "@item/effect/sheet";
import { BookSheetPF2e } from "@item/book/sheet";
import { DeitySheetPF2e } from "@item/deity/sheet";

export function registerSheets() {
    const translations = LocalizePF2e.translations.PF2E;
    const sheetLabel = translations.SheetLabel;
    const sheetLabelOld = translations.SheetLabelOld;

    // ACTORS
    Actors.unregisterSheet("core", ActorSheet);

    const localizeType = (type: string) => {
        const entityType = type in CONFIG.PF2E.Actor.documentClasses ? "ACTOR" : "ITEM";
        const camelized = type[0].toUpperCase() + type.slice(1).toLowerCase();
        return game.i18n.localize(`${entityType}.Type${camelized}`);
    };

    Actors.registerSheet("pf2e", CharacterSheetPF2e, {
        types: ["character"],
        label: game.i18n.format(sheetLabel, { type: localizeType("character") }),
        makeDefault: true,
    });

    // Register NPC Sheet
    Actors.registerSheet("pf2e", NPCLegacySheetPF2e, {
        types: ["npc"],
        label: game.i18n.format(sheetLabelOld, { type: localizeType("npc") }),
        makeDefault: false,
    });

    // Regiser NEW NPC Sheet (don't make it default, it's on testing phase)
    Actors.registerSheet("pf2e", NPCSheetPF2e, {
        types: ["npc"],
        label: game.i18n.format(sheetLabel, { type: localizeType("npc") }),
        makeDefault: true,
    });

    // Register Hazard Sheet
    Actors.registerSheet("pf2e", HazardSheetPF2e, {
        types: ["hazard"],
        label: game.i18n.format(sheetLabel, { type: localizeType("hazard") }),
        makeDefault: true,
    });

    // Register Loot Sheet
    Actors.registerSheet("pf2e", LootSheetPF2e, {
        types: ["loot"],
        label: game.i18n.format(sheetLabel, { type: localizeType("loot") }),
        makeDefault: true,
    });

    // Register Familiar Sheet
    Actors.registerSheet("pf2e", FamiliarSheetPF2e, {
        types: ["familiar"],
        label: game.i18n.format(sheetLabel, { type: localizeType("familiar") }),
        makeDefault: true,
    });

    // Register Vehicle Sheet
    Actors.registerSheet("pf2e", VehicleSheetPF2e, {
        types: ["vehicle"],
        label: game.i18n.format(sheetLabel, { type: localizeType("vehicle") }),
        makeDefault: true,
    });

    // ITEMS
    Items.unregisterSheet("core", ItemSheet);

    const itemTypes = ["condition", "lore", "martial", "melee", "spellcastingEntry"];
    for (const itemType of itemTypes) {
        Items.registerSheet("pf2e", ItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    for (const itemType of PHYSICAL_ITEM_TYPES) {
        if (["book", "weapon"].includes(itemType)) continue;
        Items.registerSheet("pf2e", PhysicalItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    const sheetEntries = [
        ["action", ActionSheetPF2e],
        ["ancestry", AncestrySheetPF2e],
        ["background", BackgroundSheetPF2e],
        ["book", BookSheetPF2e],
        ["class", ClassSheetPF2e],
        ["deity", DeitySheetPF2e],
        ["feat", FeatSheetPF2e],
        ["effect", EffectSheetPF2e],
        ["spell", SpellSheetPF2e],
        ["kit", KitSheetPF2e],
        ["weapon", WeaponSheetPF2e],
    ] as const;
    for (const [type, Sheet] of sheetEntries) {
        Items.registerSheet("pf2e", Sheet, {
            types: [type],
            label: game.i18n.format(sheetLabel, { type: localizeType(type) }),
            makeDefault: true,
        });
    }
}
