/**
 * Override and extend the basic :class:`Item` implementation
 */
class ItemPF2e extends Item {

  /**
   * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   */
  async roll() {

    // Basic template rendering data
    const template = `public/systems/pf2e/templates/chat/${this.data.type}-card.html`
    const token = this.actor.token;
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
      type: CHAT_MESSAGE_TYPES.OTHER
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
    let traits = [];
    if ((data.traits.value || []).length != 0) {
      traits = duplicate(data.traits.value);
      for(var i = 0 ; i < traits.length ; i++){
        traits[i] = traits[i].charAt(0).toUpperCase() + traits[i].substr(1);
      } 
    }

    let properties = [
      (parseInt(data.range.value) > 0) ? `${data.range.value} feet` : null,
      //CONFIG.weaponTypes[data.weaponType.value],
      CONFIG.weaponGroups[data.group.value]
    ];

    if (traits.length != 0) properties = properties.concat(traits);
    
    let isAgile = (data.traits.value || []).includes("agile");
    data.map2 = isAgile ? '-4' : '-5';
    data.map3 = isAgile ? '-8' : '-10';
    data.properties = properties.filter(p => !!p);
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

    // Spell saving throw text and DC
    data.isSave = data.spellType.value === "save";
    //if ( data.ability.value ) data.save.dc = 8 + ad.abilities[data.ability.value].mod + ad.attributes.prof.value;
    if ( data.isSave ) data.save.dc = ad.attributes.spelldc.dc;
    else data.save.dc = ad.attributes.spelldc.value;
    data.save.str = data.save.value ? this.actor.data.data.saves[data.save.value.toLowerCase()].label : "";

    // Spell attack labels
    data.damageLabel = data.spellType.value === "heal" ? "Healing" : "Damage";
    data.isAttack = data.spellType.value === "attack";

    // Combine properties
    const props = [
      CONFIG.spellSchools[data.school.value],
      CONFIG.spellLevels[data.level.value],
      data.components.value + " Components",
      data.target.value,
      data.time.value,
      data.duration.value ? data.duration.value: null,
      data.sustained.value ? "Concentration" : null,
      data.ritual.value ? "Ritual" : null
    ];
    data.properties = props.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for items of the "Feat" type
   */
  _featChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

    let traits = [];
    if ((data.traits.value || []).length != 0) {
      traits = duplicate(data.traits.value);
      for(var i = 0 ; i < traits.length ; i++){
        traits[i] = traits[i].charAt(0).toUpperCase() + traits[i].substr(1);
      } 
    }

    // Feat properties
    let props = [
      `Level ${data.level.value || 0}`,
      data.actionType.value ? CONFIG.actionTypes[data.actionType.value] : null
    ];
    if (traits.length != 0) props = props.concat(traits);

    data.properties = props.filter(p => p);
    return data;
  }

  _actionChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

    let traits = [];
    if ((data.traits.value || []).length != 0) {
      traits = duplicate(data.traits.value);
      for(var i = 0 ; i < traits.length ; i++){
        traits[i] = traits[i].charAt(0).toUpperCase() + traits[i].substr(1);
      } 
    }

    let associatedWeapon = null;
    if (data.weapon.value) associatedWeapon = this.actor.getOwnedItem(data.weapon.value);

    // Feat properties
    let props = [
      CONFIG.actionTypes[data.actionType.value],
      associatedWeapon ? `Weapon: ${associatedWeapon.name}` : null
    ];
    if (traits.length != 0) props = props.concat(traits);

    data.properties = props.filter(p => p);
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
    let isAgile = (itemData.traits.value || []).includes("agile");
    let isFinesse = (itemData.traits.value || []).includes("finesse");
    let abl = (isFinesse && rollData.abilities.dex.mod > rollData.abilities.str.mod ? "dex" : (itemData.ability.value || "str"));
    let prof = itemData.weaponType.value || "simple";
    let parts = ["@item.bonus.value", `@abilities.${abl}.mod`, `@martial.${prof}.value`];
    let title = `${this.name} - Attack Roll` + ((multiAttackPenalty > 1) ? ` (MAP ${multiAttackPenalty})` : "");

    if (this.type === "melee") {
      parts = ["@item.bonus.value", `@martial.simple.value`];
    }
    rollData.item = itemData;
    //if ( !itemData.proficient.value ) parts.pop();

    if (multiAttackPenalty == 2)
      parts.push(isAgile ? "-4" : "-5");
    else if (multiAttackPenalty == 3)
      parts.push(isAgile ? "-8" : "-10");

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
  rollWeaponDamage(event, alternate=false) {
    if ( this.type === "action" ) {
      let itemId = parseInt(this.data.data.weapon.value),
          item = this.actor.getOwnedItem(itemId);
      item.rollWeaponDamage(event);
      return;
    } 
    else if ( this.type !== "weapon" && this.type !== "melee"  ) throw "Wrong item type!";
    //else if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        weaponDamage = itemData.damage.dice + itemData.damage.die,
        //abl = itemData.ability.value || "str",
        abl = "str",
        parts = [weaponDamage, `@abilities.${abl}.mod`],
        dtype = CONFIG.damageTypes[itemData.damage.damageType];

    // Check if the damage roll is using a ranged weapon, if so apply propulsive or thrown weapon trait rules.
    if ( parseInt(itemData.range.value) > 0) {
      if ((itemData.traits.value || []).includes("propulsive")) {
        
        if (Math.sign(this.actor.data.data.abilities.str.mod) === 1) {
          parts.pop();
          let halfStr = Math.floor(this.actor.data.data.abilities.str.mod / 2);
          parts.push(halfStr);
        }          
        
      }
      else if (!(itemData.traits.value || []).includes("thrown")) 
        parts.pop();
    }

    if (this.type === "melee") {
      weaponDamage = itemData.damage.die;
      parts = [weaponDamage];
    }

    // Append damage type to title
    let title = `${this.name} - Damage`;
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
        //abl = itemData.ability.value || rollData.attributes.spellcasting.value || "int",
        parts = ["@attributes.spelldc.value", "@attributes.spelldc.item"],
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

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || rollData.attributes.spellcasting.value || "int",
        parts = [itemData.damage.value],
        isHeal = itemData.spellType.value === "heal",
        dtype = CONFIG.damageTypes[itemData.damageType.value];

    // Append damage type to title
    let title = this.name + (isHeal ? " - Healing" : " - Damage");
    if ( dtype && !isHeal ) title += ` (${dtype})`;

    // Add item to roll data
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
        this.actor.updateOwnedItem({
          id: this.data.id,
          'data.quantity.value': Math.max(qty.value - 1, 0),
          'data.charges.value': chg.max
        }, true);
      }

      // Optionally destroy the item
      else if ( chg.value <= 1 && qty.value <= 1 && itemData['autoDestroy'].value ) {
        this.actor.deleteOwnedItem(this.data.id);
      }

      // Deduct the remaining charges
      else {
        this.actor.updateOwnedItem({id: this.data.id, 'data.charges.value': Math.max(chg.value - 1, 0)});
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool Check
   * Rely upon the DicePF2e.d20Roll logic for the core implementation
   */
  rollToolCheck(event) {
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
      template: "public/systems/pf2e/templates/chat/tool-roll-dialog.html",
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
  }

  /* -------------------------------------------- */

  /**
   * Roll a Feat Attack
   * Rely upon the DicePF2e.d20Roll logic for the core implementation
   */
  rollFeatAttack(event) {
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
  }

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
          let tokenData = scene.data.tokens.find(t => t.id === Number(tokenId));
          if ( tokenData ) token = new Token(tokenData);
        }
        if ( !token ) return;
        actor = Actor.fromToken(token);
      } else actor = game.actors.get(card.attr('data-actor-id'));

      // Get the Item
      if ( !actor ) return;
      const itemId = Number(card.attr("data-item-id"));
      let itemData = actor.items.find(i => i.id === itemId);
      if ( !itemData ) return;
      const item = new CONFIG.Item.entityClass(itemData, {actor: actor});

      // Get the Action
      const action = button.attr("data-action");

      // Weapon attack
      if ( action === "weaponAttack" ) item.rollWeaponAttack(ev);
      else if ( action === "weaponAttack2" ) item.rollWeaponAttack(ev, 2);
      else if ( action === "weaponAttack3" ) item.rollWeaponAttack(ev, 3);
      else if ( action === "weaponDamage" ) item.rollWeaponDamage(ev);
      else if ( action === "weaponDamage2" ) item.rollWeaponDamage(ev, true);

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
