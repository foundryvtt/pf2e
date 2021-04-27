import { CharacterSheetPF2e } from '@actor/sheet/character';
import { UpdatedNPCSheetPF2e } from '@actor/sheet/updated-npc-sheet';
import { ActionSheetPF2e } from '@item/sheet/action';
import { HazardSheetPF2e } from '@actor/sheet/hazard';
import { LootSheetPF2e } from '@actor/sheet/loot';
import { FamiliarSheetPF2e } from '@actor/sheet/familiar';
import { VehicleSheetPF2e } from '@actor/sheet/vehicle';
import { ActorSheetPF2eSimpleNPC } from '@actor/sheet/simple-npc-sheet';
import { AnimalCompanionSheetPF2e } from '@actor/sheet/animal-companion';
import { ItemSheetPF2e } from '@item/sheet/base';
import { KitSheetPF2e } from '@item/sheet/kit';
import { AncestrySheetPF2e } from '@item/sheet/ancestry';
import { BackgroundSheetPF2e } from '@item/sheet/background';
import { ClassSheetPF2e } from '@item/sheet/class';
import { SpellSheetPF2e } from '@item/sheet/spell';
import { LocalizePF2e } from '@system/localize';
import { PhysicalItemSheetPF2e } from '@item/sheet/physical';
import { ActorSheetPF2eDataEntryNPC } from '@actor/sheet/data-entry-npc-sheet';
import { FeatSheetPF2e } from '@item/sheet/feat';

export function registerSheets() {
    const translations = LocalizePF2e.translations.PF2E;
    const sheetLabel = translations.SheetLabel;
    const sheetLabelNew = translations.SheetLabelNew;
    const sheetLabelOld = translations.SheetLabelOld;
    const sheetLabelDataEntry = translations.SheetLabelDataEntry;

    // ACTORS
    Actors.unregisterSheet('core', ActorSheet);

    const localizeType = (type: string) => {
        const entityType = type in CONFIG.PF2E.Actor.entityClasses ? 'ACTOR' : 'ITEM';
        const camelized = type[0].toUpperCase() + type.slice(1).toLowerCase();
        return game.i18n.localize(`${entityType}.Type${camelized}`);
    };

    Actors.registerSheet('pf2e', CharacterSheetPF2e, {
        types: ['character'],
        label: game.i18n.format(sheetLabel, { type: localizeType('character') }),
        makeDefault: true,
    });

    // Register NPC Sheet
    Actors.registerSheet('pf2e', UpdatedNPCSheetPF2e, {
        types: ['npc'],
        label: game.i18n.format(sheetLabelOld, { type: localizeType('npc') }),
        makeDefault: false,
    });

    // Regiser NEW NPC Sheet (don't make it default, it's on testing phase)
    Actors.registerSheet('pf2e', ActorSheetPF2eSimpleNPC, {
        types: ['npc'],
        label: game.i18n.format(sheetLabel, { type: localizeType('npc') }),
        makeDefault: true,
    });

    if (BUILD_MODE === 'development') {
        Actors.registerSheet('pf2e', ActorSheetPF2eDataEntryNPC, {
            types: ['npc'],
            label: game.i18n.format(sheetLabelDataEntry, { type: localizeType('npc') }),
            makeDefault: false,
        });
    }

    // Register Hazard Sheet
    Actors.registerSheet('pf2e', HazardSheetPF2e, {
        types: ['hazard'],
        label: game.i18n.format(sheetLabel, { type: localizeType('hazard') }),
        makeDefault: true,
    });

    // Register Loot Sheet
    Actors.registerSheet('pf2e', LootSheetPF2e, {
        types: ['loot'],
        label: game.i18n.format(sheetLabel, { type: localizeType('loot') }),
        makeDefault: true,
    });

    // Register Familiar Sheet
    Actors.registerSheet('pf2e', FamiliarSheetPF2e, {
        types: ['familiar'],
        label: game.i18n.format(sheetLabel, { type: localizeType('familiar') }),
        makeDefault: true,
    });

    // Register Vehicle Sheet
    Actors.registerSheet('pf2e', VehicleSheetPF2e, {
        types: ['vehicle'],
        label: game.i18n.format(sheetLabel, { type: localizeType('vehicle') }),
        makeDefault: true,
    });

    if (BUILD_MODE === 'development') {
        // Register AnimalCompanion Sheet
        Actors.registerSheet('pf2e', AnimalCompanionSheetPF2e, {
            types: ['animalCompanion'],
            label: game.i18n.format(sheetLabelNew, { type: localizeType('animalCompanion') }),
            makeDefault: true,
        });
    }

    // ITEMS
    Items.unregisterSheet('core', ItemSheet);

    const itemTypes = ['condition', 'effect', 'lore', 'martial', 'spellcastingEntry'];
    for (const itemType of itemTypes) {
        Items.registerSheet('pf2e', ItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    const physicalItemTypes = ['armor', 'backpack', 'consumable', 'equipment', 'melee', 'treasure', 'weapon'];
    for (const itemType of physicalItemTypes) {
        Items.registerSheet('pf2e', PhysicalItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    const sheetEntries = [
        ['action', ActionSheetPF2e],
        ['ancestry', AncestrySheetPF2e],
        ['background', BackgroundSheetPF2e],
        ['class', ClassSheetPF2e],
        ['feat', FeatSheetPF2e],
        ['spell', SpellSheetPF2e],
        ['kit', KitSheetPF2e],
    ] as const;
    for (const [type, Sheet] of sheetEntries) {
        Items.registerSheet('pf2e', Sheet, {
            types: [type],
            label: game.i18n.format(sheetLabel, { type: localizeType(type) }),
            makeDefault: true,
        });
    }
}
