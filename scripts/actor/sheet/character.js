

class ActorSheetPF2eCharacter extends ActorSheetPF2e {
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  mergeObject(options, {
      classes: options.classes.concat(["pf2e", "actor", "character-sheet"]),
      width: 650,
      height: 720,
      showUnpreparedSpells: false
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
    if ( !game.user.isGM && this.actor.limited ) return path + "limited-sheet.html";
    return path + "actor-sheet.html";
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    // Temporary HP
    let hp = sheetData.data.attributes.hp;
    if (hp.temp === 0) delete hp.temp;
    if (hp.tempmax === 0) delete hp.tempmax;

    // Update hero points label
    sheetData.data.attributes.heroPoints.icon = this._getHeroPointsIcon(sheetData.data.attributes.heroPoints.rank);
    sheetData.data.attributes.heroPoints.hover = CONFIG.heroPointLevels[sheetData.data.attributes.heroPoints.rank];

    // Spell Details
    sheetData["magicTraditions"] = CONFIG.magicTraditions;
    sheetData["preparationType"] = CONFIG.preparationType;
/*     if (sheetData.data.attributes.spellcasting.entry) {
      for (let entry of Object.values(sheetData.data.attributes.spellcasting.entry || {})) {
        if ((entry.prepared || {}).value === "prepared") entry.prepared["preparedSpells"] = true;
        else entry.prepared["preparedSpells"] = false;
      }
    } */

    sheetData["showUnpreparedSpells"] = sheetData.options.showUnpreparedSpells


    // Return data for rendering
    return sheetData;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Items for Character sheets
   * @private
   */
  _prepareItems(actorData) {

    // Inventory
    const inventory = {
      weapon: { label: "Weapons", items: [] },
      armor: { label: "Armor", items: [] },
      equipment: { label: "Equipment", items: [] },
      consumable: { label: "Consumables", items: [] },
      backpack: { label: "Backpack", items: [] },
    };

    // Spellbook
    //const spellbook = {};
    const spellbooks = [];
    spellbooks["unassigned"] = {};

    // Spellcasting Entries
    const spellcastingEntries = [];

    // Feats
    const feats = {
      "ancestry": { label: "Ancestry Feats", feats: [] },
      "skill": { label: "Skill Feats", feats: [] },
      "general": { label: "General Feats", feats: [] },
      "class": { label: "Class Feats", feats: [] },
      "bonus": { label: "Bonus Feats", feats: [] },
    };

    // Actions
    const actions = {
      "action": { label: "Actions", actions: [] },
      "reaction": { label: "Reactions", actions: [] },
      "free": { label: "Free Actions", actions: [] }
    };

    // Skills
    const lores = [];

    // Iterate through items, allocating to containers
    let totalWeight = 0;
    for ( let i of actorData.items ) {
      i.img = i.img || DEFAULT_TOKEN;

      // Inventory
      if ( Object.keys(inventory).includes(i.type) ) {
        i.data.quantity.value = i.data.quantity.value || 0;
        i.data.weight.value = i.data.weight.value || 0;
        if (i.data.weight.value === "L" || i.data.weight.value === "l") {
          i.totalWeight = "L";
          totalWeight += i.data.quantity.value * 0.1;
        } else if (parseInt(i.data.weight.value)) {
          i.totalWeight = Math.round(i.data.quantity.value * i.data.weight.value * 10) / 10;
          totalWeight += i.totalWeight;
        }
        else {
          i.totalWeight = "-";
        }
        i.hasCharges = (i.type === "consumable") && i.data.charges.max > 0;
        inventory[i.type].items.push(i);
        
      }

      // Spells
      else if ( i.type === "spell" ) {        
        if (i.data.location.value) {
          let location = Number(i.data.location.value);
          spellbooks[location] = spellbooks[location] || {};
          this._prepareSpell(actorData, spellbooks[location], i);                    
        } else {
          this._prepareSpell(actorData, spellbooks["unassigned"], i);                    
        }
      }

      // Spellcasting Entries
      else if ( i.type === "spellcastingEntry" ) {

        let spellProficiency = i.data.proficiency.value ? (i.data.proficiency.value * 2) + actorData.data.details.level.value : 0;
        let spellAbl = i.data.ability.value || "int";
        let spellAttack = actorData.data.abilities[spellAbl].mod + spellProficiency + i.data.item.value;
        if (i.data.spelldc.value != spellAttack) {
          i.data.spelldc.value = spellAttack;
          i.data.spelldc.dc = spellAttack + 10
          i.data.spelldc.mod = actorData.data.abilities[spellAbl].mod;
          this.actor.updateOwnedItem(i, true);
        }
        i.data.spelldc.mod = actorData.data.abilities[spellAbl].mod;        
        i.data.spelldc.breakdown = `10 + ${spellAbl} modifier(${actorData.data.abilities[spellAbl].mod}) + proficiency(${spellProficiency}) + item bonus(${i.data.item.value})`;  

        i.data.spelldc.icon = this._getProficiencyIcon(i.data.proficiency.value);
        i.data.spelldc.hover = CONFIG.proficiencyLevels[i.data.proficiency.value];
        i.data.tradition.title = CONFIG.magicTraditions[i.data.tradition.value];
        i.data.prepared.title = CONFIG.preparationType[i.data.prepared.value];
        if ((i.data.prepared || {}).value === "prepared") i.data.prepared["preparedSpells"] = true;
        else i.data.prepared["preparedSpells"] = false;
  
        spellcastingEntries.push(i);      
                
      }

/*       // Classes
      else if ( i.type === "class" ) {
        classes.push(i);
        classes.sort((a, b) => b.levels > a.levels);
      } */

      // Feats
      else if ( i.type === "feat" ) {
        let featType = i.data.featType.value || "bonus";
        let actionType = i.data.actionType.value || "passive";
        
        feats[featType].feats.push(i);
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

        i.data.icon = this._getProficiencyIcon((i.data.proficient || {}).value);
        i.data.hover = CONFIG.proficiencyLevels[((i.data.proficient || {}).value )];

        let proficiency = (i.data.proficient || {}).value ? ((i.data.proficient || {}).value * 2) + actorData.data.details.level.value : 0;      
        let modifier = actorData.data.abilities["int"].mod;
        let itemBonus = Number((i.data.item || {}).value || 0);
        i.data.itemBonus = itemBonus;
        i.data.value = modifier + proficiency + itemBonus;
        i.data.breakdown = `int modifier(${modifier}) + proficiency(${proficiency}) + item bonus(${itemBonus})`;

        lores.push(i);
      }

      // Actions
      if ( i.type === "action" ) {
        let actionType = i.data.actionType.value || "action";
        let actionImg = 0;
        if (actionType === "action") actionImg = parseInt(i.data.actions.value) || 1;
        else if (actionType === "reaction") actionImg = "reaction";
        else if (actionType === "free") actionImg = "free";
        else if (actionType === "passive") actionImg = "passive";
        i.img = this._getActionImg(actionImg);
        if (actionType === "passive") actions["free"].actions.push(i);
        else actions[actionType].actions.push(i);       
      }
    }

    

    // Assign and return
    actorData.inventory = inventory;
    // Any spells found that don't belong to a spellcasting entry are added to a "orphaned spells" spell book (allowing the player to fix where they should go)
    if (Object.keys(spellbooks.unassigned).length) {
      actorData.orphanedSpells = true;
      actorData.orphanedSpellbook = spellbooks["unassigned"];
    } 
    actorData.feats = feats;
    actorData.actions = actions;
    actorData.lores = lores;

    
    for (let entry of spellcastingEntries) {
      if (entry.data.prepared.preparedSpells && spellbooks[entry.id]) {
        this._preparedSpellSlots(entry, spellbooks[entry.id]);
      }
      entry.spellbook = spellbooks[entry.id];      
    }

    actorData.spellcastingEntries = spellcastingEntries;


    // Inventory encumbrance
    actorData.data.attributes.encumbrance = this._computeEncumbrance(totalWeight, actorData);
  }

  /* -------------------------------------------- */

  /**
   * Compute the level and percentage of encumbrance for an Actor.
   *
   * Optionally include the weight of carried currency across all denominations by applying the standard rule
   * from the PHB pg. 143
   *
   * @param {Number} totalWeight    The cumulative item weight from inventory items
   * @param {Object} actorData      The data object for the Actor being rendered
   * @return {Object}               An object describing the character's encumbrance level
   * @private
   */
  _computeEncumbrance(totalWeight, actorData) {

    // Encumbrance classes
/*     let mod = {
      tiny: 0.5,
      sm: 1,
      med: 1,
      lg: 2,
      huge: 4,
      grg: 8
    }[actorData.data.traits.size.value] || 1; */

    // Apply Powerful Build feat
    /* if ( this.actor.getFlag("dnd5e", "powerfulBuild") ) mod = Math.min(mod * 2, 8); */

    // Add Currency Weight
    const currency = actorData.data.currency;
    const numCoins = Object.values(currency).reduce((val, denom) => val += denom.value, 0);
    totalWeight += Math.floor(numCoins / 1000);
  

    // Compute Encumbrance percentage
    const enc = {
      max: actorData.data.abilities.str.mod + 5,
      value: Math.floor(totalWeight),
    };
    enc.pct = Math.min(enc.value * 100 / enc.max, 99);
    enc.encumbered = enc.pct > (2/3);
    return enc;
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

  }

}

// Register Character Sheet
Actors.registerSheet("pf2e", ActorSheetPF2eCharacter, {
  types: ["character"],
  makeDefault: true
});