/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
class ItemSheetPF2e extends ItemSheet {
  static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.width = 520;
	  options.height = 460;
	  options.classes = options.classes.concat(['pf2e', 'item']);
	  options.template = 'systems/pf2e/templates/items/item-sheet.html';
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
    data.abilities = game.system.template.Actor.data.abilities;
    data.saves = game.system.template.Actor.data.saves;

    // Sheet display details
    const { type } = this.item;
    mergeObject(data, {
      type,
      hasSidebar: true,
      sidebarTemplate: () => `systems/pf2e/templates/items/${type}-sidebar.html`,
      hasDetails: ['consumable', 'equipment', 'feat', 'spell', 'weapon', 'armor', 'action', 'melee'].includes(type),
      detailsTemplate: () => `systems/pf2e/templates/items/${type}-details.html`,
    });

    // Damage types
    const dt = duplicate(CONFIG.damageTypes);
    if (['spell', 'feat'].includes(type)) mergeObject(dt, CONFIG.healingTypes);
    data.damageTypes = dt;

    // Consumable Data
    if (type === 'consumable') {
      data.consumableTypes = CONFIG.consumableTypes;
      data.bulkTypes = CONFIG.bulkTypes;
    }

    // Spell Data
    else if (type === 'spell') {
      mergeObject(data, {
        spellTypes: CONFIG.spellTypes,
        spellSchools: CONFIG.spellSchools,
        spellLevels: CONFIG.spellLevels,
        spellTraditions: CONFIG.magicTraditions,
        // spellBasic: CONFIG.spellBasic,
        spellComponents: this._formatSpellComponents(data.data),
        areaSizes: CONFIG.areaSizes,
        areaTypes: CONFIG.areaTypes,
        spellScalingModes: CONFIG.spellScalingModes,
      });
    }

    // Weapon Data
    else if (this.item.type === 'weapon') {
      data.weaponTypes = CONFIG.weaponTypes;
      data.weaponGroups = CONFIG.weaponGroups;
      data.itemBonuses = CONFIG.itemBonuses;
      data.damageDie = CONFIG.damageDie;
      data.damageDice = CONFIG.damageDice;
      data.conditionTypes = CONFIG.conditionTypes;
      data.weaponDamage = CONFIG.weaponDamage;
      data.weaponRange = CONFIG.weaponRange;
      data.weaponReload = CONFIG.weaponReload;
      data.weaponTraits = data.data.traits.value;
      data.bulkTypes = CONFIG.bulkTypes;
      // data.weaponTraits = this._formatWeaponTraits(data.data);
    }

    // Melee Data
    else if (this.item.type === 'melee') {
      data.hasSidebar = false;
      data.detailsActive = true;
      /*       data.itemBonuses = CONFIG.itemBonuses;
      data.damageDie = CONFIG.damageDie; */
      // data.damageDice = CONFIG.damageDice;
      data.weaponDamage = CONFIG.damageTypes;
      // data.weaponTraits = data.data.traits.value
      // data.weaponTraits = this._formatWeaponTraits(data.data);
    }

    // Feat types
    else if (type === 'feat') {
      data.featTypes = CONFIG.featTypes;
      data.featActionTypes = CONFIG.featActionTypes;
      data.actionsNumber = CONFIG.actionsNumber;
      data.featTags = [
        data.data.level.value,
        data.data.traits.value,
      ].filter((t) => !!t);
    }

    // Action types
    else if (type === 'action') {
      // data.featTypes = CONFIG.featTypes;
      // data["weapons"] = game.system.template.item.data.weapon;
      const actorWeapons = [];
      if (this.actor) {
        for (const i of this.actor.data.items) {
          if (i.type === 'weapon') actorWeapons.push(i);
        }
      }

      const actionType = data.data.actionType.value || 'action';
      let actionImg = 0;
      if (actionType === 'action') actionImg = parseInt((data.data.actions || {}).value) || 1;
      else if (actionType === 'reaction') actionImg = 'reaction';
      else if (actionType === 'free') actionImg = 'free';
      else if (actionType === 'passive') actionImg = 'passive';
      data.item.img = this._getActionImg(actionImg);

      data.weapons = actorWeapons;
      data.actionTypes = CONFIG.actionTypes;
      data.actionsNumber = CONFIG.actionsNumber;
      data.skills = CONFIG.skillList;
      data.proficiencies = CONFIG.proficiencyLevels;
      data.actionTags = [
        data.data.traits.value,
      ].filter((t) => !!t);
    }

    // Equipment data
    else if (type === 'equipment') {
      data.bulkTypes = CONFIG.bulkTypes;
    }

    // Backpack data
    else if (type === 'backpack') {
      data.bulkTypes = CONFIG.bulkTypes;
    }

    // Armor data
    else if (type === 'armor') {
      data.armorTypes = CONFIG.armorTypes;
      data.armorGroups = CONFIG.armorGroups;
      data.bulkTypes = CONFIG.bulkTypes;
    }

    // Tool-specific data
    else if (type === 'tool') {
      data.proficiencies = CONFIG.proficiencyLevels;
    }

    // Lore-specific data
    else if (type === 'lore') {
      data.proficiencies = CONFIG.proficiencyLevels;
    }
    return data;
  }

  /* -------------------------------------------- */

  _formatSpellComponents(data) {
    if (!data.components.value) return [];
    const comps = data.components.value.split(',').map((c) => CONFIG.spellComponents[c.trim()] || c.trim());
    if (data.materials.value) comps.push(data.materials.value);
    return comps;
  }

  /* -------------------------------------------- */

  _formatWeaponTraits(data) {
    if (!data.traits.value) return [];
    return data.traits.value.split(',').map((p) => p.trim());
  }

  /* -------------------------------------------- */

  _onTraitSelector(event) {
    event.preventDefault();
    const a = $(event.currentTarget);
    const options = {
      name: a.parents('label').attr('for'),
      title: a.parent().text().trim(),
      choices: CONFIG[a.attr('data-options')],
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

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    new Tabs(html.find('.tabs'), {
      initial: this.item.data.flags._sheetTab,
      callback: (clicked) => this.item.data.flags._sheetTab = clicked.attr('data-tab'),
    });

    // Checkbox changes
    html.find('input[type="checkbox"]').change((event) => this._onSubmit(event));

    // Trait Selector
    html.find('.trait-selector').click((ev) => this._onTraitSelector(ev));
  }

  /**
   * Always submit on a form field change. Added because tabbing between fields
   * wasn't working.
   */
  _onChangeInput(event) {
    this._onSubmit(event);
  }
}

// Activate global listeners
Hooks.on('renderChatLog', (log, html, data) => ItemPF2e.chatListeners(html));

// Override CONFIG
// CONFIG.Item.sheetClass = ItemSheetPF2e;

// Register Item Sheet
Items.unregisterSheet('core', ItemSheet);
Items.registerSheet('pf2e', ItemSheetPF2e, { makeDefault: true });
