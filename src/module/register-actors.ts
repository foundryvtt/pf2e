import { CRBStyleCharacterActorSheetPF2E } from './actor/sheet/character';
import { ActorSheetPF2eNPC } from './actor/sheet/npc';
import { UpdatedNPCActorPF2ESheet } from './actor/sheet/updatednpcsheet';
import { ActorSheetPF2eHazard } from './actor/sheet/hazard';
import { ActorSheetPF2eLoot } from './actor/sheet/loot';
import { ActorSheetPF2eFamiliar } from './actor/sheet/familiar';
import { ActorSheetPF2eVehicle } from './actor/sheet/vehicle';

export function registerActors() {
    Actors.unregisterSheet('core', ActorSheet);

    // Register Character Sheet
    Actors.registerSheet('pf2e', CRBStyleCharacterActorSheetPF2E, {
        types: ['character'],
        makeDefault: true,
    });

    // Register NPC Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eNPC, {
        types: ['npc'],
        makeDefault: false,
    });

    // Register NPC Sheet
    Actors.registerSheet('pf2e', UpdatedNPCActorPF2ESheet, {
        types: ['npc'],
        makeDefault: true,
    });

    // Register Hazard Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eHazard, {
        types: ['hazard'],
        makeDefault: true,
    });

    // Register Loot Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eLoot, {
        types: ['loot'],
        makeDefault: true,
    });

    // Register Loot Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eFamiliar, {
        types: ['familiar'],
        makeDefault: true,
    });

    // Register Vehicle Sheet
    Actors.registerSheet('pf2e', ActorSheetPF2eVehicle, {
        types: ['vehicle'],
        makeDefault: true,
    });
}
