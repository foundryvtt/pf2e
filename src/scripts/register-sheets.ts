import { ArmySheetPF2e } from "@actor/army/sheet.ts";
import { CharacterSheetPF2e } from "@actor/character/sheet.ts";
import { FamiliarSheetPF2e } from "@actor/familiar/sheet.ts";
import { HazardSheetPF2e } from "@actor/hazard/sheet.ts";
import { LootSheetPF2e } from "@actor/loot/sheet.ts";
import { NPCSheetPF2e, SimpleNPCSheet } from "@actor/npc/sheet.ts";
import { PartySheetPF2e } from "@actor/party/sheet.ts";
import { VehicleSheetPF2e } from "@actor/vehicle/sheet.ts";
import { AbilitySheetPF2e } from "@item/ability/sheet.ts";
import { AfflictionSheetPF2e } from "@item/affliction/sheet.ts";
import { AmmoSheetPF2e } from "@item/ammo/sheet.ts";
import { AncestrySheetPF2e } from "@item/ancestry/sheet.ts";
import { ArmorSheetPF2e } from "@item/armor/sheet.ts";
import { BackgroundSheetPF2e } from "@item/background/sheet.ts";
import { ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { BookSheetPF2e } from "@item/book/sheet.ts";
import { CampaignFeatureSheetPF2e } from "@item/campaign-feature/sheet.ts";
import { ClassSheetPF2e } from "@item/class/sheet.ts";
import { ConditionSheetPF2e } from "@item/condition/sheet.ts";
import { ConsumableSheetPF2e } from "@item/consumable/sheet.ts";
import { ContainerSheetPF2e } from "@item/container/sheet.ts";
import { DeitySheetPF2e } from "@item/deity/sheet.ts";
import { EffectSheetPF2e } from "@item/effect/sheet.ts";
import { EquipmentSheetPF2e } from "@item/equipment/sheet.ts";
import { FeatSheetPF2e } from "@item/feat/sheet.ts";
import { HeritageSheetPF2e } from "@item/heritage/sheet.ts";
import { KitSheetPF2e } from "@item/kit/sheet.ts";
import { LoreSheetPF2e } from "@item/lore.ts";
import { MeleeSheetPF2e } from "@item/melee/sheet.ts";
import { PhysicalItemSheetPF2e } from "@item/physical/sheet.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { ShieldSheetPF2e } from "@item/shield/sheet.ts";
import { SpellSheetPF2e } from "@item/spell/sheet.ts";
import { TreasureSheetPF2e } from "@item/treasure/sheet.ts";
import { WeaponSheetPF2e } from "@item/weapon/sheet.ts";
import { JournalSheetPF2e } from "@module/journal-entry/sheet.ts";
import { UserConfigPF2e } from "@module/user/sheet.ts";
import { SceneConfigPF2e } from "@scene/sheet.ts";
import { TokenDocumentPF2e } from "@scene/token-document/document.ts";
import { TokenConfigPF2e } from "@scene/token-document/index.ts";
import appv1 = foundry.appv1;

export function registerSheets(): void {
    const sheetLabel = game.i18n.localize("PF2E.SheetLabel");

    fd.collections.Scenes.registerSheet("pf2e", SceneConfigPF2e, { makeDefault: true });
    fa.apps.DocumentSheetConfig.registerSheet(TokenDocumentPF2e, "pf2e", TokenConfigPF2e, { makeDefault: true });

    // ACTOR
    fd.collections.Actors.unregisterSheet("core", appv1.sheets.ActorSheet);

    const localizeType = (type: string) => {
        const docType = type in CONFIG.PF2E.Actor.documentClasses ? "Actor" : "Item";
        return game.i18n.localize(`TYPES.${docType}.${type}`);
    };

    // PC
    fd.collections.Actors.registerSheet("pf2e", CharacterSheetPF2e, {
        types: ["character"],
        label: game.i18n.format(sheetLabel, { type: localizeType("character") }),
        makeDefault: true,
    });

    // NPC
    fd.collections.Actors.registerSheet("pf2e", NPCSheetPF2e, {
        types: ["npc"],
        label: game.i18n.format(sheetLabel, { type: localizeType("npc") }),
        makeDefault: true,
    });
    fd.collections.Actors.registerSheet("pf2e", SimpleNPCSheet, {
        types: ["npc"],
        label: "PF2E.Actor.NPC.SimpleSheet",
        canBeDefault: false,
    });

    // Hazard
    fd.collections.Actors.registerSheet("pf2e", HazardSheetPF2e, {
        types: ["hazard"],
        label: game.i18n.format(sheetLabel, { type: localizeType("hazard") }),
    });

    // Loot
    fd.collections.Actors.registerSheet("pf2e", LootSheetPF2e, {
        types: ["loot"],
        label: game.i18n.format(sheetLabel, { type: localizeType("loot") }),
        makeDefault: true,
    });

    // Familiar
    fd.collections.Actors.registerSheet("pf2e", FamiliarSheetPF2e, {
        types: ["familiar"],
        label: game.i18n.format(sheetLabel, { type: localizeType("familiar") }),
        makeDefault: true,
    });

    // Vehicle
    fd.collections.Actors.registerSheet("pf2e", VehicleSheetPF2e, {
        types: ["vehicle"],
        label: game.i18n.format(sheetLabel, { type: localizeType("vehicle") }),
        makeDefault: true,
    });

    // Party
    fd.collections.Actors.registerSheet("pf2e", PartySheetPF2e, {
        types: ["party"],
        label: game.i18n.format(sheetLabel, { type: localizeType("party") }),
        makeDefault: true,
    });

    // Army
    fd.collections.Actors.registerSheet("pf2e", ArmySheetPF2e, {
        types: ["army"],
        label: game.i18n.format(sheetLabel, { type: localizeType("army") }),
        makeDefault: true,
    });

    // ITEM
    fd.collections.Items.unregisterSheet("core", appv1.sheets.ItemSheet);

    const itemTypes = ["lore", "spellcastingEntry"];
    for (const itemType of itemTypes) {
        fd.collections.Items.registerSheet("pf2e", ItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    const sheetEntries = [
        ["action", AbilitySheetPF2e],
        ["affliction", AfflictionSheetPF2e],
        ["ammo", AmmoSheetPF2e],
        ["ancestry", AncestrySheetPF2e],
        ["armor", ArmorSheetPF2e],
        ["background", BackgroundSheetPF2e],
        ["backpack", ContainerSheetPF2e],
        ["book", BookSheetPF2e],
        ["campaignFeature", CampaignFeatureSheetPF2e],
        ["class", ClassSheetPF2e],
        ["condition", ConditionSheetPF2e],
        ["consumable", ConsumableSheetPF2e],
        ["deity", DeitySheetPF2e],
        ["effect", EffectSheetPF2e],
        ["equipment", EquipmentSheetPF2e],
        ["feat", FeatSheetPF2e],
        ["heritage", HeritageSheetPF2e],
        ["kit", KitSheetPF2e],
        ["lore", LoreSheetPF2e],
        ["melee", MeleeSheetPF2e],
        ["shield", ShieldSheetPF2e],
        ["spell", SpellSheetPF2e],
        ["treasure", TreasureSheetPF2e],
        ["weapon", WeaponSheetPF2e],
    ] as const;
    for (const [type, Sheet] of sheetEntries) {
        fd.collections.Items.registerSheet("pf2e", Sheet, {
            types: [type],
            label: game.i18n.format(sheetLabel, { type: localizeType(type) }),
            makeDefault: true,
        });
    }

    // Add any missing physical item sheets
    for (const itemType of PHYSICAL_ITEM_TYPES) {
        if (sheetEntries.some(([type, _sheet]) => itemType === type)) continue;
        fd.collections.Items.registerSheet("pf2e", PhysicalItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    // JOURNAL ENTRY
    fd.collections.Journal.unregisterSheet("core", appv1.sheets.JournalSheet);
    fd.collections.Journal.registerSheet("pf2e", JournalSheetPF2e, {
        label: () =>
            game.i18n.format("SHEETS.DefaultDocumentSheet", { document: game.i18n.localize("DOCUMENT.JournalEntry") }),
        makeDefault: true,
    });

    // USER
    fd.collections.Users.unregisterSheet("core", foundry.applications.sheets.UserConfig);
    fd.collections.Users.registerSheet("pf2e", UserConfigPF2e, {
        makeDefault: true,
        label: () => game.i18n.format("SHEETS.DefaultDocumentSheet", { document: game.i18n.localize("DOCUMENT.User") }),
    });
}
