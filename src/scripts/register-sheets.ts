import { CharacterSheetPF2e } from '../module/actor/sheet/character';
import { UpdatedNPCSheetPF2e } from '@actor/sheet/updated-npc-sheet';
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
import { ItemPF2e } from '@item/base';
import { LocalizePF2e } from '@system/localize';
import { PhysicalItemSheetPF2e } from '@item/sheet/physical';
import { PhysicalItemPF2e } from '@item/physical';

export function registerSheets() {
    const translations = LocalizePF2e.translations.PF2E;
    const sheetLabel = translations.SheetLabel;
    const sheetLabelOld = translations.SheetLabelOld;

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

    // Regiser NEW NPC Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eSimpleNPC, {
        types: ['npc'],
        label: game.i18n.format(sheetLabel, { type: localizeType('npc') }),
        makeDefault: true,
    });

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

    const itemTypes = ['action', 'condition', 'effect', 'feat', 'lore', 'martial', 'spell', 'spellcastingEntry'];
    for (const itemType of itemTypes) {
        Items.registerSheet<ItemPF2e>('pf2e', ItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    const physicalItemTypes = ['armor', 'backpack', 'consumable', 'equipment', 'melee', 'treasure', 'weapon'];
    for (const itemType of physicalItemTypes) {
        Items.registerSheet<PhysicalItemPF2e>('pf2e', PhysicalItemSheetPF2e, {
            types: [itemType],
            label: game.i18n.format(sheetLabel, { type: localizeType(itemType) }),
            makeDefault: true,
        });
    }

    Items.registerSheet('pf2e', KitSheetPF2e, {
        types: ['kit'],
        label: game.i18n.format(sheetLabel, { type: localizeType('kit') }),
        makeDefault: true,
    });
    Items.registerSheet('pf2e', AncestrySheetPF2e, {
        types: ['ancestry'],
        label: game.i18n.format(sheetLabel, { type: localizeType('ancestry') }),
        makeDefault: true,
    });
    Items.registerSheet('pf2e', BackgroundSheetPF2e, {
        types: ['background'],
        label: game.i18n.format(sheetLabel, { type: localizeType('background') }),
        makeDefault: true,
    });
    Items.registerSheet('pf2e', ClassSheetPF2e, {
        types: ['class'],
        label: game.i18n.format(sheetLabel, { type: localizeType('class') }),
        makeDefault: true,
    });
}
