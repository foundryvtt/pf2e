
class ActorSheetFlags extends BaseEntitySheet {
  static get defaultOptions() {
    const options = super.defaultOptions;
    return mergeObject(options, {
      id: "actor-flags",
      template: "public/systems/dnd5e/templates/actors/actor-flags.html",
      width: 500,
      closeOnSubmit: true
    });
  }

  /* -------------------------------------------- */
  
  /**
   * Configure the title of the special traits selection window to include the Actor name
   * @type {String}
   */
  get title() {
    return `${game.i18n.localize('DND5E.FlagsTitle')}: ${this.object.name}`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data used to render the special Actor traits selection UI
   * @return {Object}
   */
  getData() {
    const data = super.getData();
    data.flags = this._getFlags();
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare an object of flags data which groups flags by section
   * Add some additional data for rendering
   * @return {Object}
   */
  _getFlags() {
    const flags = {};
    for ( let [k, v] of Object.entries(CONFIG.Actor.characterFlags) ) {
      if ( !flags.hasOwnProperty(v.section) ) flags[v.section] = {};
      let flag = duplicate(v);
      flag.type = v.type.name;
      flag.isCheckbox = v.type === Boolean;
      flag.isSelect = v.hasOwnProperty('choices');
      flag.value = this.entity.getFlag("dnd5e", k);
      flags[v.section][k] = flag;
    }
    return flags;
  }

  /* -------------------------------------------- */

  /**
   * Update the Actor using the configured flags
   * Remove/unset any flags which are no longer configured
   */
  _updateObject(event, formData) {
    const actor = this.object;
    const flags = duplicate(actor.data.flags.dnd5e || {});

    // Iterate over the flags which may be configured
    for ( let [k, v] of Object.entries(CONFIG.Actor.characterFlags) ) {
      if ( [undefined, null, "", false].includes(formData[k]) ) delete flags[k];
      else flags[k] = formData[k];
    }

    // Set the new flags in bulk
    actor.update({'flags.dnd5e': flags});
  }
}


/* -------------------------------------------- */


CONFIG.Actor.characterFlags = {
  "powerfulBuild": {
    name: "Powerful Build",
    hint: "Provides increased carrying capacity.",
    section: "Racial Traits",
    type: Boolean
  },
  "savageAttacks": {
    name: "Savage Attacks",
    hint: "Adds extra critical hit weapon dice.",
    section: "Racial Traits",
    type: Boolean
  },
  // "elvenAccuracy": {
  //   name: "Elven Accuracy",
  //   hint: "Roll an extra d20 with advantage to Dex, Int, Wis, or Cha.",
  //   section: "Feats",
  //   type: Boolean
  // },
  "initiativeAdv": {
    name: "Advantage on Initiative",
    hint: "Provided by feats or magical items.",
    section: "Feats",
    type: Boolean
  },
  "initiativeHalfProf": {
    name: "Half-Proficiency to Initiative",
    hint: "Provided by Jack of All Trades or Remarkable Athlete.",
    section: "Feats",
    type: Boolean
  },
  "initiativeAlert": {
    name: "Alert Feat",
    hint: "Provides +5 to Initiative.",
    section: "Feats",
    type: Boolean
  },
  "spellDCBonus": {
    name: "Spell DC Bonus",
    hint: "Modifies normal spellcasting DC.",
    section: "Feats",
    type: Number,
    placeholder: "+0"
  }
};
