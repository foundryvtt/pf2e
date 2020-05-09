import ActorSheetPF2eCharacter from '../character.js';

/**
 * Extend the base ActorSheet
 * @extends {ActorSheetPF2eCharacter}
 */

export default class CRBStyleCharacterActorSheetPF2E extends ActorSheetPF2eCharacter {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['crb-style', 'sheet', 'actor', 'pc'],
      width: 700,
      height: 800,
    });
  }

  get template() {
    return 'systems/pf2e/templates/actors/crb-style/actor-sheet.html';
  }
}
