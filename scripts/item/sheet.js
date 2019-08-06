/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
class ItemSheetPF2e extends ItemSheet {
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.width = 520;
	  options.height = 460;
	  options.classes = options.classes.concat(["pf2e", "item"]);
	  options.template = `public/systems/pf2e/templates/items/item-sheet.html`;
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
    data['abilities'] = game.system.template.actor.data.abilities;

    // Sheet display details
    const type = this.item.type;
    mergeObject(data, {
      type: type,
      hasSidebar: true,
      sidebarTemplate: () => `public/systems/pf2e/templates/items/${type}-sidebar.html`,
      hasDetails: ["consumable", "equipment", "feat", "spell", "weapon"].includes(type),
      detailsTemplate: () => `public/systems/pf2e/templates/items/${type}-details.html`
    });

    // Damage types
    let dt = duplicate(CONFIG.damageTypes);
    if ( ["spell", "feat"].includes(type) ) mergeObject(dt, CONFIG.healingTypes);
    data['damageTypes'] = dt;

    // Consumable Data
    if ( type === "consumable" ) {
      data.consumableTypes = CONFIG.consumableTypes
    }

    // Spell Data
    else if ( type === "spell" ) {
      mergeObject(data, {
        spellTypes: CONFIG.spellTypes,
        spellSchools: CONFIG.spellSchools,
        spellLevels: CONFIG.spellLevels,
        spellComponents: this._formatSpellComponents(data.data)
      });
    }

    // Weapon Data
    else if ( this.item.type === "weapon" ) {
      data.weaponTypes = CONFIG.weaponTypes;
      data.weaponProperties = this._formatWeaponProperties(data.data);
    }

    // Feat types
    else if ( type === "feat" ) {
      data.featTypes = CONFIG.featTypes;
      data.actionTypes = CONFIG.actionTypes;
      data.featTags = [
        data.data.level.value,
        data.data.traits.value
      ].filter(t => !!t);
    }

    // Equipment data
    else if ( type === "equipment" ) {
      data.armorTypes = CONFIG.armorTypes;
    }

    // Tool-specific data
    else if ( type === "tool" ) {
      data.proficiencies = CONFIG.proficiencyLevels;
    }

    // Lore-specific data
    else if ( type === "lore" ) {
      data.proficiencies = CONFIG.proficiencyLevels;
    }
    return data;
  }

  /* -------------------------------------------- */

  _formatSpellComponents(data) {
    if ( !data.components.value ) return [];
    let comps = data.components.value.split(",").map(c => CONFIG.spellComponents[c.trim()] || c.trim());
    if ( data.materials.value ) comps.push(data.materials.value);
    return comps;
  }

  /* -------------------------------------------- */

  _formatWeaponProperties(data) {
    if ( !data.properties.value ) return [];
    return data.properties.value.split(",").map(p => p.trim());
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    new Tabs(html.find(".tabs"), {
      initial: this.item.data.flags["_sheetTab"],
      callback: clicked => this.item.data.flags["_sheetTab"] = clicked.attr("data-tab")
    });

    // Checkbox changes
    html.find('input[type="checkbox"]').change(event => this._onSubmit(event));
  }
}

// Activate global listeners
Hooks.on('renderChatLog', (log, html, data) => ItemPF2e.chatListeners(html));

// Override CONFIG
CONFIG.Item.sheetClass = ItemSheetPF2e;
