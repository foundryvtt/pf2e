import { CharacterSheetPF2e } from "@actor/character/sheet.ts";
import { FamiliarSheetPF2e } from "@actor/familiar/sheet.ts";
import { HazardSheetPF2e } from "@actor/hazard/sheet.ts";
import { LootSheetPF2e } from "@actor/loot/sheet.ts";
import { NPCSheetPF2e, SimpleNPCSheet } from "@actor/npc/sheet.ts";
import { VehicleSheetPF2e } from "@actor/vehicle/sheet.ts";
import { ItemSheetPF2e } from "@item/sheet/base.ts";
import { ActionSheetPF2e } from "@item/action/sheet.ts";
import { AfflictionSheetPF2e } from "@item/affliction/sheet.ts";
import { AncestrySheetPF2e } from "@item/ancestry/sheet.ts";
import { ArmorSheetPF2e } from "@item/armor/sheet.ts";
import { BackgroundSheetPF2e } from "@item/background/sheet.ts";
import { BookSheetPF2e } from "@item/book/sheet.ts";
import { ClassSheetPF2e } from "@item/class/sheet.ts";
import { ConsumableSheetPF2e } from "@item/consumable/sheet.ts";
import { ContainerSheetPF2e } from "@item/container/sheet.ts";
import { DeitySheetPF2e } from "@item/deity/sheet.ts";
import { EffectSheetPF2e } from "@item/effect/sheet.ts";
import { EquipmentSheetPF2e } from "@item/equipment/sheet.ts";
import { FeatSheetPF2e } from "@item/feat/sheet.ts";
import { HeritageSheetPF2e } from "@item/heritage/sheet.ts";
import { KitSheetPF2e } from "@item/kit/sheet.ts";
import { MeleeSheetPF2e } from "@item/melee/sheet.ts";
import { PhysicalItemSheetPF2e } from "@item/physical/sheet.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { SpellSheetPF2e } from "@item/spell/index.ts";
import { TreasureSheetPF2e } from "@item/treasure/sheet.ts";
import { WeaponSheetPF2e } from "@item/weapon/sheet.ts";
import { JournalSheetPF2e, JournalTextTinyMCESheetPF2e } from "@module/journal-entry/sheet.ts";
import { UserConfigPF2e } from "@module/user/sheet.ts";
import { TokenConfigPF2e, TokenDocumentPF2e } from "@scene/index.ts";
import { SceneConfigPF2e } from "@scene/sheet.ts";
import { PartySheetPF2e } from "@actor/party/sheet.ts";

export function registerSheets(): void {
    const sheetLabel = game.i18n.localize("PF2E.SheetLabel");

    Scenes.registerSheet("pf2e", SceneConfigPF2e, { makeDefault: true });
    DocumentSheetConfig.registerSheet(TokenDocumentPF2e, "pf2e", TokenConfigPF2e, { makeDefault: true });

    // ACTORS
    Actors.unregisterSheet("core", ActorSheet);

    const localizeType = (type: string) => {
        const docType = type in CONFIG.PF2E.Actor.documentClasses ? "Actor" : "Item";
        return game.i18n.localize(`TYPES.${docType}.${type}`);
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

    // Register simple NPC sheet
    if (BUILD_MODE === "development") {
        Actors.registerSheet("pf2e", SimpleNPCSheet, {
            types: ["npc"],
            label: "PF2E.Actor.NPC.SimpleSheet",
            canBeDefault: false,
        });
    }

    // Register Hazard Sheet
    Actors.registerSheet("pf2e", HazardSheetPF2e, {
        types: ["hazard"],
        label: game.i18n.format(sheetLabel, { type: localizeType("hazard") }),
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

    // Register Party Sheet
    Actors.registerSheet("pf2e", PartySheetPF2e, {
        types: ["party"],
        label: game.i18n.format(sheetLabel, { type: localizeType("party") }),
        makeDefault: true,
    });

    // ITEMS
    Items.unregisterSheet("core", ItemSheet);

    const itemTypes = ["condition", "lore", "spellcastingEntry"];
    for (const itemType of itemTypes) {
        Items.registerSheet("pf2e", ItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    const sheetEntries = [
        ["action", ActionSheetPF2e],
        ["affliction", AfflictionSheetPF2e],
        ["ancestry", AncestrySheetPF2e],
        ["armor", ArmorSheetPF2e],
        ["background", BackgroundSheetPF2e],
        ["backpack", ContainerSheetPF2e],
        ["book", BookSheetPF2e],
        ["class", ClassSheetPF2e],
        ["consumable", ConsumableSheetPF2e],
        ["deity", DeitySheetPF2e],
        ["effect", EffectSheetPF2e],
        ["equipment", EquipmentSheetPF2e],
        ["feat", FeatSheetPF2e],
        ["heritage", HeritageSheetPF2e],
        ["kit", KitSheetPF2e],
        ["melee", MeleeSheetPF2e],
        ["spell", SpellSheetPF2e],
        ["treasure", TreasureSheetPF2e],
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

    // JOURNAL

    Journal.unregisterSheet("core", JournalSheet);
    Journal.registerSheet("pf2e", JournalSheetPF2e, {
        label: () =>
            game.i18n.format("SHEETS.DefaultDocumentSheet", { document: game.i18n.localize("DOCUMENT.JournalEntry") }),
        makeDefault: true,
    });

    // Replace the TinyMCE sheet with the version that'll let us inject themes
    DocumentSheetConfig.unregisterSheet(JournalEntryPage, "core", JournalTextTinyMCESheet);
    DocumentSheetConfig.registerSheet(JournalEntryPage, "pf2e", JournalTextTinyMCESheetPF2e, {
        types: ["text"],
        label: game.i18n.localize("EDITOR.TinyMCE"),
    });

    // User
    Users.unregisterSheet("core", UserConfig);
    Users.registerSheet("pf2e", UserConfigPF2e, {
        makeDefault: true,
        label: () => game.i18n.format("SHEETS.DefaultDocumentSheet", { document: game.i18n.localize("DOCUMENT.User") }),
    });
}
