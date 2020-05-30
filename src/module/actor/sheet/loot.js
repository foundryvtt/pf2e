import ActorSheetPF2e from './base.js';
import chalk from 'chalk';

class ActorSheetPF2eLoot extends ActorSheetPF2e {
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
          classes: options.classes.concat(['pf2e', 'actor', 'loot']),
          width: 650,
          height: 680,
        });
        return options;
      }

      /* -------------------------------------------- */

  /**
   * Get the correct HTML template path to use for rendering this particular sheet
   * @type {String}
   */
  get template() {
    const path = 'systems/pf2e/templates/actors/';
    if (this.actor.getFlag('pf2e', 'editLoot.value')) {
        return `${path}loot-sheet.html`;
    }

    return `${path}loot-sheet-no-edit.html`;
  }

  /* -------------------------------------------- */

  getData() {
      const sheetData = super.getData();

      this._prepareTraits(sheetData.data.traits);

      // Process default values
      if (sheetData.flags.editLoot === undefined) sheetData.flags.editLoot = { value: false };

      return sheetData;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;

    html.find('.isLootEditable').change((ev) => {
      this.actor.setFlag('pf2e', 'editLoot', { value: ev.target.checked });
    });
  }
}

export default ActorSheetPF2eLoot;