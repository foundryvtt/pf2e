import ActorSheetPF2eCharacter from '../character.js';

/**
 * Extend the base ActorSheet
 * @extends {ActorSheetPF2eCharacter}
 */

export default class CRBStyleCharacterActorSheetPF2E extends ActorSheetPF2eCharacter {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['crb-style'],
      template: 'systems/pf2e/templates/actor/crb-style/actor-sheet.html',
      width: 700,
      height: 800,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'character-stats' }],
    });
  }
}
