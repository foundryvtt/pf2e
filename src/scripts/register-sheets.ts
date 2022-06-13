import { CharacterSheetPF2e } from "@actor/character/sheet";
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
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values";
import { WeaponSheetPF2e } from "@item/weapon/sheet";
import { EffectSheetPF2e } from "@item/effect/sheet";
import { BookSheetPF2e } from "@item/book/sheet";
import { DeitySheetPF2e } from "@item/deity/sheet";
import { ArmorSheetPF2e } from "@item/armor/sheet";
import { HeritageSheetPF2e } from "@item/heritage";
import { JournalSheetPF2e, JournalSheetStyledPF2e } from "@module/journal-entry/sheet";
import { SceneConfigPF2e } from "@scene/sheet";
import { TokenConfigPF2e, TokenDocumentPF2e } from "@scene";
import { HazardSheetGreenPF2e } from "@actor/hazard/sheet-new";

export function registerSheets() {
    const translations = LocalizePF2e.translations.PF2E;
    const sheetLabel = translations.SheetLabel;

    DocumentSheetConfig.unregisterSheet(JournalEntry, "core", JournalSheet);
    DocumentSheetConfig.registerSheet(JournalEntry, "pf2e", JournalSheetPF2e, {
        label: game.i18n.localize("PF2E.JournalEntry.FoundryTheme"),
    });

    DocumentSheetConfig.registerSheet(JournalEntry, "pf2e", JournalSheetStyledPF2e, {
        label: game.i18n.localize("PF2E.JournalEntry.PF2ETheme"),
        makeDefault: true,
    });

    DocumentSheetConfig.registerSheet(Scene, "pf2e", SceneConfigPF2e, { makeDefault: true });
    DocumentSheetConfig.registerSheet(TokenDocumentPF2e, "pf2e", TokenConfigPF2e, { makeDefault: true });

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

    // Regiser NPC Sheet
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

    // Register Beta Hazard Sheet
    Actors.registerSheet("pf2e", HazardSheetGreenPF2e, {
        types: ["hazard"],
        label: "Hazard Sheet (Beta)",
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

    const itemTypes = ["condition", "lore", "melee", "spellcastingEntry"];
    for (const itemType of itemTypes) {
        Items.registerSheet("pf2e", ItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    const sheetEntries = [
        ["action", ActionSheetPF2e],
        ["ancestry", AncestrySheetPF2e],
        ["armor", ArmorSheetPF2e],
        ["background", BackgroundSheetPF2e],
        ["book", BookSheetPF2e],
        ["class", ClassSheetPF2e],
        ["deity", DeitySheetPF2e],
        ["effect", EffectSheetPF2e],
        ["feat", FeatSheetPF2e],
        ["heritage", HeritageSheetPF2e],
        ["kit", KitSheetPF2e],
        ["spell", SpellSheetPF2e],
        ["weapon", WeaponSheetPF2e],
    ] as const;
    for (const [type, Sheet] of sheetEntries) {
        Items.registerSheet("pf2e", Sheet, {
            types: [type],
            label: game.i18n.format(sheetLabel, { type: localizeType(type) }),
            makeDefault: true,
        });
    }

    // Add any missing physical item sheets
    for (const itemType of PHYSICAL_ITEM_TYPES) {
        if (sheetEntries.some(([type, _sheet]) => itemType === type)) continue;
        Items.registerSheet("pf2e", PhysicalItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }
}
