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
      tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "character" }]
    });
  }

  get template() {
    return 'systems/pf2e/templates/actors/crb-style/actor-sheet.html';
  }

  _onSubmit() {
    console.log('PF2E | _onSubmit is disabled for CRB Style actor sheet');
    ui.notifications.error("Warning! This sheet is still experimental, it does not save any changes to your character.");
    }

     /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    sheetData.data.attributes.perception.rankName = game.i18n.format("PF2E.ProficiencyLevel"+sheetData.data.attributes.perception.rank);

    // Return data to the sheet
    return sheetData;
  }
}
