

class ActorSheetPF2eNPC extends ActorSheetPF2e {
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  mergeObject(options, {
      classes: options.classes.concat(["pf2e", "actor", "npc-sheet"]),
      width: 650,
      height: 680,
      showUnpreparedSpells: true
    });
	  return options;
  }

  /* -------------------------------------------- */

  /**
   * Get the correct HTML template path to use for rendering this particular sheet
   * @type {String}
   */
  get template() {
    const path = "public/systems/pf2e/templates/actors/";
    return path + "npc-sheet.html";
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
      melee: {label: "NPC Melee Attack", items: [], type: "melee" },
      ranged: { label: "NPC Ranged Attack", items: [], type: "melee" },
      weapon: { label: "Compendium Weapon", items: [], type: "weapon" }
    };

    // Actions
    const actions = {
      "action": { label: "Actions", actions: [] },
      "reaction": { label: "Reactions", actions: [] },
      "free": { label: "Free Actions", actions: [] },
      "passive": { label: "Passive Actions", actions: [] },
    };

    // Spellbook
    const spellbook = {};

    // Skills
    const lores = [];

    // Iterate through items, allocating to containers
    for ( let i of actorData.items ) {
      i.img = i.img || DEFAULT_TOKEN;
      
      // Spells
      if ( i.type === "spell" ) {
        let spellType = i.data.time.value;
        
        // format spell level for display
        if (spellType === "reaction") i.img = this._getActionImg("reaction");
        else if (spellType === "free") i.img = this._getActionImg("free");
        else if (parseInt(spellType)) i.img = this._getActionImg(parseInt(spellType));

        this._prepareSpell(actorData, spellbook, i);
      }

      // Weapons
      else if ( i.type === "weapon" ) {
        //let weaponType = (i.data.weaponType || {}).value || "weapon";
        let isAgile = (i.data.traits.value || []).includes("agile");
        i.data.bonus.total = (parseInt(i.data.bonus.value) || 0) + actorData.data.martial.simple.value;
        i.data.isAgile = isAgile;

        attacks["weapon"].items.push(i);
      }

      // NPC Generic Attacks
      else if ( i.type === "melee" ) {
        let weaponType = (i.data.weaponType || {}).value || "melee";
        let isAgile = (i.data.traits.value || []).includes("agile");
        i.data.bonus.total = (parseInt(i.data.bonus.value) || 0) + actorData.data.martial.simple.value;
        i.data.isAgile = isAgile;

        attacks[weaponType].items.push(i);
      }

      // Actions
      else if ( i.type === "action" ) {
        let actionType = i.data.actionType.value || "action";
        let actionImg = 0;
        //if (actionType === "action") actionImg = parseInt(i.data.actions.value) || 1;
        if (actionType === "action") actionImg = parseInt((i.data.actions || {}).value) || 1;
        else if (actionType === "reaction") actionImg = "reaction";
        else if (actionType === "free") actionImg = "free";
        else if (actionType === "passive") actionImg = "passive";
        i.img = this._getActionImg(actionImg);

        
        actions[actionType].actions.push(i);       
      }

      // Feats
      else if ( i.type === "feat" ) {
        let actionType = i.data.actionType.value || "passive";
        
        if ( Object.keys(actions).includes(actionType)) {
          i.feat = true;
          let actionImg = 0;
          if (actionType === "action") actionImg = parseInt((i.data.actions || {}).value) || 1;
          else if (actionType === "reaction") actionImg = "reaction";
          else if (actionType === "free") actionImg = "free";
          i.img = this._getActionImg(actionImg);
          actions[actionType].actions.push(i);
        }
      }

      // Lore Skills
      else if ( i.type === "lore" ) {

        /* i.data.icon = this._getProficiencyIcon((i.data.proficient || {}).value);
        i.data.hover = CONFIG.proficiencyLevels[((i.data.proficient || {}).value )];

        let proficiency = (i.data.proficient || {}).value ? ((i.data.proficient || {}).value * 2) + actorData.data.details.level.value : 0;      
        let modifier = actorData.data.abilities["int"].mod;
        let itemBonus = Number((i.data.item || {}).value || 0);
        i.data.itemBonus = itemBonus;
        i.data.value = modifier + proficiency + itemBonus;
        i.data.breakdown = `int modifier(${modifier}) + proficiency(${proficiency}) + item bonus(${itemBonus})`; */

        lores.push(i);
      }
    }

    // Assign and return
    actorData.actions = actions;
    actorData.attacks = attacks;
    actorData.spellbook = spellbook;
    actorData.lores = lores;
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
    if ( !this.options.editable ) return;

    /* Roll NPC HP */
/*     html.find('.npc-roll-hp').click(ev => {
      let ad = this.actor.data.data;
      let hp = new Roll(ad.attributes.hp.formula).roll().total;
      AudioHelper.play({src: CONFIG.sounds.dice});
      this.actor.update({"data.attributes.hp.value": hp, "data.attributes.hp.max": hp});
    }); */

    // NPC SKill Rolling
    html.find('.item .npc-skill-name').click(event => {
      event.preventDefault();
      let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id")),
          item = this.actor.getOwnedItem(itemId);
      this.actor.rollLoreSkill(event, item);
    });  

    html.find('.skill-input').focusout(async event => {
      let itemId = Number(event.target.attributes["data-item-id"].value);
      const itemToEdit = this.actor.items.find(i => i.id === itemId);
      itemToEdit.data.mod.value = Number(event.target.value);

      // Need to update all skills every time because if the user tabbed through and updated many, only the last one would be saved
      let skills = this.actor.items.filter(i => i.type == "lore")
      for(let skill of skills)
      {
        await this.actor.updateOwnedItem(skill, true);      
      }
    });

/*     html.find('.item-name').focusout(async event => {
      let itemId = Number(event.target.attributes["data-item-id"].value);
      const itemToEdit = this.actor.items.find(i => i.id === itemId);
      itemToEdit.name = event.target.value;

      // Need to update all skills every time because if the user tabbed through and updated many, only the last one would be saved
      let skills = this.actor.items.filter(i => i.type == "lore")
      for(let skill of skills)
      {
        await this.actor.updateOwnedItem(skill, true);      
      }
    }); */
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
Actors.registerSheet("pf2e", ActorSheetPF2eNPC, {
  types: ["npc"],
  makeDefault: true
});
