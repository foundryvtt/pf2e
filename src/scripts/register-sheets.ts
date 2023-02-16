import { CharacterSheetPF2e } from "@actor/character/sheet";
import { FamiliarSheetPF2e } from "@actor/familiar/sheet";
import { HazardSheetPF2e } from "@actor/hazard/sheet";
import { LootSheetPF2e } from "@actor/loot/sheet";
import { NPCSheetPF2e } from "@actor/npc/sheet";
import { VehicleSheetPF2e } from "@actor/vehicle/sheet";
import {
    ActionSheetPF2e,
    AncestrySheetPF2e,
    ArmorSheetPF2e,
    BackgroundSheetPF2e,
    BookSheetPF2e,
    ClassSheetPF2e,
    ConsumableSheetPF2e,
    ContainerSheetPF2e,
    DeitySheetPF2e,
    EffectSheetPF2e,
    EquipmentSheetPF2e,
    FeatSheetPF2e,
    HeritageSheetPF2e,
    ItemSheetPF2e,
    KitSheetPF2e,
    MeleeSheetPF2e,
    PhysicalItemSheetPF2e,
    PHYSICAL_ITEM_TYPES,
    SpellSheetPF2e,
    TreasureSheetPF2e,
    WeaponSheetPF2e,
} from "@item";
import { AfflictionSheetPF2e } from "@item/affliction";
import { JournalSheetPF2e, JournalTextTinyMCESheetPF2e } from "@module/journal-entry/sheet";
import { UserPF2e } from "@module/user";
import { UserConfigPF2e } from "@module/user/sheet";
import { TokenConfigPF2e, TokenDocumentPF2e } from "@scene";
import { SceneConfigPF2e } from "@scene/sheet";
import { LocalizePF2e } from "@system/localize";

export function registerSheets() {
    const translations = LocalizePF2e.translations.PF2E;
    const sheetLabel = translations.SheetLabel;

    DocumentSheetConfig.unregisterSheet(JournalEntry, "core", JournalSheet);
    DocumentSheetConfig.registerSheet(JournalEntry, "pf2e", JournalSheetPF2e, {
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

    // User

    DocumentSheetConfig.unregisterSheet(User, "core", UserConfig);
    DocumentSheetConfig.registerSheet(UserPF2e, "pf2e", UserConfigPF2e, {
        makeDefault: true,
        label: () => game.i18n.format("SHEETS.DefaultDocumentSheet", { document: game.i18n.localize("DOCUMENT.User") }),
    });
}
