import ActorSheetPF2eCharacter from './actor/sheet/character.js';
import ActorSheetPF2eCharacterReadOnly from './actor/sheet/characterReadOnly.js';

function registerActors() {
  Actors.unregisterSheet('core', ActorSheet);

  // Register Character Sheet
  Actors.registerSheet('pf2e', ActorSheetPF2eCharacter, {
    types: ['character'],
    makeDefault: true,
  });

  // Register Read-Only Character Sheet
  Actors.registerSheet('pf2e', ActorSheetPF2eCharacterReadOnly, {
    types: ['character'],
    makeDefault: true,
  });
}

export default registerActors;
