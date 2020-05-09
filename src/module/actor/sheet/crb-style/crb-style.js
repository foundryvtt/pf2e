import ActorSheetPF2eCharacter from '../character.js';

export default class CRBStyleCharacterActorSheetPF2E extends ActorSheetPF2eCharacter {
  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      classes: options.classes.concat(['crb-style']),
    });
    return options;
  }

  get template() {
    return 'systems/pf2e/templates/actors/crb-style/actor-sheet.html';
  }
}
