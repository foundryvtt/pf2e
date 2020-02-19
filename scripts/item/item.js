/**
 * Override and extend the basic :class:`Item` implementation
 */
class ItemPF2e extends Item {

  /**
   * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   */
  async roll(event) {

    // Basic template rendering data
    const template = `systems/pf2e/templates/chat/${this.data.type}-card.html`
    const token = this.actor.token;
    const nearestItem = event.currentTarget.closest(".item")
    this.data.contextualData = nearestItem.dataset || {}
    const templateData = {
      actor: this.actor,
      tokenId: token ? `${token.scene._id}.${token.id}` : null,
      item: this.data,
      data: this.getChatData()
    };

    // Basic chat message data
    const chatData = {
      user: game.user._id,
      speaker: {
        actor: this.actor._id,
        token: this.actor.token,
        alias: this.actor.name
      },
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    };

    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperIDs("GM");
    if ( rollMode === "blindroll" ) chatData["blind"] = true;

    // Render the template
    chatData["content"] = await renderTemplate(template, templateData);

    // Create the chat message
    return ChatMessage.create(chatData, {displaySheet: false});
  }

  /* -------------------------------------------- */
  /*  Chat Card Data
  /* -------------------------------------------- */

  getChatData(htmlOptions) {
    let itemType = this.data.type;  
    const data = this[`_${itemType}ChatData`]();
    data.description.value = enrichHTML(data.description.value, htmlOptions);
    return data;    
  }

  /* -------------------------------------------- */

  _armorChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      CONFIG.armorTypes[data.armorType.value],
      CONFIG.armorGroups[data.group.value],
      "+" + (data.armor.value ? data.armor.value : 0) + " AC Bonus",
      (data.dex.value || 0) + " Dex Cap",
      (data.check.value || 0) + " Check Penalty",
      (data.speed.value || 0) + " Speed Penalty",
      data.traits.value,
      data.equipped.value ? "Equipped" : null
    ];
    data.properties = properties.filter(p => p !== null);

    data.traits = null;
    return data;
  }

  /* -------------------------------------------- */

  _equipmentChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      data.equipped.value ? "Equipped" : null,
    ];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  _weaponChatData() {
    const data = duplicate(this.data.data);
    let traits = [],
        itemTraits = data.traits.value,
        versatileTrait = false,
        versatileType = "",
        twohandedTrait = false,
        twohandedDie = "",
        versatileRegex = `(\\bversatile\\b)-([s]|[b]|[p])`,
        twohandedRegex = `(\\btwo-hand\\b)-(d\\d+)`;

    if ((data.traits.value || []).length != 0) {      
      for(var i = 0 ; i < data.traits.value.length ; i++){
        let traitsObject = {
          "label": CONFIG.weaponTraits[data.traits.value[i]] || (data.traits.value[i].charAt(0).toUpperCase() + data.traits.value[i].slice(1)),
          "description": CONFIG.traitsDescriptions[data.traits.value[i]] || ""
        };        
        traits.push(traitsObject);        

        // Check if two-handed trait is present
        if (itemTraits[i].match(twohandedRegex)) {
          twohandedTrait = true;
          twohandedDie = itemTraits[i].match(twohandedRegex)[2];
        } else if (itemTraits[i].match(versatileRegex)) {
          versatileTrait = true;
          versatileType = (itemTraits[i].match(versatileRegex)[2]).toLowerCase();
        } 
      } 
    }

    let properties = [
      //(parseInt(data.range.value) > 0) ? `${data.range.value} feet` : null,
      //CONFIG.weaponTypes[data.weaponType.value],
      //CONFIG.weaponGroups[data.group.value]
    ];

    if (data.group.value) {
      data.critSpecialization = {
        "label": CONFIG.weaponGroups[data.group.value],
        "description": CONFIG.weaponDescriptions[data.group.value]}
    }

    
    let isAgile = (data.traits.value || []).includes("agile");
    data.map2 = isAgile ? '-4' : '-5';
    data.map3 = isAgile ? '-8' : '-10';
    data.isTwohanded = twohandedTrait ? true : false;
    data.wieldedTwoHands = data.hands.value ? true : false;
    data.properties = properties.filter(p => !!p);
    data.traits = traits.filter(p => !!p);
    return data;
  }

    /* -------------------------------------------- */

    _meleeChatData() {
      const data = duplicate(this.data.data);
/*       const properties = [
        CONFIG.weaponTypes[data.weaponType.value],
        CONFIG.weaponGroups[data.group.value]
      ];
      data.properties = properties.filter(p => !!p); */
      let traits = [];
/*       if ((data.traits.value || []).length != 0) {
        traits = duplicate(data.traits.value);
        for(var i = 0 ; i < traits.length ; i++){
          //traits[i] = traits[i].charAt(0).toUpperCase() + traits[i].substr(1);
          traits[i] = CONFIG.weaponTraits[traits[i]];
        } 
      } */
      if ((data.traits.value || []).length != 0) {      
        for(var i = 0 ; i < data.traits.value.length ; i++){
          let traitsObject = {
            "label": CONFIG.weaponTraits[data.traits.value[i]]  || (data.traits.value[i].charAt(0).toUpperCase() + data.traits.value[i].slice(1)),
            "description": CONFIG.traitsDescriptions[data.traits.value[i]] || ""
          };        
          traits.push(traitsObject);
        } 
      }

      let properties = [
        (parseInt(data.range.value) > 0) ? `${data.range.value} feet` : null,
        //CONFIG.weaponTypes[data.weaponType.value],
        CONFIG.damageTypes[data.damage.damageType]
      ];

      //if (traits.length != 0) properties = properties.concat(traits);
      
      let isAgile = (data.traits.value || []).includes("agile");
      data.map2 = isAgile ? '-4' : '-5';
      data.map3 = isAgile ? '-8' : '-10';
      data.properties = properties.filter(p => !!p);
      data.traits = traits.filter(p => !!p);
      return data;
    }

  /* -------------------------------------------- */

  _consumableChatData() {
    const data = duplicate(this.data.data);
    data.consumableType.str = CONFIG.consumableTypes[data.consumableType.value];
    data.properties = [data.consumableType.str, data.charges.value + "/" + data.charges.max + " Charges"];
    data.hasCharges = data.charges.value >= 0;
    return data;
  }

  /* -------------------------------------------- */

  _toolChatData() {
    const data = duplicate(this.data.data);
    let abl = this.actor.data.data.abilities[data.ability.value].label,
        prof = data.proficient.value || 0;
    const properties = [abl, CONFIG.proficiencyLevels[prof]];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  _loreChatData() {
    const data = duplicate(this.data.data);
    if (this.actor.data.type != "npc") {
      let abl = this.actor.data.data.abilities[data.ability.value].label,
          prof = data.proficient.value || 0;
      const properties = [abl, CONFIG.proficiencyLevels[prof]];
      data.properties = properties.filter(p => p !== null);
    } 
    return data;
  }

  /* -------------------------------------------- */

  _backpackChatData() {
    const data = duplicate(this.data.data);
    data.properties = [];
    return data;
  }

  /* -------------------------------------------- */

  _spellChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

    let spellcastingEntry = this.actor.getOwnedItem(data.location.value),
        spellDC = spellcastingEntry.data.data.spelldc.dc,
        spellAttack = spellcastingEntry.data.data.spelldc.value;

    // Spell saving throw text and DC
    data.isSave = data.spellType.value === "save";
    
    if ( data.isSave ) {
      data.save.dc = spellDC
    }
    else data.save.dc = spellAttack;
    data.save.str = data.save.value ? (this.actor.data.data.saves[data.save.value.toLowerCase()] || {}).label : "";

    // Spell attack labels
    data.damageLabel = data.spellType.value === "heal" ? "Healing" : "Damage";
    data.isAttack = data.spellType.value === "attack";

    // Combine properties
    const props = [
      "Spell: " + CONFIG.spellLevels[data.level.value],
      "Components: " + data.components.value,
      data.range.value ? "Range: " + data.range.value : null,
      data.target.value ? "Target: " + data.target.value : null,
      data.area.value ? `Area: ${CONFIG.areaSizes[data.area.value]} ${CONFIG.areaTypes[data.area.areaType]}` : null,
      data.time.value ? "Actions: " + data.time.value : null,
      data.duration.value ? "Duration: " + data.duration.value : null,
    ];
    if(data.level.value < parseInt(this.data.contextualData.spellLvl)) {
      props.push(`Heightened: +${parseInt(this.data.contextualData.spellLvl) - data.level.value}`)
    }
    data.properties = props.filter(p => p !== null);

    let traits = [];  
    if ((data.traits.value || []).length != 0) {      
      for(var i = 0 ; i < data.traits.value.length ; i++){
        let traitsObject = {
          "label": data.traits.value[i].charAt(0).toUpperCase() + data.traits.value[i].substr(1),
          "description": CONFIG.traitsDescriptions[data.traits.value[i]] || ""
        };        
        traits.push(traitsObject);
      } 
    }
    data.traits = traits.filter(p => p);
    //Toggling this off for now
/*     data.area = data.area.value ? {
      "label": `Area: ${CONFIG.areaSizes[data.area.value]} ${CONFIG.areaTypes[data.area.areaType]}`,
      "areaType": data.area.areaType,
      "size": data.area.value
    } : null; */

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for items of the "Feat" type
   */
  _featChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

/*     let traits = [];
    if ((data.traits.value || []).length != 0) {
      traits = duplicate(data.traits.value);
      for(var i = 0 ; i < traits.length ; i++){
        traits[i] = traits[i].charAt(0).toUpperCase() + traits[i].substr(1);
      } 
    } */

    // Feat properties
    let props = [
      `Level ${data.level.value || 0}`,
      data.actionType.value ? CONFIG.actionTypes[data.actionType.value] : null
    ];
    //if (traits.length != 0) props = props.concat(traits);

    data.properties = props.filter(p => p);

    let traits = [];  
    if ((data.traits.value || []).length != 0) {      
      for(var i = 0 ; i < data.traits.value.length ; i++){
        let traitsObject = {
          "label": CONFIG.featTraits[data.traits.value[i]]  || (data.traits.value[i].charAt(0).toUpperCase() + data.traits.value[i].slice(1)),
          "description": CONFIG.traitsDescriptions[data.traits.value[i]] || ""
        };        
        traits.push(traitsObject);
      } 
    }
    data.traits = traits.filter(p => p);
    return data;
  }

  _actionChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

    /* let traits = [];
    if ((data.traits.value || []).length != 0) {
      traits = duplicate(data.traits.value);
      for(var i = 0 ; i < traits.length ; i++){
        traits[i] = traits[i].charAt(0).toUpperCase() + traits[i].substr(1);
      } 
    } */

    let associatedWeapon = null;
    if (data.weapon.value) associatedWeapon = this.actor.getOwnedItem(data.weapon.value);

    // Feat properties
    let props = [
      CONFIG.actionTypes[data.actionType.value],
      associatedWeapon ? `Weapon: ${associatedWeapon.name}` : null
    ];
    //if (traits.length != 0) props = props.concat(traits);

    data.properties = props.filter(p => p);

    let traits = [];  
    if ((data.traits.value || []).length != 0) {      
      for(var i = 0 ; i < data.traits.value.length ; i++){
        let traitsObject = {
          "label": CONFIG.featTraits[data.traits.value[i]]  || (data.traits.value[i].charAt(0).toUpperCase() + data.traits.value[i].slice(1)),
          "description": CONFIG.traitsDescriptions[data.traits.value[i]] || ""
        };        
        traits.push(traitsObject);
      } 
    }
    data.traits = traits.filter(p => p);

    return data;
  }

  /* -------------------------------------------- */
  /*  Roll Attacks
  /* -------------------------------------------- */

  /**
   * Roll a Weapon Attack
   * Rely upon the DicePF2e.d20Roll logic for the core implementation
   */
  rollWeaponAttack(event, multiAttackPenalty) {
    if ( this.type === "action" ) {
      let itemId = parseInt(this.data.data.weapon.value),
          item = this.actor.getOwnedItem(itemId);
      item.rollWeaponAttack(event, multiAttackPenalty);
      return;
    }
    else if ( this.type !== "weapon" && this.type !== "melee"  ) throw "Wrong item type!";

    // Prepare roll data
    //let itemData = this.data.data,
    let itemData = this.getChatData();
    let rollData = duplicate(this.actor.data.data);
    let isFinesse = (itemData.traits.value || []).includes("finesse");
    let abl = (isFinesse && rollData.abilities.dex.mod > rollData.abilities.str.mod ? "dex" : (itemData.ability.value || "str"));
    let prof = itemData.weaponType.value || "simple";
    let parts = ["@item.bonus.value", `@abilities.${abl}.mod`, `@martial.${prof}.value`];
    let title = `${this.name} - Attack Roll` + ((multiAttackPenalty > 1) ? ` (MAP ${multiAttackPenalty})` : "");

    if (this.actor.data.type === "npc") {
      parts = ["@item.bonus.value", `@martial.simple.value`];
    }
    rollData.item = itemData;
    //if ( !itemData.proficient.value ) parts.pop();

    if (multiAttackPenalty == 2)
      parts.push(itemData.map2);
    else if (multiAttackPenalty == 3)
      parts.push(itemData.map3);

    // TODO: Incorporate Elven Accuracy

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event: event,
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Weapon Damage
   * Rely upon the DicePF2e.damageRoll logic for the core implementation
   */
  rollWeaponDamage(event, critical=false) {
    // Check to see if this is a damage roll for either: a weapon, a NPC attack or an action associated with a weapon.
    if ( this.type === "action" ) {
      let itemId = parseInt(this.data.data.weapon.value),
          item = this.actor.getOwnedItem(itemId);
      item.rollWeaponDamage(event);
      return;
    } 
    else if ( this.type !== "weapon" && this.type !== "melee"  ) throw "Wrong item type!";
    

    // Get item and actor data and format it for the damage roll
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        rollDie = itemData.damage.die,
        abl = "str",
        abilityMod = rollData.abilities[abl].mod,
        parts = [],
        dtype = CONFIG.damageTypes[itemData.damage.damageType];
    
    // Get detailed trait information from item
    let traits = itemData.traits.value || [],
        critTrait = "",
        critDie = "",
        twohandedTrait = false,
        twohandedDie = "",
        thrownTrait = false,
        len = traits.length,
        critRegex = `(\\bdeadly\\b|\\bfatal\\b)-(d\\d+)`,
        twohandedRegex = `(\\btwo-hand\\b)-(d\\d+)`,
        thrownRegex = `(\\bthrown\\b)-(\\d+)`,
        hasThiefRacket = this.actor.data.items.filter(e => e.type === "feat" && e.name == "Thief Racket").length > 0;

    if (hasThiefRacket && rollData.abilities["dex"].mod > abilityMod)
      abilityMod = rollData.abilities["dex"].mod;

    // Find detailed trait information
    for (let i = 0; i < len; i++) {
      if (traits[i].match(critRegex)) {          
        critTrait = traits[i].match(critRegex)[1];
        critDie = traits[i].match(critRegex)[2];
      } else if (traits[i].match(twohandedRegex)) {
        twohandedTrait = true;
        twohandedDie = traits[i].match(twohandedRegex)[2];
      } else if (traits[i].match(thrownRegex)) {
        thrownTrait = true;
      }      
    }

    // If weapon has two-hand trait and wielded in two hands, apply the appropriate damage die
    if (twohandedTrait && itemData.hands.value) {
      rollDie = twohandedDie;
    }

    // Join the damage die into the parts to make a roll (this will be overwriten below if the damage is critical)
    let weaponDamage = itemData.damage.dice + rollDie;    
    parts = [weaponDamage];
    
    // If this damage roll is a critical, apply critical damage and effects
    if (critical === true) {
      if (critTrait === "deadly") {
        weaponDamage = (Number(itemData.damage.dice) * 2) + rollDie;
        let dice = itemData.damage.dice ? itemData.damage.dice : 1,
            deadlyDice = dice > 2 ? 2 : 1, // since deadly requires a greater striking (3dX)
            deadlyDamage = deadlyDice + critDie;
        parts = [weaponDamage, deadlyDamage];        
      } else if (critTrait === "fatal") {
        weaponDamage = ((Number(itemData.damage.dice) * 2) + 1) + critDie;
        parts = [weaponDamage];
      } else {
        weaponDamage = (Number(itemData.damage.dice) * 2) + rollDie;
        parts = [weaponDamage];
      }
    }

    // Add abilityMod to the damage roll.
    if ( itemData.range.value === "melee" || itemData.range.value === "reach" || itemData.range.value == "") { // if a melee attack
      if (critical) parts.push(abilityMod * 2);
      else parts.push(abilityMod)
    } else { // else if a ranged attack
      if ((itemData.traits.value || []).includes("propulsive")) {        
        if (Math.sign(this.actor.data.data.abilities.str.mod) === 1) {
          let halfStr = Math.floor(this.actor.data.data.abilities.str.mod / 2);
          if (critical) parts.push(halfStr * 2);
          else parts.push(halfStr);
        }
      }
      else if (thrownTrait) { 
        if (critical) parts.push(abilityMod * 2);
        else parts.push(abilityMod)
      }
    } 

    // Add property rune damage
    
      // add strike damage
      if (itemData.property1.dice && itemData.property1.die && itemData.property1.damageType) {
        if (critical) {
          let propertyDamage = (Number(itemData.property1.dice) * 2) + itemData.property1.die;
          parts.push(propertyDamage)
        } else {
          let propertyDamage = Number(itemData.property1.dice) + itemData.property1.die;
          parts.push(propertyDamage)
        }        
      }
      // add critical damage
      if (itemData.property1.critDice && itemData.property1.critDie && itemData.property1.critDamageType) {
        if (critical) {
          let propertyDamage = Number(itemData.property1.critDice) + itemData.property1.critDie;
          parts.push(propertyDamage)
        }
      }
    

    // if this is an NPC attack, use the damage defined in the itemData
    if (this.type === "melee") {
      weaponDamage = itemData.damage.die;
      parts = [weaponDamage];
    }

    // Set the title of the roll
    let critTitle = critTrait ? critTrait.toUpperCase() : "";
    let title = critical ? `Critical ${critTitle} Damage: ${this.name}` : `Damage: ${this.name}`;
    if ( dtype ) title += ` (${dtype})`;

    // Call the roll helper utility
    rollData.item = itemData;
    DicePF2e.damageRoll({
      event: event,
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Spell Damage
   * Rely upon the DicePF2e.d20Roll logic for the core implementation
   */
  rollSpellAttack(event) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        spellcastingEntry = this.actor.getOwnedItem(itemData.location.value),
        spellAttack = spellcastingEntry.data.data.spelldc.value,
        parts = [spellAttack],
        title = `${this.name} - Spell Attack Roll`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Spell Damage
   * Rely upon the DicePF2e.damageRoll logic for the core implementation
   */
  rollSpellDamage(event) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    const button = event.currentTarget,
          card = button.closest('*[data-spell-lvl]');

    // Get data
    let itemData = this.data.data,
        spellcastingEntry = this.actor.getOwnedItem(itemData.location.value),
        rollData = duplicate(this.actor.data.data),
        abl = spellcastingEntry.data.data.ability.value || "int",
        parts = [itemData.damage.value],
        isHeal = itemData.spellType.value === "heal",
        dtype = CONFIG.damageTypes[itemData.damageType.value],
        spellLvl = parseInt(card.dataset.spellLvl);

    // Append damage type to title
    let title = this.name + (isHeal ? " - Healing" : " - Damage");
    if ( dtype && !isHeal ) title += ` (${dtype})`;

    // Add item to roll data
    rollData["mod"] = rollData.abilities[abl].mod;
    rollData.item = itemData;

    if (itemData.damage.applyMod) parts.push(rollData.abilities[abl].mod);
    let scaling = itemData.scaling || {}
    if (scaling.mode === "level1" && scaling.formula !== "") {
      if (itemData.level.value === 0) {
        let scaling_parts = Array(Math.ceil(this.actor.data.data.details.level.value / 2) - 1).fill(scaling.formula)
        parts.push(...scaling_parts)
      } else if (itemData.level.value < spellLvl) {
        let scaling_parts = Array(spellLvl - itemData.level.value).fill(scaling.formula)
        parts.push(...scaling_parts)
      }
    }

    // Call the roll helper utility
    DicePF2e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      actor: this.actor,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Use a consumable item
   */
  rollConsumable(ev) {
    let itemData = this.data.data;

    // Submit the roll to chat
    let cv = itemData['consume'].value,
        content = `Uses ${this.name}`;
    if ( cv ) {
      new Roll(cv).toMessage({
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        flavor: content
      });
    } else {
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        content: content
      })
    }

    // Deduct consumed charges from the item
    if ( itemData['autoUse'].value ) {
      let qty = itemData['quantity'],
          chg = itemData['charges'];

      // Deduct an item quantity
      if ( chg.value <= 1 && qty.value > 1 ) {
        let options = {
          "_id": this.data._id,
          'data.quantity.value': Math.max(qty.value - 1, 0),
          'data.charges.value': chg.max
        };
        this.actor.updateEmbeddedEntity("OwnedItem", options);
      }

      // Optionally destroy the item
      else if ( chg.value <= 1 && qty.value <= 1 && itemData['autoDestroy'].value ) {
        this.actor.removeEmbeddedEntity("OwnedItem", this.data._id);
      }

      // Deduct the remaining charges
      else {
        this.actor.updateEmbeddedEntity("OwnedItem", {_id: this.data._id, 'data.charges.value': Math.max(chg.value - 1, 0)});
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool Check
   * Rely upon the DicePF2e.d20Roll logic for the core implementation
   */
  /* rollToolCheck(event) {
    if ( this.type !== "tool" ) throw "Wrong item type!";

    // Prepare roll data
    let rollData = duplicate(this.actor.data.data),
      abl = this.data.data.ability.value || "int",
      parts = [`@abilities.${abl}.mod`, "@proficiency"],
      title = `${this.name} - Tool Check`;
    rollData["ability"] = abl;
    rollData["proficiency"] = Math.floor((this.data.data.proficient.value || 0) * rollData.attributes.prof.value);

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      template: "systems/pf2e/templates/chat/tool-roll-dialog.html",
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: (parts, data) => `${this.name} - ${data.abilities[data.ability].label} Check`,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710,
      },
      onClose: (html, parts, data) => {
        abl = html.find('[name="ability"]').val();
        data.ability = abl;
        parts[1] = `@abilities.${abl}.mod`;
      }
    }).then(roll => {
      roll.toMessage({
        flavor: flavor,
        highlightSuccess: roll.parts[0].total === 20,
        highlightFailure: roll.parts[0].total === 1
      });
    });
  } */

  /* -------------------------------------------- */

  /**
   * Roll a Feat Attack
   * Rely upon the DicePF2e.d20Roll logic for the core implementation
   */
  /* rollFeatAttack(event) {
    if ( this.type !== "feat" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [`@abilities.${abl}.mod`, "@attributes.prof.value"],
        title = `${this.name} - Attack Roll`;
    rollData.item = itemData;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  } */

  /* -------------------------------------------- */

  /**
   * Roll Feat Damage
   * Rely upon the DicePF2e.damageRoll logic for the core implementation
   */
  rollFeatDamage(event) {
    if ( this.type !== "feat" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [itemData.damage.value],
        dtype = CONFIG.damageTypes[itemData.damageType.value];

    // Append damage type to title
    let title = `${this.name} - Damage`;
    if ( dtype ) title += ` (${dtype})`;

    // Add item data to roll
    rollData["mod"] = rollData.abilities[abl].mod;
    rollData.item = itemData;

    // Call the roll helper utility
    DicePF2e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      actor: this.actor,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  static chatListeners(html) {

    // Chat card actions
    html.on('click', '.card-buttons button', ev => {
      ev.preventDefault();

      // Extract card data
      const button = $(ev.currentTarget),
            messageId = button.parents('.message').attr("data-message-id"),
            senderId = game.messages.get(messageId).user._id,
            card = button.parents('.chat-card');

      // Confirm roll permission
      if ( !game.user.isGM && ( game.user._id !== senderId )) return;

      // Get the Actor from a synthetic Token
      let actor;
      const tokenKey = card.attr("data-token-id");
      if ( tokenKey ) {
        const [sceneId, tokenId] = tokenKey.split(".");
        let token;
        if ( sceneId === canvas.scene._id ) token = canvas.tokens.get(tokenId);
        else {
          const scene = game.scenes.get(sceneId);
          if ( !scene ) return;
          let tokenData = scene.data.tokens.find(t => t._id === tokenId);
          if ( tokenData ) token = new Token(tokenData);
        }
        if ( !token ) return;
        actor = Actor.fromToken(token);
      } else actor = game.actors.get(card.attr('data-actor-id'));

      // Get the Item
      if ( !actor ) return;
      const itemId = card.attr("data-item-id");
      //let itemData = actor.items.find(i => i.id === itemId);
      let itemData = (actor.getOwnedItem(itemId) || {}).data;
      if ( !itemData ) return;
      const item = new CONFIG.Item.entityClass(itemData, {actor: actor});

      // Get the Action
      const action = button.attr("data-action");

      // Weapon attack
      if ( action === "weaponAttack" ) item.rollWeaponAttack(ev);
      else if ( action === "weaponAttack2" ) item.rollWeaponAttack(ev, 2);
      else if ( action === "weaponAttack3" ) item.rollWeaponAttack(ev, 3);
      else if ( action === "weaponDamage" ) item.rollWeaponDamage(ev);
      else if ( action === "criticalDamage" ) item.rollWeaponDamage(ev, true);

      // Spell actions
      else if ( action === "spellAttack" ) item.rollSpellAttack(ev);
      else if ( action === "spellDamage" ) item.rollSpellDamage(ev);

      // Feat actions
      else if ( action === "featAttack" ) item.rollFeatAttack(ev);
      else if ( action === "featDamage" ) item.rollFeatDamage(ev);

      // Consumable usage
      else if ( action === "consume" ) item.rollConsumable(ev);

      // Tool usage
      else if ( action === "toolCheck" ) item.rollToolCheck(ev);
    });
  }
}

// Assign ItemPF2e class to CONFIG
CONFIG.Item.entityClass = ItemPF2e;


/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on("getChatLogEntryContext", (html, options) => {

  // Condition
  let canApply = li => canvas.tokens.controlledTokens.length && li.find(".dice-roll").length;

  // Apply Damage to Token
  options["Apply Damage"] = {
    icon: '<i class="fas fa-user-minus"></i>',
    condition: canApply,
    callback: li => ActorPF2e.applyDamage(li, 1)
  };

  // Apply Healing to Token
  options["Apply Healing"] = {
    icon: '<i class="fas fa-user-plus"></i>',
    condition: canApply,
    callback: li => ActorPF2e.applyDamage(li, -1)
  };

  // Apply Double-Damage
  options["Double Damage"] = {
    icon: '<i class="fas fa-user-injured"></i>',
    condition: canApply,
    callback: li => ActorPF2e.applyDamage(li, 2)
  };

  // Apply Half-Damage
  options["Half Damage"] = {
    icon: '<i class="fas fa-user-shield"></i>',
    condition: canApply,
    callback: li => ActorPF2e.applyDamage(li, 0.5)
  }
});
