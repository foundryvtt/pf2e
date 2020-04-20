import ActorSheetPF2e from './base.js';

class ActorSheetPF2eCharacter extends ActorSheetPF2e {
  static get defaultOptions() {
	  const options = super.defaultOptions;
	  mergeObject(options, {
      classes: options.classes.concat(['pf2e', 'actor', 'character-sheet']),
      width: 650,
      height: 720,
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-lower", initial: "biography"}],
      showUnpreparedSpells: false,
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
    if (!game.user.isGM && this.actor.limited) return `${path}limited-sheet.html`;
    return `${path}actor-sheet.html`;
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    // Temporary HP
    const { hp } = sheetData.data.attributes;
    if (hp.temp === 0) delete hp.temp;
    if (hp.tempmax === 0) delete hp.tempmax;

    // Update hero points label
    sheetData.data.attributes.heroPoints.icon = this._getHeroPointsIcon(sheetData.data.attributes.heroPoints.rank);
    sheetData.data.attributes.heroPoints.hover = CONFIG.PF2E.heroPointLevels[sheetData.data.attributes.heroPoints.rank];

    // Spell Details
    sheetData.magicTraditions = CONFIG.PF2E.magicTraditions;
    sheetData.preparationType = CONFIG.PF2E.preparationType;
    sheetData.showUnpreparedSpells = sheetData.options.showUnpreparedSpells;

    // Update dying icon and container width if a data migration is not required
    if (typeof sheetData.data.attributes.dying !== 'object') {
      console.log(`PF2e System | Migration for data.attributes.dying required for ${sheetData.actor.name}`);
    } else {
      sheetData.data.attributes.dying.containerWidth = 'width: ' + sheetData.data.attributes.dying.max*13 + 'px;';
      sheetData.data.attributes.dying.icon = this._getDyingIcon(sheetData.data.attributes.dying.value);
    }

    // Update wounded icon if a data migration is not required (perform data migration if it is)
    if (typeof sheetData.data.attributes.wounded !== 'object') {
      console.log(`PF2e System | Migration for data.attributes.wounded required for ${sheetData.actor.name}`);
    } else {
      sheetData.data.attributes.wounded.icon = this._getWoundedIcon(sheetData.data.attributes.wounded.value);
    }

    // Update doomed icon if a data migration is not required (perform data migration if it is)
    if (typeof sheetData.data.attributes.doomed !== 'object') {
      console.log(`PF2e System | Migration for data.attributes.doomed required for ${sheetData.actor.name}`);
    } else {
      sheetData.data.attributes.doomed.icon = this._getDoomedIcon(sheetData.data.attributes.doomed.value);
    }

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
      weapon: { label: game.i18n.localize("PF2E.InventoryWeaponsHeader"), items: [] },
      armor: { label: game.i18n.localize("PF2E.InventoryArmorHeader"), items: [] },
      equipment: { label: game.i18n.localize("PF2E.InventoryEquipmentHeader"), items: [] },
      consumable: { label: game.i18n.localize("PF2E.InventoryConsumablesHeader"), items: [] },
      backpack: { label: game.i18n.localize("PF2E.InventoryBackpackHeader"), items: [] },
    };

    // Spellbook
    // const spellbook = {};
    const tempSpellbook = [];
    const spellcastingEntriesList = [];
    const spellbooks = [];
    spellbooks.unassigned = {};

    // Spellcasting Entries
    const spellcastingEntries = [];

    // Feats
    const feats = {
      ancestry: { label: game.i18n.localize("PF2E.FeatAncestryHeader"), feats: [] },
	  ancestryfeature: { label: game.i18n.localize("PF2E.FeaturesAncestryHeader"), feats: [] },
	  archetype: { label: game.i18n.localize("PF2E.FeatArchetypeHeader"), feats: [] },
	  bonus: { label: game.i18n.localize("PF2E.FeatBonusHeader"), feats: [] },
	  class: { label: game.i18n.localize("PF2E.FeatClassHeader"), feats: [] },
	  classfeature: { label: game.i18n.localize("PF2E.FeaturesClassHeader"), feats: [] },
      skill: { label: game.i18n.localize("PF2E.FeatSkillHeader"), feats: [] },
      general: { label: game.i18n.localize("PF2E.FeatGeneralHeader"), feats: [] },
    };

    // Actions
    const actions = {
      action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
      reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
      free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
    };

    // Read-Only Actions
    const readonlyActions = {
      "interaction": { label: "Interaction Actions", actions: [] },
      "defensive": { label: "Defensive Actions", actions: [] },
      "offensive": { label: "Offensive Actions", actions: [] },
    }

    let readonlyEquipment = [];

    const attacks = {
      weapon: { label: 'Compendium Weapon', items: [], type: 'weapon' },
    };

    // Skills
    const lores = [];
    const martialSkills = [];

    // Iterate through items, allocating to containers
    let totalWeight = 0;
    for (const i of actorData.items) {
      i.img = i.img || CONST.DEFAULT_TOKEN;

      // Read-Only Equipment
      if (i.type === 'armor' || i.type === 'equipment' || i.type === 'consumable' || i.type === 'backpack') {
        readonlyEquipment.push(i);
        actorData.hasEquipment = true;
      }

      // Inventory
      if (Object.keys(inventory).includes(i.type)) {
        i.data.quantity.value = i.data.quantity.value || 0;
        i.data.weight.value = i.data.weight.value || 0;
        if (i.data.weight.value === 'L' || i.data.weight.value === 'l') {
          i.totalWeight = 'L';
          totalWeight += i.data.quantity.value * 0.1;
        } else if (parseInt(i.data.weight.value)) {
          i.totalWeight = Math.round(i.data.quantity.value * i.data.weight.value * 10) / 10;
          totalWeight += i.totalWeight;
        } else {
          i.totalWeight = '-';
        }
        i.hasCharges = (i.type === 'consumable') && i.data.charges.max > 0;
        i.isTwoHanded = (i.type === 'weapon') && !!((i.data.traits.value || []).find((x) => x.startsWith('two-hand')));
        i.wieldedTwoHanded = (i.type === 'weapon') && (i.data.hands || {}).value;
        if (i.type === 'weapon') {

          /* const isFinesse = (i.data.traits.value || []).includes('finesse');
          const abl = (isFinesse && actorData.data.abilities.dex.mod > actorData.data.abilities.str.mod ? 'dex' : (i.data.ability.value || 'str'));
          const prof = i.data.weaponType.value || 'simple'; */
          //let parts = ['@item.bonus.value', `@abilities.${abl}.mod`, `@martial.${prof}.value`];

          //i.attackRoll = parseInt(i.data.bonus.value) + actorData.data.abilities[abl].mod + actorData.data.martial[prof].value;
          let item;
          try {
            item = this.actor.getOwnedItem(i._id);
            i.chatData = item.getChatData({ secrets: this.actor.owner });
          } catch (err) {
            console.log(`PF2e System | Character Sheet | Could not load item ${i.name}`)
          }
          attacks["weapon"].items.push(i);
        }
        inventory[i.type].items.push(i);
      }

      // Spells
      else if (i.type === 'spell') {
        let item;
          try {
            item = this.actor.getOwnedItem(i._id);
            i.chatData = item.getChatData({ secrets: this.actor.owner });
          } catch (err) {
            console.log(`PF2e System | Character Sheet | Could not load item ${i.name}`)
          }
        tempSpellbook.push(i);
      }

      // Spellcasting Entries
      else if (i.type === 'spellcastingEntry') {
        // collect list of entries to use later to match spells against.
        spellcastingEntriesList.push(i._id);

        const spellProficiency = i.data.proficiency.value ? (i.data.proficiency.value * 2) + actorData.data.details.level.value : 0;
        const spellAbl = i.data.ability.value || 'int';
        const spellAttack = actorData.data.abilities[spellAbl].mod + spellProficiency + i.data.item.value;
        if (i.data.spelldc.value != spellAttack) {
          i.data.spelldc.value = spellAttack;
          i.data.spelldc.dc = spellAttack + 10;
          i.data.spelldc.mod = actorData.data.abilities[spellAbl].mod;
          // this.actor.updateOwnedItem(i, true);
          this.actor.updateEmbeddedEntity('OwnedItem', i);
        }
        i.data.spelldc.mod = actorData.data.abilities[spellAbl].mod;
        i.data.spelldc.breakdown = `10 + ${spellAbl} modifier(${actorData.data.abilities[spellAbl].mod}) + proficiency(${spellProficiency}) + item bonus(${i.data.item.value})`;

        i.data.spelldc.icon = this._getProficiencyIcon(i.data.proficiency.value);
        i.data.spelldc.hover = CONFIG.PF2E.proficiencyLevels[i.data.proficiency.value];
        i.data.tradition.title = CONFIG.PF2E.magicTraditions[i.data.tradition.value];
        i.data.prepared.title = CONFIG.PF2E.preparationType[i.data.prepared.value];
        // Check if prepared spellcasting type and set Boolean
        if ((i.data.prepared || {}).value === 'prepared') i.data.prepared.preparedSpells = true;
        else i.data.prepared.preparedSpells = false;
        // Check if Ritual spellcasting tradition and set Boolean
        if ((i.data.tradition || {}).value === 'ritual') i.data.tradition.ritual = true;
        else i.data.tradition.ritual = false;
        if ((i.data.tradition || {}).value === 'focus') {
          i.data.tradition.focus = true;
          if (i.data.focus == undefined) i.data.focus = { points: 1, pool: 1};
          i.data.focus.icon = this._getFocusIcon(i.data.focus);
        } else i.data.tradition.focus = false;

        spellcastingEntries.push(i);
      }

      // Feats
      else if (i.type === 'feat') {
        const featType = i.data.featType.value || 'bonus';
        const actionType = i.data.actionType.value || 'passive';

        feats[featType].feats.push(i);
        if (Object.keys(actions).includes(actionType)) {
          i.feat = true;
          let actionImg = 0;
          if (actionType === 'action') actionImg = parseInt((i.data.actions || {}).value) || 1;
          else if (actionType === 'reaction') actionImg = 'reaction';
          else if (actionType === 'free') actionImg = 'free';
          i.img = this._getActionImg(actionImg);
          actions[actionType].actions.push(i);

          // Read-Only Actions
          if(i.data.actionCategory && i.data.actionCategory.value) {
            switch(i.data.actionCategory.value){
              case 'interaction':
                readonlyActions.interaction.actions.push(i);
                actorData.hasInteractionActions = true;
              break;
              case 'defensive':
                readonlyActions.defensive.actions.push(i);
                actorData.hasDefensiveActions = true;
              break;
              //Should be offensive but throw anything else in there too
              default:
                readonlyActions.offensive.actions.push(i);
                actorData.hasOffensiveActions = true;
            }
          }
          else{
            readonlyActions.offensive.actions.push(i);
            actorData.hasOffensiveActions = true;
          }
        }
      }

      // Lore Skills
      else if (i.type === 'lore') {
        i.data.icon = this._getProficiencyIcon((i.data.proficient || {}).value);
        i.data.hover = CONFIG.PF2E.proficiencyLevels[((i.data.proficient || {}).value)];

        const proficiency = (i.data.proficient || {}).value ? ((i.data.proficient || {}).value * 2) + actorData.data.details.level.value : 0;
        const modifier = actorData.data.abilities.int.mod;
        const itemBonus = Number((i.data.item || {}).value || 0);
        i.data.itemBonus = itemBonus;
        i.data.value = modifier + proficiency + itemBonus;
        i.data.breakdown = `int modifier(${modifier}) + proficiency(${proficiency}) + item bonus(${itemBonus})`;

        lores.push(i);
      }

      // Martial Skills
      else if (i.type === 'martial') {
        i.data.icon = this._getProficiencyIcon((i.data.proficient || {}).value);
        i.data.hover = CONFIG.PF2E.proficiencyLevels[((i.data.proficient || {}).value)];

        const proficiency = (i.data.proficient || {}).value ? ((i.data.proficient || {}).value * 2) + actorData.data.details.level.value : 0;
        /* const itemBonus = Number((i.data.item || {}).value || 0);
        i.data.itemBonus = itemBonus; */
        i.data.value = proficiency// + itemBonus;
        i.data.breakdown = `proficiency(${proficiency})`;

        martialSkills.push(i);
      }

      // Actions
      if (i.type === 'action') {
        const actionType = i.data.actionType.value || 'action';
        let actionImg = 0;
        if (actionType === 'action') actionImg = parseInt(i.data.actions.value) || 1;
        else if (actionType === 'reaction') actionImg = 'reaction';
        else if (actionType === 'free') actionImg = 'free';
        else if (actionType === 'passive') actionImg = 'passive';
        i.img = this._getActionImg(actionImg);
        if (actionType === 'passive') actions.free.actions.push(i);
        else actions[actionType].actions.push(i);

        // Read-Only Actions
        if(i.data.actionCategory && i.data.actionCategory.value) {
          switch(i.data.actionCategory.value){
            case 'interaction':
              readonlyActions.interaction.actions.push(i);
              actorData.hasInteractionActions = true;
            break;
            case 'defensive':
              readonlyActions.defensive.actions.push(i);
              actorData.hasDefensiveActions = true;
            break;
            case 'offensive':
              //if (i)
              readonlyActions.offensive.actions.push(i);
              actorData.hasOffensiveActions = true;
            break;
            //Should be offensive but throw anything else in there too
            default:
              readonlyActions.offensive.actions.push(i);
              actorData.hasOffensiveActions = true;
          }
        }
        else{
          readonlyActions.offensive.actions.push(i);
          actorData.hasOffensiveActions = true;
        }
      }
    }

    const embeddedEntityUpdate = [];
    // Iterate through all spells in the temp spellbook and check that they are assigned to a valid spellcasting entry. If not place in unassigned.
    for (const i of tempSpellbook) {
      // check if the spell has a valid spellcasting entry assigned to the location value.
      if (spellcastingEntriesList.includes(i.data.location.value)) {
        const location = i.data.location.value;
        spellbooks[location] = spellbooks[location] || {};
        this._prepareSpell(actorData, spellbooks[location], i);
      } else if (spellcastingEntriesList.length === 1) { // if not BUT their is only one spellcasting entry then assign the spell to this entry.
        const location = spellcastingEntriesList[0];
        spellbooks[location] = spellbooks[location] || {};

        // Update spell to perminantly have the correct ID now
        // console.log(`PF2e System | Prepare Actor Data | Updating location for ${i.name}`);
        // this.actor.updateEmbeddedEntity("OwnedItem", { "_id": i._id, "data.location.value": spellcastingEntriesList[0]});
        embeddedEntityUpdate.push({ _id: i._id, 'data.location.value': spellcastingEntriesList[0] });

        this._prepareSpell(actorData, spellbooks[location], i);
      } else { // else throw it in the orphaned list.
        this._prepareSpell(actorData, spellbooks.unassigned, i);
      }
    }

    // Update all embedded entities that have an incorrect location.
    if (embeddedEntityUpdate.length) {
      console.log('PF2e System | Prepare Actor Data | Updating location for the following embedded entities: ', embeddedEntityUpdate);
      this.actor.updateManyEmbeddedEntities('OwnedItem', embeddedEntityUpdate);
      ui.notifications.info('PF2e actor data migration for orphaned spells applied. Please close actor and open again for changes to take affect.');
    }


    // Assign and return
    actorData.inventory = inventory;
    // Any spells found that don't belong to a spellcasting entry are added to a "orphaned spells" spell book (allowing the player to fix where they should go)
    if (Object.keys(spellbooks.unassigned).length) {
      actorData.orphanedSpells = true;
      actorData.orphanedSpellbook = spellbooks.unassigned;
    }
    actorData.feats = feats;
    actorData.attacks = attacks;
    actorData.actions = actions;
    actorData.readonlyActions = readonlyActions;
    actorData.readonlyEquipment = readonlyEquipment;
    actorData.lores = lores;
    actorData.martialSkills = martialSkills;


    for (const entry of spellcastingEntries) {
      if (entry.data.prepared.preparedSpells && spellbooks[entry._id]) {
        this._preparedSpellSlots(entry, spellbooks[entry._id]);
      }
      entry.spellbook = spellbooks[entry._id];
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
    const { currency } = actorData.data;
    const numCoins = Object.values(currency).reduce((val, denom) => val += parseInt(denom.value), 0);
    totalWeight += Math.floor(numCoins / 1000);


    // Compute Encumbrance percentage
    const enc = {
      max: actorData.data.abilities.str.mod + 5,
      value: Math.floor(totalWeight),
    };
    enc.pct = Math.min(enc.value * 100 / enc.max, 99);
    enc.encumbered = enc.pct > (2 / 3);
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
    if (!this.options.editable) return;
  }

  /**
   * Get the font-awesome icon used to display a certain level of focus points
   * expection focus = { points: 1, pool: 1}
   * @private
   */
  _getFocusIcon(focus) {
    const icons = {
      0: '<i class="far fa-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
      1: '<i class="fas fa-dot-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
      2: '<i class="fas fa-dot-circle"></i><i class="fas fa-dot-circle"></i><i class="far fa-circle"></i>',
      3: '<i class="fas fa-dot-circle"></i><i class="fas fa-dot-circle"></i><i class="fas fa-dot-circle"></i>',
    };
    return icons[focus.points];
  }
}

export default ActorSheetPF2eCharacter;
