/**
 * Extend the basic ActorSheet class to do all the PF2e things!
 * This sheet is an Abstract layer which is not used.
 */
class ActorSheetPF2e extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      scrollY: [
        '.sheet-sidebar',
        '.spellcastingEntry-list',
        '.actions-list',
        '.skills-pane',
        '.feats-pane',
        '.inventory-pane',
        '.actions-pane',
      ],
    });
  }

  /**
   * Return the type of the current Actor
   * @type {String}
   */
  get actorType() {
	  return this.actor.data.type;
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    // Update martial skill labels
    for (const [s, skl] of Object.entries(sheetData.data.martial)) {
      skl.icon = this._getProficiencyIcon(skl.rank);
      skl.hover = CONFIG.PF2E.proficiencyLevels[skl.rank];
      skl.label = CONFIG.PF2E.martialSkills[s];
      skl.value = skl.rank ? (skl.rank * 2) + sheetData.data.details.level.value : 0;
    }

    // Update save labels
    for (const [s, save] of Object.entries(sheetData.data.saves)) {
      save.icon = this._getProficiencyIcon(save.rank);
      save.hover = CONFIG.PF2E.proficiencyLevels[save.rank];
      save.label = CONFIG.PF2E.saves[s];
    }


    // Update proficiency label
    sheetData.data.attributes.perception.icon = this._getProficiencyIcon(sheetData.data.attributes.perception.rank);
    sheetData.data.attributes.perception.hover = CONFIG.PF2E.proficiencyLevels[sheetData.data.attributes.perception.rank];

    // Ability Scores
    for ( let [a, abl] of Object.entries(sheetData.data.abilities)) {
      abl.label = CONFIG.PF2E.abilities[a];
    }

    // Update skill labels
    for (let [s, skl] of Object.entries(sheetData.data.skills)) {
      skl.ability = sheetData.data.abilities[skl.ability].label.substring(0, 3);
      skl.icon = this._getProficiencyIcon(skl.rank);
      skl.hover = CONFIG.PF2E.proficiencyLevels[skl.value];
      skl.label = CONFIG.PF2E.skills[s];
    }

    // Currency Labels
    for ( let [c, currency] of Object.entries(sheetData.data.currency)) {
      currency.label = CONFIG.PF2E.currencies[c];
    }

    // Update traits
    sheetData.abilities = CONFIG.PF2E.abilities;
    sheetData.actorSizes = CONFIG.PF2E.actorSizes;
    sheetData.alignment = CONFIG.PF2E.alignment;
    sheetData.rarity = CONFIG.PF2E.rarityTraits;
    this._prepareTraits(sheetData.data.traits);

    // Prepare owned items
    this._prepareItems(sheetData.actor);

    // Return data to the sheet
    return sheetData;
  }

  _findActiveList() {
    return this.element.find('.tab.active .directory-list');
  }

  /* -------------------------------------------- */

  _prepareTraits(traits) {
    const map = {
      languages: CONFIG.PF2E.languages,
      dr: CONFIG.PF2E.resistanceTypes,
      di: CONFIG.PF2E.immunityTypes,
      dv: CONFIG.PF2E.weaknessTypes,
      ci: CONFIG.PF2E.immunityTypes,
      traits: CONFIG.PF2E.monsterTraits,
    };

    for (const [t, choices] of Object.entries(map)) {
      const trait = traits[t] || {value: [], selected: []};

      if (Array.isArray(trait)) {
        trait.selected = {};
        for (const entry of trait) {
          if (typeof entry === 'object') {
            if ('exceptions' in entry && entry.exceptions != "")
              trait.selected[entry.type] = `${choices[entry.type]} (${entry.value}) [${entry.exceptions}]`;
            else
              trait.selected[entry.type] = `${choices[entry.type]} (${entry.value})`;
          } else {
            trait.selected[entry] = choices[entry] || `${entry}`;
          }
        }
      } else {
        trait.selected = trait.value.reduce((obj, t) => {
          obj[t] = choices[t];
           return obj;
        }, {});
      }

      // Add custom entry
      if (trait.custom) trait.selected.custom = trait.custom;
    }
  }

  /* -------------------------------------------- */

  /**
   * Insert a spell into the spellbook object when rendering the character sheet
   * @param {Object} actorData    The Actor data being prepared
   * @param {Object} spellbook    The spellbook data being prepared
   * @param {Object} spell        The spell data being prepared
   * @private
   */
  _prepareSpell(actorData, spellbook, spell) {
    const lvl = (Number(spell.data.level.value) < 11) ? Number(spell.data.level.value) : 10;
    const isNPC = this.actorType === 'npc';
    let spellcastingEntry = '';

    if ((spell.data.location || {}).value) {
      spellcastingEntry = (this.actor.getOwnedItem(spell.data.location.value) || {}).data;
    }

    // Extend the Spellbook level
    spellbook[lvl] = spellbook[lvl] || {
      isCantrip: lvl === 0,
      isFocus: lvl === 11,
      label: CONFIG.PF2E.spellLevels[lvl],
      spells: [],
      prepared: [],
      uses: spellcastingEntry ? parseInt(spellcastingEntry.data.slots[`slot${lvl}`].value) || 0 : 0,
      slots: spellcastingEntry ? parseInt(spellcastingEntry.data.slots[`slot${lvl}`].max) || 0 : 0,
      displayPrepared: spellcastingEntry && spellcastingEntry.data.displayLevels && spellcastingEntry.data.displayLevels[lvl] !== undefined ? (spellcastingEntry.data.displayLevels[lvl]) : true,
      unpreparedSpellsLabel: spellcastingEntry ? (spellcastingEntry.data.tradition.value=='arcane' && spellcastingEntry.data.prepared.value=='prepared') ? game.i18n.localize("PF2E.UnpreparedSpellsLabelArcanePrepared") : game.i18n.localize("PF2E.UnpreparedSpellsLabel") : game.i18n.localize("PF2E.UnpreparedSpellsLabel")
    };

    // Add the spell to the spellbook at the appropriate level
    spell.data.school.str = CONFIG.PF2E.spellSchools[spell.data.school.value];
    // Add chat data
    try {
      let item = this.actor.getOwnedItem(spell._id);
      if (item){
        spell.chatData = item.getChatData({ secrets: this.actor.owner });
      }
    } catch (err) {
      console.log(`PF2e System | Character Sheet | Could not load chat data for spell ${spell.id}`, spell)
    }
    spellbook[lvl].spells.push(spell);
  }


  /* -------------------------------------------- */

  /**
   * Insert prepared spells into the spellbook object when rendering the character sheet
   * @param {Object} spellcastingEntry    The spellcasting entry data being prepared
   * @param {Object} spellbook            The spellbook data being prepared
   * @private
   */
  _preparedSpellSlots(spellcastingEntry, spellbook) {
    // let isNPC = this.actorType === "npc";

    for (const [key, spl] of Object.entries(spellbook)) {
      if (spl.slots > 0) {
        for (let i = 0; i < spl.slots; i++) {
          const entrySlot = ((spellcastingEntry.data.slots[`slot${key}`] || {}).prepared || {})[i] || null;

          if (entrySlot && entrySlot.id) {
            //console.log(`PF2e System | Getting item: ${entrySlot.id}: `);
            let item = this.actor.getOwnedItem(entrySlot.id);
            if (item) {
              //console.log(`PF2e System | Duplicating item: ${item.name}: `, item);
              let itemCopy = duplicate(item);
              if (entrySlot.expended) {
                itemCopy.expended = true;
              }
              else {
                itemCopy.expended = false;
              }

              spl.prepared[i] = itemCopy;
              if (spl.prepared[i]) {
                // enrich data with spell school formatted string
                if (spl.prepared[i].data && spl.prepared[i].data.school && spl.prepared[i].data.school.str) {
                  spl.prepared[i].data.school.str = CONFIG.PF2E.spellSchools[spl.prepared[i].data.school.value];
                }

                // Add chat data
                try {
                  spl.prepared[i].chatData = item.getChatData({ secrets: this.actor.owner });
                } catch (err) {
                  console.log(`PF2e System | Character Sheet | Could not load prepared spell ${entrySlot.id}`, item)
                }


                spl.prepared[i].prepared = true;
              }
              // prepared spell not found
              else {
                spl.prepared[i] = {
                  name: 'Empty Slot (drag spell here)',
                  id: null,
                  prepared: false,
                };
              }
            } else {
              // Could not find an item for ID: ${entrySlot.id}. Marking the slot as empty so it can be overwritten.
              spl.prepared[i] = {
                name: 'Empty Slot (drag spell here)',
                id: null,
                prepared: false,
              };
            }
          } else {
            // if there is no prepared spell for this slot then make it empty.
            spl.prepared[i] = {
              name: 'Empty Slot (drag spell here)',
              id: null,
              prepared: false,
            };
          }
        }
        if (spl.prepared.length > spl.slots) {
          for (let i = 0; i < spl.prepared.length - spl.slots; i++) {
            i.pop();
          }
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare Spell SLot
   * Saves the prepared spell slot data to the actor
   * @param spellLevel {String}   The level of the spell slot
   * @param spellSlot {String}    The number of the spell slot
   * @param spell {String}        The item details for the spell
   */
  async _allocatePreparedSpellSlot(spellLevel, spellSlot, spell, entryId) {
    // let spellcastingEntry = this.actor.items.find(i => { return i.id === Number(entryId) });;
    // let spellcastingEntry = this.actor.getOwnedItem(Number(entryId)).data;

    // If NPC, then update icons to action icons.
/*     const isNPC = this.actorType === 'npc';
    if (isNPC) {
      const spellType = spell.data.time.value;
      if (spellType === 'reaction') spell.img = this._getActionImg('reaction');
      else if (spellType === 'free') spell.img = this._getActionImg('free');
      else if (parseInt(spellType)) spell.img = this._getActionImg(parseInt(spellType));
    } */

    // spellcastingEntry.data.slots["slot" + spellLevel].prepared[spellSlot] = spell;
    /* spellcastingEntry.data.slots["slot" + spellLevel].prepared[spellSlot] = {
      id: spell.id
    };
    await this.actor.updateOwnedItem(spellcastingEntry, true);  */
    const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
    const options = {
      _id: entryId,
    };
    options[key] = { id: spell._id };
    this.actor.updateEmbeddedEntity('OwnedItem', options);
  }

  /* -------------------------------------------- */

  /**
   * Remove Spell Slot
   * Removes the spell from the saved spell slot data for the actor
   * @param spellLevel {String}   The level of the spell slot
   * @param spellSlot {String}    The number of the spell slot    *
   */
  async _removePreparedSpellSlot(spellLevel, spellSlot, entryId) {
    // let spellcastingEntry = this.actor.items.find(i => { return i.id === Number(entryId) });;
    /*     let spellcastingEntry = this.actor.getOwnedItem(Number(entryId)).data;

    spellcastingEntry.data.slots["slot" + spellLevel].prepared[spellSlot] = {
      name: "Empty Slot (drag spell here)",
      id: null,
      prepared: false
    };
    await this.actor.updateOwnedItem(spellcastingEntry, true);  */

    const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
    const options = {
      _id: entryId,
    };
    options[key] = {
      name: 'Empty Slot (drag spell here)',
      id: null,
      prepared: false,
    };
    this.actor.updateEmbeddedEntity('OwnedItem', options);
  }

  /**
   * Sets the expended state of a  Spell Slot
   * Marks the slot as expended which is reflected in the UI
   * @param spellLevel {String}   The level of the spell slot
   * @param spellSlot {String}    The number of the spell slot    *
   */
  async _setExpendedPreparedSpellSlot(spellLevel, spellSlot, entryId, expendedState) {
    let state = true;
    if (expendedState === "true") state = false;

    const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
    const options = {
      _id: entryId,
    };
    options[key] = {
      expended: state,
    };
    this.actor.updateEmbeddedEntity('OwnedItem', options);
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of skill proficiency
   * @private
   */
  _getProficiencyIcon(level) {
    const icons = {
      0: '',
      1: '<i class="fas fa-check-circle"></i>',
      2: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
      3: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
      4: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
    };
    return icons[level];
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of dying
   * @private
   */
  _getDyingIcon(level) {
    const maxDying = this.object.data.data.attributes.dying.max || 4;
    const doomed = this.object.data.data.attributes.doomed.value || 0;
    const circle = '<i class="far fa-circle"></i>';
    const cross = '<i class="fas fa-times-circle"></i>';
    const skull = '<i class="fas fa-skull"></i>';
    const redOpen = '<span style="color:var(--tertiary-background);">';
    const redClose = '</span>';
    let icons = {};

    for  (let dyingLevel = 0; dyingLevel <= maxDying; dyingLevel++) {
      icons[dyingLevel] = (dyingLevel==maxDying) ? redOpen : ('');
      for  (let column = 1; column <= maxDying; column++) {
        icons[dyingLevel] += (column>=(maxDying-doomed) || dyingLevel==maxDying) ? skull : ( (dyingLevel<column) ? circle : cross );
      }
      icons[dyingLevel] += (dyingLevel==maxDying) ? redClose : ('');
    }

    return icons[level];
  }

  /**
   * Get the font-awesome icon used to display a certain level of wounded
   * @private
   */
  _getWoundedIcon(level) {
    const maxDying = this.object.data.data.attributes.dying.max || 4;
    const icons = {};
    const usedPoint = '<i class="fas fa-dot-circle"></i>';
    const unUsedPoint = '<i class="far fa-circle"></i>';

    for (let i=0; i<maxDying; i++) {
      let iconHtml = '';
      for (let iconColumn=1; iconColumn<maxDying; iconColumn++) {
        iconHtml += (iconColumn<=i) ? usedPoint : unUsedPoint;
      }
      icons[i] = iconHtml;
    }

    return icons[level];
  }

  /**
   * Get the font-awesome icon used to display a certain level of doomed
   * @private
   */
  _getDoomedIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
      1: '<i class="fas fa-skull" style="color:var(--tertiary-background);"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
      2: '<i class="fas fa-skull" style="color:var(--tertiary-background);"></i><i class="fas fa-skull" style="color:var(--tertiary-background);"></i><i class="far fa-circle"></i>',
      3: '<i class="fas fa-skull" style="color:var(--tertiary-background);"></i><i class="fas fa-skull" style="color:var(--tertiary-background);"></i><i class="fas fa-skull" style="color:var(--tertiary-background);"></i>',
    };
    return icons[level];
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display hero points
   * @private
   */
  _getHeroPointsIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
      1: '<i class="fas fa-hospital-symbol"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
      2: '<i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i><i class="far fa-circle"></i>',
      3: '<i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i>',
    };
    return icons[level];
  }

  /* -------------------------------------------- */

  /**
   * Get the action image to use for a particular action type.
   * @private
   */
  _getActionImg(action) {
    const img = {
      0: 'icons/svg/mystery-man.svg',
      1: 'systems/pf2e/icons/actions/OneAction.png',
      2: 'systems/pf2e/icons/actions/TwoActions.png',
      3: 'systems/pf2e/icons/actions/ThreeActions.png',
      free: 'systems/pf2e/icons/actions/FreeAction.png',
      reaction: 'systems/pf2e/icons/actions/Reaction.png',
      passive: 'systems/pf2e/icons/actions/Passive.png',
    };
    return img[action];
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

    // Pad field width
    html.find('[data-wpad]').each((i, e) => {
      const text = e.tagName === 'INPUT' ? e.value : e.innerText;
      const w = text.length * parseInt(e.getAttribute('data-wpad')) / 2;
      e.setAttribute('style', `flex: 0 0 ${w}px`);
    });

    // Item summaries
    html.find('.item .item-name h4').click((event) => {
      this._onItemSummary(event);
    });

    // NPC Attack summaries
    html.find('.item .melee-name h4').click((event) => {
      this._onItemSummary(event);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    /* -------------------------------------------- */
    /*  Attributes, Skills, Saves and Traits
     /* -------------------------------------------- */

    // Roll Save Checks
    html.find('.save-name').click((ev) => {
      ev.preventDefault();
      const save = ev.currentTarget.parentElement.getAttribute('data-save');
      this.actor.rollSave(ev, save);
    });

    // Roll Attribute Checks
    html.find('.attribute-name').click((ev) => {
      ev.preventDefault();
      const attribute = ev.currentTarget.parentElement.getAttribute('data-attribute');
      this.actor.rollAttribute(ev, attribute);
    });

    // Roll Ability Checks
    html.find('.ability-name').click((ev) => {
      ev.preventDefault();
      const ability = ev.currentTarget.parentElement.getAttribute('data-ability');
      this.actor.rollAbility(ev, ability);
    });

    // Roll Skill Checks
    html.find('.skill-name.rollable').click((ev) => {
      const skl = ev.currentTarget.parentElement.getAttribute('data-skill');
      this.actor.rollSkill(ev, skl);
    });

    // Roll Recovery Flat Check when Dying
    html.find('.recoveryCheck.rollable').click((ev) => {
      this.actor.rollRecovery(ev);
    });

    //Toggle Levels of stats (like proficiencies conditions or hero points)
    html.find('.click-stat-level').on('click contextmenu', this._onClickStatLevel.bind(this));

    // Toggle Dying Wounded
    html.find('.dying-click').on('click contextmenu', this._onClickDying.bind(this));

    // Toggle Skill Proficiency
    // Can be removed later as replaced with .click-stat-level, commented out for now
    // html.find('.proficiency-click').on('click contextmenu', this._onCycleSkillProficiency.bind(this));

    // Prepare Spell Slot
    html.find('.prepare-click').click((ev) => {
      const itemId = 10;
      const slotId = Number($(ev.currentTarget).parents('.item').attr('data-item-id'));
      const spellLvl = Number($(ev.currentTarget).parents('.item').attr('data-spell-lvl'));
      const entryId = $(ev.currentTarget).parents('.item').attr('data-entry-id');
      // spell = this.actor.items.find(i => { return i.id === itemId });
      const spell = this.actor.getOwnedItem(itemId).data;

      this.actor.allocatePreparedSpellSlot(spellLvl, slotId, spell, entryId);
    });

    // Remove Spell Slot
    html.find('.item-unprepare').click((ev) => {
      const slotId = Number($(ev.currentTarget).parents('.item').attr('data-slot-id'));
      const spellLvl = Number($(ev.currentTarget).parents('.item').attr('data-spell-lvl'));
      const entryId = $(ev.currentTarget).parents('.item').attr('data-entry-id');
      this._removePreparedSpellSlot(spellLvl, slotId, entryId);
    });

    // Set Expended Status of Spell Slot
    html.find('.item-toggle-prepare').click((ev) => {
      const slotId = Number($(ev.currentTarget).parents('.item').attr('data-slot-id'));
      const spellLvl = Number($(ev.currentTarget).parents('.item').attr('data-spell-lvl'));
      const entryId = $(ev.currentTarget).parents('.item').attr('data-entry-id');
      const expendedState = $(ev.currentTarget).parents('.item').attr('data-expended-state');
      this._setExpendedPreparedSpellSlot(spellLvl, slotId, entryId, expendedState);
    });

    // Toggle equip
    html.find('.item-toggle-equip').click((ev) => {
      const f = $(event.currentTarget);
      const itemId = f.parents('.item').attr('data-item-id');
      f.toggleClass('active');
      const active = f.hasClass('active');
      this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.equipped.value': active });

    });

    // Trait Selector
    html.find('.trait-selector').click((ev) => this._onTraitSelector(ev));

    // Feat Browser
    html.find('.feat-browse').click((ev) => featBrowser.render(true));

    // Action Browser
    html.find('.action-browse').click((ev) => actionBrowser.render(true));

    // Spell Browser
    html.find('.spell-browse').click((ev) => spellBrowser.render(true));

    // Inventory Browser
    html.find('.inventory-browse').click((ev) => inventoryBrowser.render(true));

    // Spell Create
    html.find('.spell-create').click((ev) => this._onItemCreate(ev));

    // Add Spellcasting Entry
    html.find('.spellcasting-create').click((ev) => this._createSpellcastingEntry(ev));

    // Remove Spellcasting Entry
    html.find('.spellcasting-remove').click((ev) => this._removeSpellcastingEntry(ev));

    // toggle visibility of filter containers
    html.find('.hide-container-toggle').click((ev) => {
      $(ev.target).parent().siblings().toggle(100, (e) => { });
    });

    /* -------------------------------------------- */
    /*  Inventory
    /* -------------------------------------------- */

    // Create New Item
    html.find('.item-create').click((ev) => this._onItemCreate(ev));

    // Update Inventory Item
    html.find('.item-edit').click((ev) => {
      const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
      const Item = CONFIG.Item.entityClass;
      // const item = new Item(this.actor.items.find(i => i.id === itemId), {actor: this.actor});
      const item = new Item(this.actor.getOwnedItem(itemId).data, { actor: this.actor });
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click((ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const itemId = li.attr('data-item-id');
      this.actor.deleteOwnedItem(itemId);
      li.slideUp(200, () => this.render(false));
    });

    // Increase Item Quantity
    html.find('.item-increase-quantity').click((event) => {
      const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
      const item = this.actor.getOwnedItem(itemId).data;
      this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.quantity.value': Number(item.data.quantity.value) + 1 });
    });

    // Decrease Item Quantity
    html.find('.item-decrease-quantity').click((event) => {
      const li = $(event.currentTarget).parents('.item');
      const itemId = li.attr('data-item-id');
      const item = this.actor.getOwnedItem(itemId).data;
      if (Number(item.data.quantity.value) > 1) {
        this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.quantity.value': Number(item.data.quantity.value) - 1 });
      } else {
        this.actor.deleteOwnedItem(itemId);
        li.slideUp(200, () => this.render(false));
      }
    });

    // Toggle Spell prepared value
    html.find('.item-prepare').click((ev) => {
      const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
      // item = this.actor.items.find(i => { return i.id === itemId });
      const item = this.actor.getOwnedItem(itemId).data;
      item.data.prepared.value = !item.data.prepared.value;
      this.actor.updateEmbeddedEntity('OwnedItem', item);
    });

    // Item Dragging
    const handler = (ev) => this._onDragItemStart(ev);
    html.find('.item').each((i, li) => {
      li.setAttribute('draggable', true);
      li.addEventListener('dragstart', handler, false);
    });

    // Item Rolling
    html.find('.item .item-image').click((event) => this._onItemRoll(event));

    // NPC Weapon Rolling
    html.find('button').click((ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
      // item = this.actor.items.find(i => { return i.id === itemId });
      const item = this.actor.getOwnedItem(itemId);

      // which function gets called depends on the type of button stored in the dataset attribute action
      switch (ev.target.dataset.action) {
        case 'weaponAttack': item.rollWeaponAttack(ev); break;
        case 'weaponAttack2': item.rollWeaponAttack(ev, 2); break;
        case 'weaponAttack3': item.rollWeaponAttack(ev, 3); break;
        case 'weaponDamage': item.rollWeaponDamage(ev); break;
        case 'weaponDamageCritical': item.rollWeaponDamage(ev, true); break;
        case 'npcAttack': item.rollNPCAttack(ev); break;
        case 'npcAttack2': item.rollNPCAttack(ev, 2); break;
        case 'npcAttack3': item.rollNPCAttack(ev, 3); break;
        case 'npcDamage': item.rollNPCDamage(ev); break;
        case 'npcDamageCritical': item.rollNPCDamage(ev, true); break;
        case 'spellAttack': item.rollSpellAttack(ev); break;
        case 'spellDamage': item.rollSpellDamage(ev); break;
        case 'featAttack': item.rollFeatAttack(ev); break;
        case 'featDamage': item.rollFeatDamage(ev); break;
        case 'consume': item.rollConsumable(ev); break;
        case 'toolCheck': item.rollToolCheck(ev); break;
      }
    });

    // Lore Item Rolling
    html.find('.item .lore-score-rollable').click((event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
      const item = this.actor.getOwnedItem(itemId);
      this.actor.rollLoreSkill(event, item);
    });


    // Update Item Bonus on an actor.item input
    html.find('.focus-pool-input').change(async (event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
      const focusPool = Math.clamped(Number(event.target.value), 0, 3);
      const item = this.actor.getOwnedItem(itemId);
      let focusPoints = getProperty(item.data, 'data.focus.points') || 0;
      focusPoints = Math.clamped( focusPoints , 0, focusPool );
      await this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.focus.points': focusPoints, 'data.focus.pool': focusPool });
    });

    // Update Item Bonus on an actor.item input
    html.find('.item-value-input').change(async (event) => {
      event.preventDefault();

      let itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
      // let itemToEdit = this.actor.items.find(i => i.id === itemId);
      // let itemToEdit = (this.actor.getOwnedItem(itemId) || {}).data;

      if (!itemId) {
        itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
        // itemToEdit = this.actor.items.find(i => i.id === itemId);
        // itemToEdit = this.actor.getOwnedItem(itemId).data;
        // itemToEdit.data.item.value = Number(event.target.value);
      }

      // Need to update all skills every time because if the user tabbed through and updated many, only the last one would be saved
      // let skills = this.actor.items.filter(i => i.type == itemToEdit.type)
      // for(let skill of skills)
      // {
      // await this.actor.updateOwnedItem(itemToEdit);
      // await this.actor.updateEmbeddedEntity("OwnedItem", itemToEdit);
      await this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.item.value': Number(event.target.value) });
      // }
    });

    // Update Item Name
    html.find('.item-name-input').change(async (event) => {
      const itemId = event.target.attributes['data-item-id'].value;
      // const itemToEdit = this.actor.items.find(i => i.id === itemId);
      // const itemToEdit = this.actor.getOwnedItem(itemId).data;
      // itemToEdit.name = event.target.value;

      // Need to update all skills every time because if the user tabbed through and updated many, only the last one would be saved
      // let skills = this.actor.items.filter(i => i.type == itemToEdit.type)
      // for(let skill of skills)
      // {
      // await this.actor.updateOwnedItem(itemToEdit);
      await this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, name: event.target.value });
      // }
    });


    // Update used slots for Spell Items
    html.find('.spell-slots-input').change(async (event) => {
      event.preventDefault();

      const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
      const slotLvl = Number($(event.currentTarget).parents('.item').attr('data-level'));
      // const itemToEdit = this.actor.items.find(i => i.id === itemId);
      // const itemToEdit = this.actor.getOwnedItem(itemId).data;
      // itemToEdit.data.slots["slot" + slotLvl].value = Number(event.target.value);

      // Need to update all items every time because if the user tabbed through and updated many, only the last one would be saved
      // let items = this.actor.items.filter(i => i.type == itemToEdit.type)
      // for(let item of items)
      // {
      // await this.actor.updateOwnedItem(itemToEdit);

      const key = `data.slots.slot${slotLvl}.value`;
      const options = { _id: itemId };
      options[key] = Number(event.target.value);

      await this.actor.updateEmbeddedEntity('OwnedItem', options);
      // }
    });

    // Update max slots for Spell Items
    html.find('.spell-max-input').change(async (event) => {
      event.preventDefault();

      const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
      const slotLvl = Number($(event.currentTarget).parents('.item').attr('data-level'));
      const key = `data.slots.slot${slotLvl}.max`;
      const options = { _id: itemId };
      options[key] = Number(event.target.value);

      await this.actor.updateEmbeddedEntity('OwnedItem', options);
      // }
    });

    // Modify select element
    html.find('.ability-select').change(async (event) => {
      event.preventDefault();

      const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
      // const itemToEdit = this.actor.items.find(i => i.id === itemId);
      // const itemToEdit = this.actor.getOwnedItem(itemId).data;
      // itemToEdit.data.ability.value = event.target.value;

      // Need to update all skills every time because if the user tabbed through and updated many, only the last one would be saved
      // let skills = this.actor.items.filter(i => i.type == itemToEdit.type)
      // for(let skill of skills)
      // {
      // await this.actor.updateOwnedItem(itemToEdit);
      // await this.actor.updateEmbeddedEntity("OwnedItem", itemToEdit);
      await this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.ability.value': event.target.value });
      // }
    });

    // Update max slots for Spell Items
    html.find('.prepared-toggle').click(async (event) => {
      event.preventDefault();

      const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
      // const itemToEdit = this.actor.items.find(i => i.id === itemId);
      const itemToEdit = this.actor.getOwnedItem(itemId).data;
      const bool = !(itemToEdit.data.showUnpreparedSpells || {}).value;

      // await this.actor.updateOwnedItem(itemToEdit);
      // await this.actor.updateEmbeddedEntity("OwnedItem", itemToEdit);
      await this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.showUnpreparedSpells.value': bool });
    });

    html.find('.level-prepared-toggle').click(async (event) => {
      event.preventDefault();

      const parentNode = $(event.currentTarget).parents('.spellbook-header');
      const itemId = parentNode.attr('data-item-id');
      const lvl = parentNode.attr('data-level')
      const itemToEdit = this.actor.getOwnedItem(itemId).data;
      const currentDisplayLevels = itemToEdit.data.displayLevels || {};
      const bool = (currentDisplayLevels[lvl] === true) ? false : true;
      currentDisplayLevels[lvl] = bool;
      await this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.displayLevels': currentDisplayLevels });
      this.render();
    });

    Hooks.on("createOwnedItem", (actor, item) => {
      // Show unprepared spells if creating a new item
      if (item.type == "spell") {
        const currentLvlToDisplay = {};
        currentLvlToDisplay[item.data.level.value] = true;
        this.actor.updateEmbeddedEntity('OwnedItem', {
          _id: item.data.location.value,
          'data.showUnpreparedSpells.value': true,
          'data.displayLevels': currentLvlToDisplay
        });
      }
    });

  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle cycling proficiency in a Skill
   * @private
   */
  // _onCycleSkillProficiency(event) {
  //   event.preventDefault();
  //   const field = $(event.currentTarget).siblings('input[type="hidden"]');

  //   // Get the skill type (used to determine if this is a Lore skill)
  //   const skillType = $(event.currentTarget).parents('.item').attr('data-item-type');
  //   const containerType = $(event.currentTarget).parents('.item-container').attr('data-container-type');

  //   // Get the current level and the array of levels
  //   const level = parseFloat(field.val());
  //   const levels = [0, 1, 2, 3, 4];
  //   const idx = levels.indexOf(level);
  //   let newLevel = '';

  //   // Toggle next level - forward on click, backwards on right
  //   if (event.type === 'click') {
  //     newLevel = levels[(idx === levels.length - 1) ? 0 : idx + 1];
  //   } else if (event.type === 'contextmenu') {
  //     newLevel = levels[(idx === 0) ? levels.length - 1 : idx - 1];
  //   }

  //   // Update the field value and save the form
  //   if (skillType === 'lore' || skillType === 'martial') {
  //     const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
  //     // const itemToEdit = this.actor.items.find(i => i.id === itemId);
  //     // const itemToEdit = this.actor.getOwnedItem(itemId).data;
  //     /* itemToEdit.data.proficient.value = newLevel;
  //     this.actor.updateOwnedItem(itemToEdit); */

  //     this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.proficient.value': newLevel });
  //   } else if (containerType === 'spellcastingEntry') {
  //     const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
  //     // const itemToEdit = this.actor.items.find(i => i.id === itemId);
  //     /* const itemToEdit = this.actor.getOwnedItem(itemId).data;
  //     itemToEdit.data.proficiency.value = newLevel;
  //     this.actor.updateOwnedItem(itemToEdit); */

  //     this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.proficiency.value': newLevel });
  //   } else {
  //     field.val(newLevel);
  //     this._onSubmit(event);
  //   }
  // }

  /**
   * Handle cycling of dying
   * @private
   */
  _onClickDying(event) {
    event.preventDefault();
    const field = $(event.currentTarget).siblings('input[type="hidden"]');
    const maxDying = this.object.data.data.attributes.dying.max;
    // const wounded = this.object.data.data.attributes.wounded.value;
    const wounded = 0; //Don't automate wounded when clicking on dying until dying is also automated on damage from chat and Recovery rolls
    const doomed = this.object.data.data.attributes.doomed.value;

    // Get the current level and the array of levels
    const level = parseFloat(field.val());
    let newLevel = '';

    // Toggle next level - forward on click, backwards on right
    if (event.type === 'click') {
      newLevel = Math.clamped( (level + 1 + wounded) , 0, maxDying );
      if (newLevel+doomed >= maxDying) newLevel = maxDying;
    } else if (event.type === 'contextmenu') {
      newLevel = Math.clamped( (level - 1) , 0, maxDying );
      if (newLevel+doomed >= maxDying) newLevel -= doomed;
    }

    // Update the field value and save the form
    field.val(newLevel);
    this._onSubmit(event);
  }

  /**
   * Handle clicking of stat levels. The max level is by default 4.
   * The max level can be set in the hidden input field with a data-max attribute. Eg: data-max="3"
   * @private
   */
  _onClickStatLevel(event) {
    event.preventDefault();
    const field = $(event.currentTarget).siblings('input[type="hidden"]');
    const max = (field.data('max')==undefined) ? 4 : field.data('max');
    const statIsItemType = (field.data('stat-type')==undefined) ? false : field.data('stat-type');

    // Get the current level and the array of levels
    const level = parseFloat(field.val());
    let newLevel = '';

    // Toggle next level - forward on click, backwards on right
    if (event.type === 'click') {
      newLevel = Math.clamped( (level + 1) , 0, max );
    } else if (event.type === 'contextmenu') {
      newLevel = Math.clamped( (level - 1) , 0, max );
    }
    // Update the field value and save the form

    if(statIsItemType=='item') {
      let itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
      if (itemId == undefined) {
        // Then item is spellcastingEntry, this could be refactored
        // but data-contained-id and proviciency/proficient need to be refactored everywhere to give
        // Lore Skills, Martial Skills and Spellcasting Entries the same structure.

        itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
        if ($(event.currentTarget).attr('title') == game.i18n.localize("PF2E.Focus.pointTitle")) {
          const item = this.actor.getOwnedItem(itemId);
          const focusPoolSize = getProperty(item.data, 'data.focus.pool') || 1;
          newLevel = Math.clamped( newLevel , 0, focusPoolSize );
          this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.focus.points': newLevel });
        } else {
          this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.proficiency.value': newLevel });
        }
      } else {
        this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.proficient.value': newLevel });
      }
      return;
    }
    field.val(newLevel);
    this._onSubmit(event);
  }


  /* -------------------------------------------- */

  /*   _onDragItemStart(event) {

	  event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      actorId: this.actor._id,
      id: itemId
    }));
  } */
  _onDragItemStart(event) {
    const itemId = event.currentTarget.getAttribute('data-item-id');
    const containerType = event.currentTarget.getAttribute('data-container-type');

    if (itemId) {
      const item = this.actor.getOwnedItem(itemId);
	    event.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'Item',
        data: item.data,
        actorId: this.actor._id,
        id: itemId,
      }));
    } else if (containerType === 'spellcastingEntry') return;
  }

  /* -------------------------------------------- */

  /**
   * Extend the base _onDrop method to handle dragging spells onto spell slots.
   * @private
   */
  async _onDrop(event) {
    event.preventDefault();

    // get the item type of the drop target
    const dropSlotType = $(event.target).parents('.item').attr('data-item-type');
    const dropContainerType = $(event.target).parents('.item-container').attr('data-container-type');

    // if the drop target is of type spellSlot then check if the item dragged onto it is a spell.
    if (dropSlotType === 'spellSlot') {
      const dragData = event.dataTransfer.getData('text/plain');
      const dragItem = JSON.parse(dragData);
      // dragItem = this.actor.getOwnedItem(dragJSON.data._id);

      // if the dragged item is from a compendium pack.
      if (dragItem.pack) {
        const dropID = $(event.target).parents('.item-container').attr('data-container-id');
        this.actor.importItemFromCollection(dragItem.pack, dragItem.id, dropID);
        return false;
      }

      // if the dragged item is from a compendium pack.
      if (dragItem && dragItem.data && dragItem.data.type === 'spell') {
        const dropID = $(event.target).parents('.item').attr('data-item-id');
        const spellLvl = Number($(event.target).parents('.item').attr('data-spell-lvl'));
        const entryId = $(event.target).parents('.item').attr('data-entry-id');

        this._allocatePreparedSpellSlot(spellLvl, dropID, dragItem.data, entryId);
      }

      // else if the dragged item is from another actor and is the data is explicitly provided
      else if (dragItem.data) {
        if (dragItem.data.type === 'spell') { // check if dragged item is a spell, if not, handle with the super _onDrop method.
          if (dragItem.actorId === this.actor._id) return false; // Don't create duplicate items (ideally the previous if statement would have handled items being dropped on the same actor.)

          const dropID = $(event.target).parents('.item-container').attr('data-container-id');
          dragItem.data.data.location = {
            value: dropID,
          };
          // this.actor.createOwnedItem(dragData.data);
          this.actor.createEmbeddedEntity('OwnedItem', dragData.data);
          return false;
        }
      }
    }

    if (dropContainerType === 'spellcastingEntry') { // if the drop container target is a spellcastingEntry then check if the item is a spell and if so update its location.
      const dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
      // dragItem = this.actor.getOwnedItem(dragData._id);

      // if the dragged item is a spell and is from the same actor
      if (dragData && dragData.data && dragData.data.type === 'spell' && (dragData.actorId === this.actor.id)) {
        const dropID = $(event.target).parents('.item-container').attr('data-container-id');

        if (dropID) {
          dragData.data.data.location = { value: dropID };

          // Update Actor
          // await this.actor.updateOwnedItem(dragItem.data, true);
          await this.actor.updateEmbeddedEntity('OwnedItem', dragData.data);
          // await this.actor.updateEmbeddedEntity("OwnedItem", {_id: dragData.id, "data.data.location": {"value": dropID} });
        }
      }

      // else if the dragged item is from another actor and is the data is explicitly provided
      if (dragData.data) {
        if (dragData.data.type === 'spell') { // check if dragged item is a spell, if not, handle with the super _onDrop method.
          if (dragData.actorId === this.actor.id) return false; // Don't create duplicate items (ideally the previous if statement would have handled items being dropped on the same actor.)

          const dropID = $(event.target).parents('.item-container').attr('data-container-id');
          dragData.data.data.location = {
            value: dropID,
          };
          // this.actor.createOwnedItem(dragData.data);
          this.actor.createEmbeddedEntity('OwnedItem', dragData.data);
          return false;
        }
      }

      // else if the dragged item is from a compendium pack.
      else if (dragData.pack) {
        const dropID = $(event.target).parents('.item-container').attr('data-container-id');

        this.actor.importItemFromCollection(dragData.pack, dragData.id, dropID);
        return false;
      }

      // else if the dragged item is from the item sidebar.
      else if (dragData.id) {
        let dragItem = game.items.get(dragData.id);
        if (!dragItem) return;
        const dropID = $(event.target).parents('.item-container').attr('data-container-id');
        dragItem.data.data.location = {
          value: dropID,
        };

        this.actor.createEmbeddedEntity('OwnedItem', dragItem.data);
        return false;
      }
    }

    super._onDrop(event);
  }


  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onItemRoll(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
    const item = this.actor.getOwnedItem(itemId);
    item.roll(event);
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onItemSummary(event) {
    event.preventDefault();

    const localize = game.i18n.localize.bind(game.i18n);

    const li = $(event.currentTarget).parent().parent();
    const itemId = li.attr('data-item-id');
    const itemType = li.attr('data-item-type');
    // itemData = this.actor.items.find(i => i.id === Number(itemId)),
    // itemData = (this.actor.getOwnedItem(itemId) || {}).data,
    let item;

    if (itemType === 'spellSlot') return false;

    try {
      item = this.actor.getOwnedItem(itemId);
      if (!item.type) return;
    } catch (err) {
      return false;
    }

    if (item.data.type === 'spellcastingEntry') return;

    const chatData = item.getChatData({ secrets: this.actor.owner });

    // Toggle summary
    if (li.hasClass('expanded')) {
      const summary = li.children('.item-summary');
      summary.slideUp(200, () => summary.remove());
    } else {
      const div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      const props = $('<div class="item-properties"></div>');
      if (chatData.properties) {
        chatData.properties.filter((p) => typeof p === 'string').forEach((p) => {
          props.append(`<span class="tag">${localize(p)}</span>`);
        });
      }
      if (chatData.critSpecialization) props.append(`<span class="tag" title="${localize(chatData.critSpecialization.description)}" style="background: rgb(69,74,124); color: white;">${localize(chatData.critSpecialization.label)}</span>`);
      // append traits (only style the tags if they contain description data)
      if (chatData.traits && chatData.traits.length) {
        chatData.traits.forEach((p) => {
          if (p.description) props.append(`<span class="tag" title="${localize(p.description)}" style="background: #b75b5b; color: white;">${localize(p.label)}</span>`);
          else props.append(`<span class="tag">${localize(p.label)}</span>`);
        });
      }

      // if (chatData.area) props.append(`<span class="tag area-tool rollable" style="background: rgb(69,74,124); color: white;" data-area-areaType="${chatData.area.areaType}" data-area-size="${chatData.area.size}">${chatData.area.label}</span>`);

      div.append(props);

      /* props.find('.area-tool').click(ev => {
        ev.preventDefault();
        ev.stopPropagation();

        this._onAreaEffect(ev);
      }) */

      const buttons = $('<div class="item-buttons"></div>');
      switch (item.data.type) {
        case 'action':
          if (chatData.weapon.value) {
            if (chatData.weapon.value) {
              buttons.append(`<span class="tag"><button data-action="weaponAttack">${localize('PF2E.WeaponStrikeLabel')}</button></span>`);
              buttons.append('<span class="tag"><button data-action="weaponAttack2">2</button></span>');
              buttons.append('<span class="tag"><button data-action="weaponAttack3">3</button></span>');
              buttons.append(`<span class="tag"><button data-action="weaponDamage">${localize('PF2E.DamageLabel')}</button></span>`);
            }
          }
          break;
        case 'weapon':
          const isAgile = (item.data.data.traits.value || []).includes('agile');
          if (chatData.isTwohanded) {
            if (chatData.wieldedTwoHands) buttons.append('<span class="tag"><button data-action="toggleHands"><i class="far fa-hand-paper"></i><i class="far fa-hand-paper"></i></button></span>');
            else buttons.append('<span class="tag"><button data-action="toggleHands"><i class="far fa-hand-paper"></i></button></span>');
          }
          buttons.append(`<span class="tag"><button data-action="weaponAttack">${localize('PF2E.WeaponStrikeLabel')} (+${chatData.attackRoll})</button></span>`);
          buttons.append(`<span class="tag"><button data-action="weaponAttack2">${chatData.map2}</button></span>`);
          buttons.append(`<span class="tag"><button data-action="weaponAttack3">${chatData.map3}</button></span>`);
          buttons.append(`<span class="tag"><button data-action="weaponDamage">${localize('PF2E.DamageLabel')}</button></span>`);
          buttons.append(`<span class="tag"><button data-action="weaponDamageCritical">${localize('PF2E.CriticalDamageLabel')}</button></span>`);
          break;
        case 'spell':
          if (chatData.isSave) buttons.append(`<span class="tag">${localize('PF2E.SaveDCLabel')} ${chatData.save.dc} ${chatData.save.basic} ${chatData.save.str}</span>`);
          if (chatData.isAttack) buttons.append(`<span class="tag"><button data-action="spellAttack">${localize('PF2E.AttackLabel')}</button></span>`);
          if (item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="spellDamage">${chatData.damageLabel}: ${item.data.data.damage.value}</button></span>`);
          break;
        case 'consumable':
          if (chatData.hasCharges) buttons.append(`<span class="tag"><button data-action="consume">${localize('PF2E.ConsumableUseLabel')} ${item.name}</button></span>`);
          break;
        case 'tool':
          buttons.append(`<span class="tag"><button data-action="toolCheck" data-ability="${chatData.ability.value}">${localize('PF2E.ConsumableUseLabel')} ${item.name}</button></span>`);
          break;
      }

      div.append(buttons);

      buttons.find('button').click((ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        // which function gets called depends on the type of button stored in the dataset attribute action
        switch (ev.target.dataset.action) {
          case 'toggleHands':
            item.data.data.hands.value = !item.data.data.hands.value;
            // this.actor.updateOwnedItem(item.data, true);
            this.actor.updateEmbeddedEntity('OwnedItem', item.data);
            this._render();

            break;
          case 'weaponAttack': item.rollWeaponAttack(ev); break;
          case 'weaponAttack2': item.rollWeaponAttack(ev, 2); break;
          case 'weaponAttack3': item.rollWeaponAttack(ev, 3); break;
          case 'weaponDamage': item.rollWeaponDamage(ev); break;
          case 'weaponDamageCritical': item.rollWeaponDamage(ev, true); break;
          case 'spellAttack': item.rollSpellAttack(ev); break;
          case 'spellDamage': item.rollSpellDamage(ev); break;
          case 'featAttack': item.rollFeatAttack(ev); break;
          case 'featDamage': item.rollFeatDamage(ev); break;
          case 'consume': item.rollConsumable(ev); break;
          case 'toolCheck': item.rollToolCheck(ev); break;
        }
      });

      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass('expanded');
  }


  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const data = duplicate(header.dataset);

    if (data.type === 'feat') {
      data.name = `New ${data.featType.capitalize()} ${data.type.capitalize()}`;
      mergeObject(data, { 'data.featType.value': data.featType });
    } else if (data.type === 'action') {
      data.name = `New ${data.actionType.capitalize()}`;
      mergeObject(data, { 'data.actionType.value': data.actionType });
    } else if (data.type === 'melee') {
      data.name = `New ${data.actionType.capitalize()}`;
      mergeObject(data, { 'data.weaponType.value': data.actionType });
    } else if (data.type === 'spell') {
      data.name = `New  Level ${data.level} ${data.type.capitalize()}`;
      mergeObject(data, {
        'data.level.value': data.level,
        'data.location.value': data.location,
      });
      // Show the spellbook pages if you're adding a new spell
      const currentLvlToDisplay = {};
      currentLvlToDisplay[data.level] = true;
      this.actor.updateEmbeddedEntity('OwnedItem', {
        _id: data.location,
        'data.showUnpreparedSpells.value': true,
        'data.displayLevels': currentLvlToDisplay
      });
    } else if (data.type === 'lore') {
      if (this.actorType === 'npc') {
        data.name = 'Skill';
        data.img = '/icons/svg/d20-black.svg';
      } else data.name = `New ${data.type.capitalize()}`;
    } else {
      data.name = `New ${data.type.capitalize()}`;
    }
    // this.actor.createOwnedItem(data, {renderSheet: true});
    this.actor.createEmbeddedEntity('OwnedItem', data);
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new spellcasting entry for the actor
   * @private
   */

  _createSpellcastingEntry(event) {
    event.preventDefault();

    // let entries = this.actor.data.data.attributes.spellcasting.entry || {};

    let magicTradition = 'arcane';
    let spellcastingType = 'innate';

    // Render modal dialog
    const template = 'systems/pf2e/templates/actors/spellcasting-dialog.html';
    const title = 'Select Spellcasting Entry Details';
    const dialogOptions = {
      width: 300,
      top: event.clientY - 80,
      left: window.innerWidth - 710,
    };
    const dialogData = {
      magicTradition,
      magicTraditions: CONFIG.PF2E.magicTraditions,
      spellcastingType,
      spellcastingTypes: CONFIG.PF2E.preparationType,
    };
    renderTemplate(template, dialogData).then((dlg) => {
      new Dialog({
        title,
        content: dlg,
        buttons: {
          create: {
            label: 'Create',
            callback: (html) => {
              // if ( onClose ) onClose(html, parts, data);
              let name = '';
              magicTradition = html.find('[name="magicTradition"]').val();
              if (magicTradition === 'ritual') {
                spellcastingType = '';
                name = `${CONFIG.PF2E.magicTraditions[magicTradition]}s`;
              } else if (magicTradition === 'focus') {
                spellcastingType = '';
                name = `${CONFIG.PF2E.magicTraditions[magicTradition]} Spells`;
              } else if (magicTradition === 'scroll') {
                spellcastingType = '';
                name = `${CONFIG.PF2E.magicTraditions[magicTradition]}`;
              } else if (magicTradition === 'wand') {
                spellcastingType = 'prepared';
                name = `${CONFIG.PF2E.magicTraditions[magicTradition]}`;
              } else {
                spellcastingType = html.find('[name="spellcastingType"]').val();
                name = `${CONFIG.PF2E.preparationType[spellcastingType]} ${CONFIG.PF2E.magicTraditions[magicTradition]} Spells`;
              }

              // Define new spellcasting entry
              const spellcastingEntity = {
                ability: {
                  type: 'String',
                  label: 'Spellcasting Ability',
                  value: '',
                },
                spelldc: {
                  type: 'String',
                  label: 'Class DC',
                  item: 0,
                },
                tradition: {
                  type: 'String',
                  label: 'Magic Tradition',
                  value: magicTradition,
                },
                prepared: {
                  type: 'String',
                  label: 'Spellcasting Type',
                  value: spellcastingType,
                },
                showUnpreparedSpells: { value: true },
              };

              const data = {
                name,
                type: 'spellcastingEntry',
                data: spellcastingEntity,
              };

              // this.actor.createOwnedItem(data, {renderSheet: true});
              this.actor.createEmbeddedEntity('OwnedItem', data);

              /*             let key = `data.attributes.spellcasting.entry.${magicTradition}#${spellcastingType}`
                let entry = {};
                entry[key] = spellcastingEntity;
                this.actor.update(entry);  */
            }
          },
        },
        default: 'create',
      }, dialogOptions).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an existing spellcasting entry for the actor
   * @private
   */

  _removeSpellcastingEntry(event) {
    event.preventDefault();

    const li = $(event.currentTarget).parents('.item');
    const itemId = li.attr('data-container-id');
    const item = this.actor.getOwnedItem(itemId);

    let dlg;

    // Render confirmation modal dialog
    renderTemplate('systems/pf2e/templates/actors/delete-spellcasting-dialog.html').then((html) => {
      new Dialog({
        title: 'Delete Confirmation',
        content: html,
        data: item,
        buttons: {
          Yes: {
            icon: '<i class="fa fa-check"></i>',
            label: 'Yes',
            callback: dlg = async () => {
              console.log('PF2e | Deleting Spell Container: ', item.name);
              // Delete all child objects
              const itemsToDelete = [];
              for (const i of this.actor.data.items) {
                if (i.type === 'spell') {
                  if (Number(i.data.location.value) === itemId) {
                    itemsToDelete.push(i._id);
                  }
                }
              }

              for (const d of itemsToDelete) {
                await this.actor.deleteOwnedItem(d);
              }

              // Delete item container
              this.actor.deleteOwnedItem(itemId);
              li.slideUp(200, () => this.render(false));
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
          },
        },
        default: 'Yes',
      }).render(true);
    });
  }

  /* -------------------------------------------- */

  _onTraitSelector(event) {
    event.preventDefault();
    const a = $(event.currentTarget);
    const options = {
      name: a.parents('label').attr('for'),
      title: a.parent().text().trim(),
      choices: CONFIG.PF2E[a.attr('data-options')],
      has_values: (a.attr('data-has-values') === 'true'),
      has_exceptions: (a.attr('data-has-exceptions') === 'true'),
    };
    new TraitSelector5e(this.actor, options).render(true);
  }

  _onAreaEffect(event) {
    const areaType = $(event.currentTarget).attr('data-area-areaType');
    const areaSize = Number($(event.currentTarget).attr('data-area-size'));

    let tool = 'cone';
    if (areaType === 'burst') tool = 'circle';
    else if (areaType === 'emanation') tool = 'rect';
    else if (areaType === 'line') tool = 'ray';

    // Delete any existing templates for this actor.
    let templateData = this.actor.getFlag('pf2e', 'areaEffectId') || null;
    let templateScene = null;
    if (templateData) {
      templateScene = this.actor.getFlag('pf2e', 'areaEffectScene') || null;
      this.actor.setFlag('pf2e', 'areaEffectId', null);
      this.actor.setFlag('pf2e', 'areaEffectScene', null);

      console.log(`PF2e | Existing MeasuredTemplate ${templateData.id} from Scene ${templateScene} found`);
      if (canvas.templates.objects.children) {
        for (const placeable of canvas.templates.objects.children) {
          console.log(`PF2e | Placeable Found - id: ${placeable.data.id}, scene: ${canvas.scene._id}, type: ${placeable.__proto__.constructor.name}`);
          if (placeable.data.id === templateData.id & canvas.scene._id === templateScene & placeable.__proto__.constructor.name === 'MeasuredTemplate') {
            console.log(`PF2e | Deleting MeasuredTemplate ${templateData.id} from Scene ${templateScene}`);

            const existingTemplate = new MeasuredTemplate(templateData, templateScene);
            existingTemplate.delete(templateScene);
          }
        }
      }
    }

    // data to pull in dynamically
    let x;
    let y;

    let data = {};
    const gridWidth = canvas.grid.grid.w;

    if (areaType === 'emanation' || areaType === 'cone') {
      if (canvas.tokens.controlled.length > 1) {
        ui.notifications.info('Please select a single target token');
      } else if (canvas.tokens.controlled.length === 0) {
        ui.notifications.info('Please select a target token');
      } else {
        const t = canvas.tokens.controlled[0];
        let { rotation } = t.data;
        const { width } = t.data;

        x = t.data.x;
        y = t.data.y;

        // Cone placement logic
        if (tool === 'cone') {
          if (rotation < 0) rotation = 360 + rotation;
          if (rotation < 35) {
            x += (gridWidth / 2);
            y += (gridWidth);
          } else if (rotation < 55) {
            y += (gridWidth);
          } else if (rotation < 125) {
            y += (gridWidth / 2);
          } else if (rotation < 145) {
            y = y;
          } else if (rotation < 215) {
            x += (gridWidth / 2);
          } else if (rotation < 235) {
            x += (gridWidth);
          } else if (rotation < 305) {
            x += (gridWidth);
            y += (gridWidth / 2);
          } else if (rotation < 325) {
            x += (gridWidth);
            y += (gridWidth);
          } else {
            x += (gridWidth / 2);
            y += (gridWidth);
          }
          rotation += 90;

          data = {
            t: tool, x, y, distance: areaSize, direction: rotation, fillColor: game.user.data.color || '#FF0000',
          };
        } else if (tool === 'rect') {
          x -= (gridWidth * (areaSize / 5));
          y -= (gridWidth * (areaSize / 5));
          rotation = 45;

          const rectSide = areaSize + (width * 5) + areaSize;
          const distance = Math.sqrt(Math.pow(rectSide, 2) + Math.pow(rectSide, 2));
          data = {
            t: tool, x, y, distance, direction: rotation, fillColor: game.user.data.color || '#FF0000',
          };
        }

        // Create the template
        MeasuredTemplate.create(canvas.scene._id, data).then((results) => {
          templateData = results.data;

          // Save MeasuredTemplate information to actor flags
          this.actor.setFlag('pf2e', 'areaEffectId', templateData);
          this.actor.setFlag('pf2e', 'areaEffectScene', canvas.scene._id);
        });
      }
    }
  }

  /**
   * Always submit on a form field change. Added because tabbing between fields
   * wasn't working.
   */
  _onChangeInput(event) {
    this._onSubmit(event);
  }
}

export default ActorSheetPF2e;
