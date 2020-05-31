
class ActorSheetPF2eLoot extends ActorSheet {
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
    const editableSheetPath = 'systems/pf2e/templates/actors/loot-sheet.html';
    const nonEditableSheetPath = 'systems/pf2e/templates/actors/loot-sheet-no-edit.html';

    const isEditable = this.actor.getFlag('pf2e', 'editLoog.value');

    if (isEditable) return editableSheetPath;
    
    return nonEditableSheetPath;
  }

  /* -------------------------------------------- */

  getData() {
      const sheetData = super.getData();

      // Process default values
      sheetData.flags = sheetData.actor.flags;
      if (sheetData.flags.editLoot === undefined) sheetData.flags.editLoot = { value: false };
      
      // Precalculate some data to adapt sheet more easily
      sheetData.isShop = sheetData.data.isShop;

      return sheetData;
  }

  activateListeners(html) {
    super.activateListeners(html);

    const shouldListenToEvents = this.options.editable;

    if (shouldListenToEvents) {
      html.find('.isLootEditable').change((ev) => {
        this.actor.setFlag('pf2e', 'editLoot', { value: ev.target.checked });
      });
    }

  }
}

export default ActorSheetPF2eLoot;