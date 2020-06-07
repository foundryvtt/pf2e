import ActorSheetPF2eCharacter from './actor/sheet/character.js';
import ActorSheetPF2eCharacterReadOnly from './actor/sheet/characterReadOnly.js';
import ActorSheetPF2eNPC from './actor/sheet/npc.js';
import UpdatedNPCActorPF2ESheet from './actor/sheet/updatednpcsheet.js';
import CRBStyleCharacterActorSheetPF2E from './actor/sheet/crb-style/crb-style.js';
import ActorSheetPF2eHazard from './actor/sheet/hazard.js';
import ActorSheetPF2eLoot from './actor/sheet/loot.js';

function registerActors() {
  Actors.unregisterSheet('core', ActorSheet);

  // Register Character Sheet
  Actors.registerSheet('pf2e', ActorSheetPF2eCharacter, {
    types: ['character'],
    makeDefault: false,
  });

  // Register Read-Only Character Sheet
/*   Actors.registerSheet('pf2e', ActorSheetPF2eCharacterReadOnly, {
    types: ['character'],
    makeDefault: false,
  }); */

  // Register Character Sheet with new UI
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
}

export default registerActors;
