/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 */
class ActorPF2e extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    //actorData = super.prepareData(actorData);    
    //const data = actorData.data;
    super.prepareData();

    // Get the Actor's data object
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    // Ability modifiers
    if (actorData.type === "npc") {
      for (let abl of Object.values(data.abilities)) {
        if (!abl.mod) abl.mod = 0;
        abl.value = abl.mod * 2 + 10;
      }
    } else {
      for (let abl of Object.values(data.abilities)) {
        abl.mod = Math.floor((abl.value - 10) / 2);
      }
    }

    // Prepare Character data
    if ( actorData.type === "character" ) this._prepareCharacterData(data);
    else if ( actorData.type === "npc" ) this._prepareNPCData(data);

    // TODO: Migrate trait storage format
    const map = {
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
    }

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
    data.details.xp.max = 1000;
    data.details.xp.pct = Math.min(Math.round((data.details.xp.value) * 100 / 1000), 99.5);

    // Saves
    for (let save of Object.values(data.saves)) {
      let proficiency = save.rank ? (save.rank * 2) + data.details.level.value : 0;
      save.value = data.abilities[save.ability].mod + proficiency + save.item;
      save.breakdown = `${save.ability} modifier(${data.abilities[save.ability].mod}) + proficiency(${proficiency}) + item bonus(${save.item})`;
    }

    // Martial
    for (let skl of Object.values(data.martial)) {
      let proficiency = skl.rank ? (skl.rank * 2) + data.details.level.value : 0;
      skl.value = proficiency;
      skl.breakdown = `proficiency(${proficiency})`;
    }

    // Perception
    let proficiency = data.attributes.perception.rank ? (data.attributes.perception.rank * 2) + data.details.level.value : 0;
    data.attributes.perception.value = data.abilities[data.attributes.perception.ability].mod + proficiency + data.attributes.perception.item;
    data.attributes.perception.breakdown = `${data.attributes.perception.ability} modifier(${data.abilities[data.attributes.perception.ability].mod}) + proficiency(${proficiency}) + item bonus(${data.attributes.perception.item})`;
    
    // Prepared Spell Slots
/*     for (let spl of Object.values(data.spells)) {
      if (spl.max) {
        spl["prepared"] = spl["prepared"] || [];
        for(var i = 0; i < spl.max; i++){
          spl.prepared[i] = spl.prepared[i] || null;
        }
        while (spl.prepared.length > spl.max) {
          spl.prepared.pop();
        }
      }
    } */

    // Skill modifiers
    for (let skl of Object.values(data.skills)) {
      //skl.value = parseFloat(skl.value || 0);
      let proficiency = skl.rank ? (skl.rank * 2) + data.details.level.value : 0;      
      skl.mod = data.abilities[skl.ability].mod;

      if (skl.armor) {
        let armorCheckPenalty = skl.armor ? (data.attributes.ac.check || 0) : 0;
        skl.value = data.abilities[skl.ability].mod + proficiency + skl.item + armorCheckPenalty;
        skl.breakdown = `${skl.ability} modifier(${data.abilities[skl.ability].mod}) + proficiency(${proficiency}) + item bonus(${skl.item}) + armor check penalty(${armorCheckPenalty})`;
      } else {
        skl.value = data.abilities[skl.ability].mod + proficiency + skl.item;
        skl.breakdown = `${skl.ability} modifier(${data.abilities[skl.ability].mod}) + proficiency(${proficiency}) + item bonus(${skl.item})`;
      }
      
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   */
  _prepareNPCData(data) {

    // As we only capture the NPCs Spell DC attribute, we need to calculate the Spell Attack Roll.
    // see sidebar on p298 of pf2e core rulebook. 
    data.attributes.spelldc.value = data.attributes.spelldc.dc - 10;

  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollSkill(event, skillName) {
    let skl = this.data.data.skills[skillName],
        rank = CONFIG.proficiencyLevels[skl.rank],
        parts = ["@mod"],
        flavor = `${rank} ${skl.label} Skill Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event: event,
      parts: parts,
      data: {mod: skl.value},
      title: flavor,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a Lore (Item) Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollLoreSkill(event, item) {
    let parts = ["@mod"],
      flavor = `${item.name} Skill Check`,
      i = item.data;

    let proficiency = (i.data.proficient || {}).value ? ((i.data.proficient || {}).value * 2) + this.data.data.details.level.value : 0;      
    let modifier = this.data.data.abilities["int"].mod;
    let itemBonus = Number((i.data.item || {}).value || 0);
    let rollMod = modifier + proficiency + itemBonus;
    //Override roll calculation if this is an NPC "lore" skill
    if(item.actor && item.actor.data && item.actor.data.type === "npc"){
      rollMod = i.data.mod.value;
    }

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event: event,
      parts: parts,
      data: {mod: rollMod},
      title: flavor,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  }

  /* -------------------------------------------- */
  /**
   * Roll a Save Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollSave(event, saveName) {
    let save = this.data.data.saves[saveName],
      parts = ["@mod"],
      flavor = `${save.label} Save Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event: event,
      parts: parts,
      data: {mod: save.value},
      title: flavor,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  }

  /**
   * Roll an Ability Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollAbility(event, abilityName) {
    let skl = this.data.data.abilities[abilityName],
      parts = ["@mod"],
      flavor = `${skl.label} Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event: event,
      parts: parts,
      data: {mod: skl.mod},
      title: flavor,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a Attribute Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollAttribute(event, attributeName) {
    let skl = this.data.data.attributes[attributeName],
      parts = ["@mod"],
      flavor = `${skl.label} Skill Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event: event,
      parts: parts,
      data: {mod: skl.value},
      title: flavor,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  }





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
          tmp = parseInt(hp.temp || 0),
          dt = value > 0 ? Math.min(tmp, value) : 0;
      promises.push(t.actor.update({
        "data.attributes.hp.temp": tmp - dt,
        "data.attributes.hp.value": Math.clamped(hp.value - (value - dt), 0, hp.max)
      }));
    }
    return Promise.all(promises);
  }

  /**
   * Set initiative for the combatant associated with the selected token or tokens with the rolled dice total.
   *
   * @param {HTMLElement} roll    The chat entry which contains the roll data
   * @return {Promise}
   */
  static async setCombatantInitiative(roll) {
    let value = parseFloat(roll.find('.dice-total').text());
    const promises = [];
    for ( let t of canvas.tokens.controlled ) {
      
      let combatant = game.combat.getCombatantByToken(t.id)

      promises.push(
        game.combat.setInitiative(combatant.id, value)
      );
    }
    return Promise.all(promises);
  }

  /* -------------------------------------------- */
  /* Owned Item Management
  /* -------------------------------------------- */

  /**
   * This method extends the base importItemFromCollection functionality provided in the base actor entity 
   * 
   * Import a new owned Item from a compendium collection
   * The imported Item is then added to the Actor as an owned item.
   *
   * @param collection {String}     The name of the pack from which to import
   * @param entryId {String}        The ID of the compendium entry to import
   */
  importItemFromCollection(collection, entryId, location) {

    // if location parameter missing, then use the super method
    if (location == null) {
      console.log("PF2e | importItemFromCollection: ", entryId);
      super.importItemFromCollection(collection, entryId);
      return;
    }

    const pack = game.packs.find(p => p.collection === collection);
    if ( pack.metadata.entity !== "Item" ) return;
    return pack.getEntity(entryId).then(ent => {
      console.log(`${vtt} | Importing Item ${ent.name} from ${collection}`);
      if (ent.type === "spell") {
        ent.data.data.location = {
          "value": location
        };
      }
      delete ent.data._id;
      return this.createOwnedItem(ent.data);
      //return this.createEmbeddedEntity("OwnedItem", ent.data);
    });
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

