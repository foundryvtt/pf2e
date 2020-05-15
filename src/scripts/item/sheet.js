/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
class ItemSheetPF2e extends ItemSheet {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.width = 630;
    options.height = 460;
    options.classes = options.classes.concat(['pf2e', 'item']);
    options.template = 'systems/pf2e/templates/items/item-sheet.html';
    options.tabs = [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}];
    options.resizable = false;
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  getData() {
    const data = super.getData();
    data.abilities = CONFIG.PF2E.abilities;
    data.saves = CONFIG.PF2E.saves;

    // Sheet display details
    const { type } = this.item;
    mergeObject(data, {
      type,
      hasSidebar: true,
      sidebarTemplate: () => `systems/pf2e/templates/items/${type}-sidebar.html`,
      hasDetails: ['consumable', 'equipment', 'feat', 'spell', 'weapon', 'armor', 'action', 'melee', 'backpack'].includes(type),
      detailsTemplate: () => `systems/pf2e/templates/items/${type}-details.html`,
    });

    // Damage types
    const dt = duplicate(CONFIG.PF2E.damageTypes);
    if (['spell', 'feat'].includes(type)) mergeObject(dt, CONFIG.PF2E.healingTypes);
    data.damageTypes = dt;

    // do not let user set bulk if in a stack group because the group determines bulk
    const stackGroup = this.item.data?.data?.stackGroup?.value;
    data.bulkDisabled = stackGroup !== undefined && stackGroup !== null && stackGroup.trim() !== '';
    
    // Consumable Data
    if (type === 'consumable') {
      data.consumableTypes = CONFIG.PF2E.consumableTypes;
      data.bulkTypes = CONFIG.PF2E.bulkTypes;
      data.stackGroups = CONFIG.stackGroups;
    } else if (type === 'spell') {
      // Spell Data
      mergeObject(data, {
        spellTypes: CONFIG.PF2E.spellTypes,
        spellSchools: CONFIG.PF2E.spellSchools,
        spellLevels: CONFIG.PF2E.spellLevels,
        magicTraditions: CONFIG.PF2E.magicTraditions,
        // spellBasic: CONFIG.PF2E.spellBasic,
        spellComponents: this._formatSpellComponents(data.data),
        areaSizes: CONFIG.PF2E.areaSizes,
        areaTypes: CONFIG.PF2E.areaTypes,
        spellScalingModes: CONFIG.PF2E.spellScalingModes,
      });
      this._prepareTraits(data.data.traits, mergeObject(CONFIG.PF2E.magicTraditions,
                                                        CONFIG.PF2E.spellTraits));
    } else if (this.item.type === 'weapon') {
      // get a list of all custom martial skills
      const martialSkills = [];
      if (this.actor) {
        for (const i of this.actor.data.items) {
          if (i.type === 'martial') martialSkills.push(i);
        }
      }
      data.martialSkills = martialSkills;

      // Weapon Data
      data.weaponTraits = CONFIG.PF2E.weaponTraits;
      data.weaponTypes = CONFIG.PF2E.weaponTypes;
      data.weaponGroups = CONFIG.PF2E.weaponGroups;
      data.itemBonuses = CONFIG.PF2E.itemBonuses;
      data.damageDie = CONFIG.PF2E.damageDie;
      data.damageDice = CONFIG.PF2E.damageDice;
      data.conditionTypes = CONFIG.PF2E.conditionTypes;
      data.weaponDamage = CONFIG.PF2E.damageTypes;
      data.weaponRange = CONFIG.PF2E.weaponRange;
      data.weaponReload = CONFIG.PF2E.weaponReload;
      data.weaponMAP = CONFIG.PF2E.weaponMAP;
      data.bulkTypes = CONFIG.PF2E.bulkTypes;
      this._prepareTraits(data.data.traits, CONFIG.PF2E.weaponTraits);
    } else if (this.item.type === 'melee') {
      // Melee Data
      const actions = {};
      if (this.actor) {
        for (const i of this.actor.data.items) {
          if (i.type === 'action') actions[i.name] = i.name;
        }
      }      
      data.attackEffects = CONFIG.PF2E.attackEffects;
      mergeObject(data.attackEffects, actions);

      data.hasSidebar = false;
      data.detailsActive = true;
      data.weaponDamage = CONFIG.PF2E.damageTypes;      
      this._prepareTraits(data.data.traits, CONFIG.PF2E.weaponTraits);
    } else if (type === 'feat') {
      // Feat types
      data.featTypes = CONFIG.PF2E.featTypes;
      data.featActionTypes = CONFIG.PF2E.featActionTypes;
      data.actionsNumber = CONFIG.PF2E.actionsNumber;
      data.categories = CONFIG.PF2E.actionCategories;
      data.featTags = [
        data.data.level.value,
        data.data.traits.value,
      ].filter((t) => !!t);
      this._prepareTraits(data.data.traits, CONFIG.PF2E.featTraits);
    } else if (type === 'action') {
      // Action types
      const actorWeapons = [];
      if (this.actor) {
        for (const i of this.actor.data.items) {
          if (i.type === 'weapon') actorWeapons.push(i);
        }
      }

      const actionType = data.data.actionType.value || 'action';
      let actionImg = 0;
      if (actionType === 'action') actionImg = parseInt((data.data.actions || {}).value, 10) || 1;
      else if (actionType === 'reaction') actionImg = 'reaction';
      else if (actionType === 'free') actionImg = 'free';
      else if (actionType === 'passive') actionImg = 'passive';
      data.item.img = this._getActionImg(actionImg);
      data.categories = CONFIG.PF2E.actionCategories;
      data.weapons = actorWeapons;
      data.actionTypes = CONFIG.PF2E.actionTypes;
      data.actionsNumber = CONFIG.PF2E.actionsNumber;
      data.featTraits = CONFIG.PF2E.featTraits;
      data.skills = CONFIG.PF2E.skillList;
      data.proficiencies = CONFIG.PF2E.proficiencyLevels;
      data.actionTags = [
        data.data.traits.value,
      ].filter((t) => !!t);
      this._prepareTraits(data.data.traits, CONFIG.PF2E.featTraits);
    } else if (type === 'equipment') {
    // Equipment data
      data.bulkTypes = CONFIG.PF2E.bulkTypes;
      data.stackGroups = CONFIG.stackGroups;
    } else if (type === 'backpack') {
      // Backpack data
      data.bulkTypes = CONFIG.PF2E.bulkTypes;
      data.backpackTraits = CONFIG.PF2E.backpackTraits;
      this._prepareTraits(data.data.traits, CONFIG.PF2E.backpackTraits);
    } else if (type === 'armor') {
      // Armor data
      data.armorTypes = CONFIG.PF2E.armorTypes;
      data.armorGroups = CONFIG.PF2E.armorGroups;
      data.bulkTypes = CONFIG.PF2E.bulkTypes;
    } else if (type === 'tool') {
      // Tool-specific data
      data.proficiencies = CONFIG.PF2E.proficiencyLevels;
    } else if (type === 'lore') {
      // Lore-specific data
      data.proficiencies = CONFIG.PF2E.proficiencyLevels;
    }

    return data;
  }

  _prepareTraits(traits, choices) {
    if (traits.selected) {
      traits.selected = traits.value.reduce((obj, t) => {
        obj[t] = choices[t];
        return obj;
      }, {});
    } else {
      traits.selected = [];
    }

    // Add custom entry
    if (traits.custom) traits.selected.custom = traits.custom;
  }

  /* -------------------------------------------- */

  _formatSpellComponents(data) {
    if (!data.components.value) return [];
    const comps = data.components.value.split(',').map((c) => CONFIG.PF2E.spellComponents[c.trim()] || c.trim());
    if (data.materials.value) comps.push(data.materials.value);
    return comps;
  }

  /* -------------------------------------------- */

  onTraitSelector(event) {
    event.preventDefault();
    const a = $(event.currentTarget);
    const options = {
      name: a.parents('label').attr('for'),
      title: a.parent().text().trim(),
      choices: CONFIG.PF2E[a.attr('data-options')],
    };
    new TraitSelector5e(this.item, options).render(true);
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
      passive: 'icons/svg/mystery-man.svg',
    };
    return img[action];
  }

  async _addDamageRoll( event ){
    event.preventDefault();
        
    const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    console.log('newKey: ', newKey);
    const newDamageRoll = {
      damage: "",
      damageType: "" 
    };
        
    return this.item.update({ [`data.damageRolls.${newKey}`] : newDamageRoll });
  }

  async _deleteDamageRoll( event ){
    event.preventDefault();
    await this._onSubmit( event );
    const targetKey = $(event.target).parents('.damage-part').attr('data-damage-part');
    return this.item.update({ [`data.damageRolls.-=${targetKey}`] : null });
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Checkbox changes
    html.find('input[type="checkbox"]').change((event) => this._onSubmit(event));

    // Trait Selector
    html.find('.trait-selector').click((ev) => this.onTraitSelector(ev));

    // Add Damage Roll
    html.find('.add-damage').click((ev) => {
      this._addDamageRoll(ev);
    });
    
    // Remove Damage Roll
    html.find('.delete-damage').click((ev) => {
      this._deleteDamageRoll(ev);
    });
  }

  /**
   * Always submit on a form field change. Added because tabbing between fields
   * wasn't working.
   */
  _onChangeInput(event) {
    // Unclear where the event conflic is between _onChangeInput and another. 
    // But if FormApplication._onSubmit() is not called by _onChangeInput, then Items (Actions/Feats/etc) 
    // of NPCs can be edited without problems.
    
    // hooking - adding this back in as it breaks editing item details (specifically editing damage parts when it is removed)
    this._onSubmit(event);
  }
}

// Override CONFIG
// CONFIG.Item.sheetClass = ItemSheetPF2e;

// Register Item Sheet
Items.unregisterSheet('core', ItemSheet);
Items.registerSheet('pf2e', ItemSheetPF2e, { makeDefault: true });
