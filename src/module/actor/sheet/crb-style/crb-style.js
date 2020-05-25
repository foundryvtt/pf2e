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

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    // preparing the name of the rank, as this is displayed on the sheet
    sheetData.data.attributes.perception.rankName = game.i18n.format("PF2E.ProficiencyLevel"+sheetData.data.attributes.perception.rank);
    
    // limiting the amount of characters for the save labels
    for (const [s, save] of Object.entries(sheetData.data.saves)) {
      save.label = game.i18n.format(`PF2E.Saves${save.label}Short`); 
    }

    // Return data to the sheet
    return sheetData;
  }

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.crb-trait-selector').click((ev) => this._onCrbTraitSelector(ev));
  }
}
