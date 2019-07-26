/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 */
class ActorPF2e extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData(actorData) {
    actorData = super.prepareData(actorData);
    const data = actorData.data;

    // Prepare Character data
    if ( actorData.type === "character" ) this._prepareCharacterData(data);
    //else if ( actorData.type === "npc" ) this._prepareNPCData(data);

    // Ability modifiers
    for (let abl of Object.values(data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
    }

    // Saves
    data.attributes.fortitude.value = data.abilities.con.mod + (data.attributes.fortitude.rank * 2) + data.details.level.value + data.attributes.fortitude.item;
    data.attributes.reflex.value = data.abilities.dex.mod + (data.attributes.reflex.rank * 2) + data.details.level.value + data.attributes.reflex.item;
    data.attributes.will.value = data.abilities.wis.mod + (data.attributes.will.rank * 2) + data.details.level.value + data.attributes.will.item;
    data.attributes.perception.value = data.abilities.wis.mod + (data.attributes.perception.rank * 2) + data.details.level.value + data.attributes.perception.item;

    // Skill modifiers
/*     for (let skl of Object.values(data.skills)) {
      skl.value = parseFloat(skl.value || 0);
      skl.mod = data.abilities[skl.ability].mod + Math.floor(skl.value * data.attributes.prof.value);
    } */

    // Attributes
    data.attributes.init.mod = data.abilities.dex.mod + (data.attributes.init.value || 0);
    data.attributes.ac.min = 10 + data.abilities.dex.mod;

    // Spell DC
    /* let spellAbl = data.attributes.spellcasting.value || "int";
    let bonusDC = getProperty(actorData.flags, "dnd5e.spellDCBonus") || 0;
    data.attributes.spelldc.value = 8 + data.attributes.prof.value + data.abilities[spellAbl].mod + bonusDC; */

    // TODO: Migrate trait storage format
    /* const map = {
      "dr": CONFIG.damageTypes,
      "di": CONFIG.damageTypes,
      "dv": CONFIG.damageTypes,
      "ci": CONFIG.conditionTypes,
      "languages": CONFIG.languages
    };
    for ( let [t, choices] of Object.entries(map) ) {
      let trait = data.traits[t];
      if (!( trait.value instanceof Array )) {
        trait.value = TraitSelector5e._backCompat(trait.value, choices);
      }
    } */

    // Return the prepared Actor data
    return actorData;
  }

  /* -------------------------------------------- */

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(data) {

    // Level, experience, and proficiency
    data.details.level.value = parseInt(data.details.level.value);
    data.details.xp.max = this.getLevelExp(data.details.level.value || 1);
    let prior = this.getLevelExp(data.details.level.value - 1 || 0),
          req = data.details.xp.max - prior;
    data.details.xp.pct = Math.min(Math.round((data.details.xp.value -prior) * 100 / req), 99.5);
    data.attributes.prof.value = Math.floor((data.details.level.value + 7) / 4);
  }

  /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   */
  /* _prepareNPCData(data) {

    // CR, kill exp, and proficiency
    data.details.cr.value = parseFloat(data.details.cr.value) || 0;
    data.details.xp.value = this.getCRExp(data.details.cr.value);
    data.attributes.prof.value = Math.floor((Math.max(data.details.cr.value, 1) + 7) / 4);
  } */

  /* -------------------------------------------- */

  /**
   * Return the amount of experience required to gain a certain character level.
   * @param level {Number}  The desired level
   * @return {Number}       The XP required
   */
  getLevelExp(level) {
    const levels = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000,
      120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
    return levels[Math.min(level, levels.length - 1)];
  }

  /* -------------------------------------------- */

  /**
   * Return the amount of experience granted by killing a creature of a certain CR.
   * @param cr {Number}     The creature's challenge rating
   * @return {Number}       The amount of experience granted per kill
   */
  /* getCRExp(cr) {
    if (cr < 1.0) return Math.max(200 * cr, 10);
    const xps = [
      10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000,
      20000, 22000, 25000, 30000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000
    ];
    return xps[cr];
  } */

  /* -------------------------------------------- */
  /*  Owned Item Management
  /* -------------------------------------------- */

  /**
   * Extend OwnedItem creation logic for the 5e system to make weapons proficient by default when dropped on a NPC sheet
   * See the base Actor class for API documentation of this method
   */
  /* async createOwnedItem(itemData, options) {
    if ( !this.isPC && itemData.type === "weapon" ) mergeObject(itemData, {"data.proficient.value": true});
    return super.createOwnedItem(itemData, options);
  } */

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  /* rollSkill(event, skillName) {
    let skl = this.data.data.skills[skillName],
      parts = ["@mod"],
      flavor = `${skl.label} Skill Check`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: {mod: skl.mod},
      title: flavor,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  } */

  /* -------------------------------------------- */

  /**
   * Roll a generic ability test or saving throw.
   * Prompt the user for input on which variety of roll they want to do.
   * @param {String}abilityId     The ability id (e.g. "str")
   * @param {Object} options      Options which configure how ability tests or saving throws are rolled
   */
  /* rollAbility(abilityId, options) {
    let abl = this.data.data.abilities[abilityId];
    new Dialog({
      title: `${abl.label} Ability Check`,
      content: `<p>What type of ${abl.label} check?</p>`,
      buttons: {
        test: {
          label: "Ability Test",
          callback: () => this.rollAbilityTest(abilityId, options)
        },
        save: {
          label: "Saving Throw",
          callback: () => this.rollAbilitySave(abilityId, options)
        }
      }
    }).render(true);
  } */

  /* -------------------------------------------- */

  /**
   * Roll an Ability Test
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {String} abilityId    The ability ID (e.g. "str")
   * @param {Object} options      Options which configure how ability tests are rolled
   */
  /* rollAbilityTest(abilityId, options={}) {
    let abl = this.data.data.abilities[abilityId],
        parts = ["@mod"],
        flavor = `${abl.label} Ability Test`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: {mod: abl.mod},
      title: flavor,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  } */

  /* -------------------------------------------- */

  /**
   * Roll an Ability Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {String} abilityId    The ability ID (e.g. "str")
   * @param {Object} options      Options which configure how ability tests are rolled
   */
  /* rollAbilitySave(abilityId, options={}) {
    let abl = this.data.data.abilities[abilityId],
        parts = ["@mod"],
        flavor = `${abl.label} Saving Throw`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: {mod: abl.save},
      title: flavor,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  } */

  /* -------------------------------------------- */

  /**
   * Roll a hit die of the appropriate type, gaining hit points equal to the die roll plus your CON modifier
   * @param {String} formula    The hit die type to roll
   */
  /* rollHitDie(formula) {

    // Prepare roll data
    let parts = [formula, "@abilities.con.mod"],
        title = `Roll Hit Die`,
        rollData = duplicate(this.data.data);

    // Confirm the actor has HD available
    if ( rollData.attributes.hd.value === 0 ) throw new Error(`${this.name} has no Hit Dice remaining!`);

    // Call the roll helper utility
    return Dice5e.damageRoll({
      event: new Event("hitDie"),
      parts: parts,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this}),
      critical: false,
      dialogOptions: {width: 350}
    }).then(roll => {
      let hp = this.data.data.attributes.hp,
          dhp = Math.min(hp.max - hp.value, roll.total),
          hd = Math.max(this.data.data.attributes.hd.value - 1, 0);
      this.update({"data.attributes.hp.value": hp.value + dhp, "data.attributes.hd.value": hd});
    })
  } */

  /* -------------------------------------------- */

  /**
   * Take a short rest, recovering resources and possibly rolling Hit Dice
   */
  /* shortRest() {
    const data = this.data.data,
          update = {};

    // Recover resources
    for ( let r of ["primary", "secondary"] ) {
      let res = data.resources[r];
      if ( res.max && res.sr ) {
        update[`data.resources.${r}.value`] = res.max;
      }
    }

    // Update the actor
    this.update(update);
  } */

  /* -------------------------------------------- */

  /**
   * Take a long rest, recovering HP, HD, resources, and spell slots
   */
  /* longRest() {
    const data = this.data.data,
          update = {};

    // Recover hit points
    let dhp = data.attributes.hp.max - data.attributes.hp.value;
    update["data.attributes.hp.value"] = data.attributes.hp.max;

    // Recover hit dice
    let recover_hd = Math.max(Math.floor(data.details.level.value/2), 1),
        dhd = Math.min(recover_hd, data.details.level.value - data.attributes.hd.value);
    update["data.attributes.hd.value"] = data.attributes.hd.value + dhd;

    // Recover resources
    for ( let r of ["primary", "secondary"] ) {
      let res = data.resources[r];
      if ( res.max && (res.lr || res.sr ) ) {
        update[`data.resources.${r}.value`] = res.max;
      }
    }

    // Recover spell slots
    for ( let [k, v] of Object.entries(data.spells) ) {
      if ( !v.max ) continue;
      update[`data.spells.${k}.value`] = v.max;
    }

    // Update the actor
    this.update(update);

    // Return some update data for logging
    return {
      dhp: dhp,
      dhd: dhd
    }
  } */

  /* -------------------------------------------- */

  /**
   * Apply rolled dice damage to the token or tokens which are currently controlled.
   * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
   *
   * @param {HTMLElement} roll    The chat entry which contains the roll data
   * @param {Number} multiplier   A damage multiplier to apply to the rolled damage.
   * @return {Promise}
   */
  static async applyDamage(roll, multiplier) {
    let value = Math.floor(parseFloat(roll.find('.dice-total').text()) * multiplier);
    const promises = [];
    for ( let t of canvas.tokens.controlled ) {
      let a = t.actor,
          hp = a.data.data.attributes.hp,
          tmp = parseInt(hp.temp),
          dt = value > 0 ? Math.min(tmp, value) : 0;
      promises.push(t.actor.update({
        "data.attributes.hp.temp": tmp - dt,
        "data.attributes.hp.value": Math.clamped(hp.value - (value - dt), 0, hp.max)
      }));
    }
    return Promise.all(promises);
  }
}

// Assign the actor class to the CONFIG
CONFIG.Actor.entityClass = ActorPF2e;


/**
 * Hijack Token health bar rendering to include temporary and temp-max health in the bar display
 * TODO: This should probably be replaced with a formal Token class extension
 * @private
 */
/* const _drawBar = Token.prototype._drawBar;
Token.prototype._drawBar = function(number, bar, data) {
  if ( data.attribute === "attributes.hp" ) {
    data = duplicate(data);
    data.value += parseInt(data['temp'] || 0);
    data.max += parseInt(data['tempmax'] || 0);
  }
  _drawBar.bind(this)(number, bar, data);
}; */

