import { CRBStyleCharacterActorSheetPF2E } from '../module/actor/sheet/character';
import { UpdatedNPCActorPF2ESheet } from '@actor/sheet/updated-npc-sheet';
import { ActorSheetPF2eHazard } from '@actor/sheet/hazard';
import { ActorSheetPF2eLoot } from '@actor/sheet/loot';
import { ActorSheetPF2eFamiliar } from '@actor/sheet/familiar';
import { ActorSheetPF2eVehicle } from '@actor/sheet/vehicle';
import { ActorSheetPF2eSimpleNPC } from '@actor/sheet/simple-npc-sheet';
import { ActorSheetPF2eAnimalCompanion } from '@actor/sheet/animal-companion';
import { ItemSheetPF2e } from '@item/sheet/base';
import { KitSheetPF2e } from '@item/sheet/kit';
import { AncestrySheetPF2e } from '@item/sheet/ancestry';
import { BackgroundSheetPF2e } from '@item/sheet/background';
import { ClassSheetPF2e } from '@item/sheet/class';
import { PF2EItem } from '@item/item';
import { LocalizePF2e } from '@system/localize';

export function registerSheets() {
    const translations = LocalizePF2e.translations.PF2E;
    const sheetLabel = translations.SheetLabel;
    const sheetLabelNew = translations.SheetLabelNew;

    // ACTORS
    Actors.unregisterSheet('core', ActorSheet);

    const localizeType = (type: string) => {
        const entityType = type in CONFIG.PF2E.Actor.entityClasses ? 'ACTOR' : 'ITEM';
        const camelized = type[0].toUpperCase() + type.slice(1).toLowerCase();
        return game.i18n.localize(`${entityType}.Type${camelized}`);
    };

    Actors.registerSheet('pf2e', CRBStyleCharacterActorSheetPF2E, {
        types: ['character'],
        label: game.i18n.format(sheetLabel, { type: localizeType('character') }),
        makeDefault: true,
    });

    // Register NPC Sheet
    Actors.registerSheet('pf2e', UpdatedNPCActorPF2ESheet, {
        types: ['npc'],
        label: game.i18n.format(sheetLabel, { type: localizeType('npc') }),
        makeDefault: true,
    });

    // Regiser NEW NPC Sheet (don't make it default, it's on testing phase)
    Actors.registerSheet('pf2e', ActorSheetPF2eSimpleNPC, {
        types: ['npc'],
        label: game.i18n.format(sheetLabelNew, { type: localizeType('npc') }),
        makeDefault: false,
    });

    // Register Hazard Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eHazard, {
        types: ['hazard'],
        label: game.i18n.format(sheetLabel, { type: localizeType('hazard') }),
        makeDefault: true,
    });

    // Register Loot Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eLoot, {
        types: ['loot'],
        label: game.i18n.format(sheetLabel, { type: localizeType('loot') }),
        makeDefault: true,
    });

    // Register Familiar Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eFamiliar, {
        types: ['familiar'],
        label: game.i18n.format(sheetLabel, { type: localizeType('familiar') }),
        makeDefault: true,
    });

    // Register Vehicle Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eVehicle, {
        types: ['vehicle'],
        label: game.i18n.format(sheetLabel, { type: localizeType('vehicle') }),
        makeDefault: true,
    });

    if (BUILD_MODE === 'development') {
        // Register AnimalCompanion Sheet
        Actors.registerSheet('pf2e', ActorSheetPF2eAnimalCompanion, {
            types: ['animalCompanion'],
            label: game.i18n.format(sheetLabelNew, { type: localizeType('animalCompanion') }),
            makeDefault: true,
        });
    }

    // ITEMS
    Items.unregisterSheet('core', ItemSheet);

    const itemTypes = Object.keys(CONFIG.PF2E.Item.entityClasses).filter(
        (type) => !['kit', 'ancestry', 'background', 'class'].includes(type),
    );

    for (const itemType of itemTypes) {
        Items.registerSheet<PF2EItem>('pf2e', ItemSheetPF2e, {
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
