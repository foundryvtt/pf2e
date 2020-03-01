
class ActorSheetPF2eNPC extends ActorSheetPF2e {
  static get defaultOptions() {
	  const options = super.defaultOptions;
	  mergeObject(options, {
      classes: options.classes.concat(['pf2e', 'actor', 'npc-sheet']),
      width: 650,
      height: 680,
      showUnpreparedSpells: true,
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
    return `${path}npc-sheet.html`;
    /*     if ( !game.user.isGM && this.actor.limited ) return path + "limited-sheet.html";
    return path + "npc-sheet.html"; */
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    // Return data for rendering
    return sheetData;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Items for NPC sheets
   * @private
   */
  _prepareItems(actorData) {
    // Actions
    const attacks = {
      melee: { label: 'NPC Melee Attack', items: [], type: 'melee' },
      ranged: { label: 'NPC Ranged Attack', items: [], type: 'melee' },
      weapon: { label: 'Compendium Weapon', items: [], type: 'weapon' },
    };

    // Actions
    const actions = {
      action: { label: 'Actions', actions: [] },
      reaction: { label: 'Reactions', actions: [] },
      free: { label: 'Free Actions', actions: [] },
      passive: { label: 'Passive Actions', actions: [] },
    };

    // Spellbook
    // const spellbook = {};
    const tempSpellbook = [];
    const spellcastingEntriesList = [];
    const spellbooks = [];
    spellbooks.unassigned = {};

    // Spellcasting Entries
    const spellcastingEntries = [];

    // Skills
    const lores = [];

    // Iterate through items, allocating to containers
    for (const i of actorData.items) {
      i.img = i.img || CONST.DEFAULT_TOKEN;

      // Spells
      if (i.type === 'spell') {
        tempSpellbook.push(i);
      }

      // Spellcasting Entries
      else if (i.type === 'spellcastingEntry') {
        // collect list of entries to use later to match spells against.
        spellcastingEntriesList.push(i._id);

        if ((i.data.prepared || {}).value === 'prepared') i.data.prepared.preparedSpells = true;
        else i.data.prepared.preparedSpells = false;
        // Check if Ritual spellcasting tradtion and set Boolean
        if ((i.data.tradition || {}).value === 'ritual') i.data.tradition.ritual = true;
        else i.data.tradition.ritual = false;

        spellcastingEntries.push(i);
      }

      // Weapons
      else if (i.type === 'weapon') {
        // let weaponType = (i.data.weaponType || {}).value || "weapon";
        const isAgile = (i.data.traits.value || []).includes('agile');
        i.data.bonus.total = (parseInt(i.data.bonus.value) || 0) + actorData.data.martial.simple.value;
        i.data.isAgile = isAgile;

        attacks.weapon.items.push(i);
      }

      // NPC Generic Attacks
      else if (i.type === 'melee') {
        const weaponType = (i.data.weaponType || {}).value || 'melee';
        const isAgile = (i.data.traits.value || []).includes('agile');
        i.data.bonus.total = (parseInt(i.data.bonus.value) || 0) + actorData.data.martial.simple.value;
        i.data.isAgile = isAgile;

        attacks[weaponType].items.push(i);
      }

      // Actions
      else if (i.type === 'action') {
        const actionType = i.data.actionType.value || 'action';
        let actionImg = 0;
        // if (actionType === "action") actionImg = parseInt(i.data.actions.value) || 1;
        if (actionType === 'action') actionImg = parseInt((i.data.actions || {}).value) || 1;
        else if (actionType === 'reaction') actionImg = 'reaction';
        else if (actionType === 'free') actionImg = 'free';
        else if (actionType === 'passive') actionImg = 'passive';
        i.img = this._getActionImg(actionImg);


        actions[actionType].actions.push(i);
      }

      // Feats
      else if (i.type === 'feat') {
        const actionType = i.data.actionType.value || 'passive';

        if (Object.keys(actions).includes(actionType)) {
          i.feat = true;
          let actionImg = 0;
          if (actionType === 'action') actionImg = parseInt((i.data.actions || {}).value) || 1;
          else if (actionType === 'reaction') actionImg = 'reaction';
          else if (actionType === 'free') actionImg = 'free';
          i.img = this._getActionImg(actionImg);
          actions[actionType].actions.push(i);
        }
      }

      // Lore Skills
      else if (i.type === 'lore') {
        lores.push(i);
      }
    }

    const embeddedEntityUpdate = [];

    // Iterate through all spells in the temp spellbook and check that they are assigned to a valid spellcasting entry. If not place in unassigned.
    for (const i of tempSpellbook) {
      const spellType = i.data.time.value;

      // format spell level for display
      if (spellType === 'reaction') i.img = this._getActionImg('reaction');
      else if (spellType === 'free') i.img = this._getActionImg('free');
      else if (parseInt(spellType)) i.img = this._getActionImg(parseInt(spellType));

      // check if the spell has a valid spellcasting entry assigned to the location value.
      if (spellcastingEntriesList.includes(i.data.location.value)) {
        const location = i.data.location.value;
        spellbooks[location] = spellbooks[location] || {};
        this._prepareSpell(actorData, spellbooks[location], i);
      } else { // if not BUT their is only one spellcasting entry then assign the spell to this entry.
        const location = spellcastingEntriesList[0];
        spellbooks[location] = spellbooks[location] || {};

        // Update spell to perminantly have the correct ID now
        embeddedEntityUpdate.push({ _id: i._id, 'data.location.value': spellcastingEntriesList[0] });

        this._prepareSpell(actorData, spellbooks[location], i);
      }
    }

    // Update all embedded entities that have an incorrect location.
    if (embeddedEntityUpdate.length) {
      console.log('PF2e System | Prepare Actor Data | Updating location for the following embedded entities: ', embeddedEntityUpdate);
      this.actor.updateManyEmbeddedEntities('OwnedItem', embeddedEntityUpdate);
      ui.notifications.info('PF2e actor data migration for orphaned spells applied. Please close actor and open again for changes to take affect.');
    }

    // Assign and return
    actorData.actions = actions;
    actorData.attacks = attacks;
    actorData.lores = lores;

    if (Object.keys(spellbooks.unassigned).length) {
      actorData.orphanedSpells = true;
      actorData.orphanedSpellbook = spellbooks.unassigned;
    }

    for (const entry of spellcastingEntries) {
      if (entry.data.prepared.preparedSpells && spellbooks[entry._id]) {
        this._preparedSpellSlots(entry, spellbooks[entry._id]);
      }
      entry.spellbook = spellbooks[entry._id];
    }

    actorData.spellcastingEntries = spellcastingEntries;
  }


  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;

    // NPC SKill Rolling
    html.find('.item .npc-skill-name').click((event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
      const item = this.actor.getOwnedItem(itemId);
      this.actor.rollLoreSkill(event, item);
    });

    html.find('.skill-input').focusout(async (event) => {
      const itemId = event.target.attributes['data-item-id'].value;
      await this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.mod.value': Number(event.target.value) });
      // }
    });

    html.find('.spelldc-input').focusout(async (event) => {
      event.preventDefault();

      const li = $(event.currentTarget).parents('.item-container');
      const itemId = li.attr('data-container-id');
      const spelldcType = $(event.currentTarget).parents('.npc-defense').attr('data-spelldc-attribute');

      if (spelldcType === 'dc' || spelldcType === 'value') {
        const itemToEdit = this.actor.getOwnedItem(itemId).data;
        itemToEdit.data.spelldc[spelldcType] = Number(event.target.value);

        const key = `data.slotdc.${spelldcType}`;
        const options = { _id: itemId };
        options[key] = Number(event.target.value);

        await this.actor.updateEmbeddedEntity('OwnedItem', options);
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
/*   _updateObject(event, formData) {

    // Format NPC Challenge Rating
    if (this.actor.data.type === "npc") {
      let cr = formData["data.details.cr.value"];
      if ( cr ) {
        let crs = {"1/8": 0.125, "1/4": 0.25, "1/2": 0.5};
        formData["data.details.cr.value"] = crs[cr] || parseInt(cr);
      }
    }

    // Parent ActorSheet update steps
    super._updateObject(event, formData);
  } */
}

// Register NPC Sheet
Actors.registerSheet('pf2e', ActorSheetPF2eNPC, {
  types: ['npc'],
  makeDefault: true,
});
