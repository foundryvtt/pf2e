/**
 * Extend the basic ActorSheet class to do all the PF2e things!
 * This sheet is an Abstract layer which is not used.
 */
class ActorSheetPF2e extends ActorSheet {

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
    for ( let skl of Object.values(sheetData.data.martial)) {
      skl.icon = this._getProficiencyIcon(skl.rank);
      skl.hover = CONFIG.proficiencyLevels[skl.rank];
    }

    // Update save labels
    for ( let save of Object.values(sheetData.data.saves)) {
      save.icon = this._getProficiencyIcon(save.rank);
      save.hover = CONFIG.proficiencyLevels[save.rank];
    }

    // Update proficiency label
    sheetData.data.attributes.perception.icon = this._getProficiencyIcon(sheetData.data.attributes.perception.rank);
    sheetData.data.attributes.perception.hover = CONFIG.proficiencyLevels[sheetData.data.attributes.perception.rank];

    // Update spell DC label
    sheetData.data.attributes.spelldc.icon = this._getProficiencyIcon(sheetData.data.attributes.spelldc.rank);
    sheetData.data.attributes.spelldc.hover = CONFIG.proficiencyLevels[sheetData.data.attributes.spelldc.rank];


    // Update skill labels
    for ( let skl of Object.values(sheetData.data.skills)) {
      skl.ability = sheetData.data.abilities[skl.ability].label.substring(0, 3);
      skl.icon = this._getProficiencyIcon(skl.rank);
      skl.hover = CONFIG.proficiencyLevels[skl.value];
    }

    // Update traits
    sheetData["actorSizes"] = CONFIG.actorSizes;
    this._prepareTraits(sheetData.data["traits"]);

    // Prepare owned items
    this._prepareItems(sheetData.actor);

    // Return data to the sheet
    return sheetData;
  }

  /* -------------------------------------------- */

  _prepareTraits(traits) {
    const map = {
/*       "dr": CONFIG.damageTypes,
      "di": CONFIG.damageTypes,
      "dv": CONFIG.damageTypes,
      "ci": CONFIG.conditionTypes, */
      "languages": CONFIG.languages
    };
    for ( let [t, choices] of Object.entries(map) ) {
      const trait = traits[t];
      trait.selected = trait.value.reduce((obj, t) => {
        obj[t] = choices[t];
        return obj;
      }, {});

      // Add custom entry
      if ( trait.custom ) trait.selected["custom"] = trait.custom;
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
    let lvl = spell.data.level.value || 0,
        isNPC = this.actorType === "npc";

    // Determine whether to show the spell
    let showSpell = this.options.showUnpreparedSpells || isNPC || spell.data.prepared.value || (lvl === 0);
    if ( !showSpell ) return;

    // Extend the Spellbook level
    spellbook[lvl] = spellbook[lvl] || {
      isCantrip: lvl === 0,
      label: CONFIG.spellLevels[lvl],
      spells: [],
      uses: actorData.data.spells["spell"+lvl].value || 0,
      slots: actorData.data.spells["spell"+lvl].max || 0
    };

    // Add the spell to the spellbook at the appropriate level
    spell.data.school.str = CONFIG.spellSchools[spell.data.school.value];
    spellbook[lvl].spells.push(spell);
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
      4: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>'
    };
    return icons[level];
  }

    /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of skill proficiency
   * @private
   */
  _getActionImg(action) {
    const img = {
      0: "icons/svg/mystery-man.svg",
      1: "systems/pf2e/icons/actions/OneAction.png",
      2: "systems/pf2e/icons/actions/TwoActions.png",
      3: "systems/pf2e/icons/actions/ThreeActions.png",
      "free": "systems/pf2e/icons/actions/FreeAction.png",
      "reaction": "systems/pf2e/icons/actions/Reaction.png",
      "passive": "icons/svg/mystery-man.svg",
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
      let text = e.tagName === "INPUT" ? e.value : e.innerText,
        w = text.length * parseInt(e.getAttribute("data-wpad")) / 2;
      e.setAttribute("style", "flex: 0 0 " + w + "px");
    });

    // Activate tabs
    html.find('.tabs').each((_, el) => {
      let tabs = $(el),
        group = el.getAttribute("data-group"),
        initial = this.actor.data.flags[`_sheetTab-${group}`];
      new Tabs(tabs, {
        initial: initial,
        callback: clicked => this.actor.data.flags[`_sheetTab-${group}`] = clicked.attr("data-tab")
      });
    });

    // Item summaries
    html.find('.item .item-name h4').click(event => {
      this._onItemSummary(event)
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    /* -------------------------------------------- */
    /*  Attributes, Skills, Saves and Traits
     /* -------------------------------------------- */

    // Roll Save Checks
    html.find('.save-name').click(ev => {
      ev.preventDefault();
      let save = ev.currentTarget.parentElement.getAttribute("data-save");
      this.actor.rollSave(ev, save);
    });

    // Roll Attribute Checks
    html.find('.attribute-name').click(ev => {
      ev.preventDefault();
      let attribute = ev.currentTarget.parentElement.getAttribute("data-attribute");
      this.actor.rollAttribute(ev, attribute);
    });  

    // Roll Skill Checks
    html.find('.skill-name').click(ev => {
      let skl = ev.currentTarget.parentElement.getAttribute("data-skill");
      this.actor.rollSkill(ev, skl);
    });

    // Toggle Skill Proficiency
    html.find('.proficiency-click').click(ev => this._onCycleSkillProficiency(ev));

    // Trait Selector
    html.find('.trait-selector').click(ev => this._onTraitSelector(ev));

    /* -------------------------------------------- */
    /*  Inventory
    /* -------------------------------------------- */

    // Create New Item
    html.find('.item-create').click(ev => this._onItemCreate(ev));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      let itemId = Number($(ev.currentTarget).parents(".item").attr("data-item-id"));
      let Item = CONFIG.Item.entityClass;
      const item = new Item(this.actor.items.find(i => i.id === itemId), {actor: this.actor});
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      let li = $(ev.currentTarget).parents(".item"),
        itemId = Number(li.attr("data-item-id"));
      this.actor.deleteOwnedItem(itemId);
      li.slideUp(200, () => this.render(false));
    });

    // Toggle Spell prepared value
    html.find('.item-prepare').click(ev => {
      let itemId = Number($(ev.currentTarget).parents(".item").attr("data-item-id")),
          item = this.actor.items.find(i => { return i.id === itemId });
      item.data['prepared'].value = !item.data['prepared'].value;
      this.actor.updateOwnedItem(item);
    });

    // Item Dragging
    let handler = ev => this._onDragItemStart(ev);
    html.find('.item').each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });

    // Item Rolling
    html.find('.item .item-image').click(event => this._onItemRoll(event));

    // Melee Rolling
    html.find('button').click(ev => {
      ev.preventDefault();
      ev.stopPropagation();

      let itemId = Number($(ev.currentTarget).parents(".item").attr("data-item-id")),
          //item = this.actor.items.find(i => { return i.id === itemId });
          item = this.actor.getOwnedItem(itemId);

      // which function gets called depends on the type of button stored in the dataset attribute action
      switch (ev.target.dataset.action) {
          case 'weaponAttack': item.rollWeaponAttack(ev); break;
          case 'weaponDamage': item.rollWeaponDamage(ev); break;
          case 'spellAttack': item.rollSpellAttack(ev); break;
          case 'spellDamage': item.rollSpellDamage(ev); break;
          case 'featAttack': item.rollFeatAttack(ev); break;
          case 'featDamage': item.rollFeatDamage(ev); break;
          case 'consume': item.rollConsumable(ev); break;
          case 'toolCheck': item.rollToolCheck(ev); break;
      }            
    });

    // Lore Item Rolling
    html.find('.item .lore-name').click(event => {
    event.preventDefault();
    let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id")),
        item = this.actor.getOwnedItem(itemId);
    this.actor.rollLoreSkill(event, item);
    });      

    // Re-render the sheet when toggling visibility of spells
    html.find('.prepared-toggle').click(ev => {
      this.options.showUnpreparedSpells = !this.options.showUnpreparedSpells;
      this.render()
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle cycling proficiency in a Skill
   * @private
   */
  _onCycleSkillProficiency(event) {
    event.preventDefault();
    let field = $(event.currentTarget).siblings('input[type="hidden"]');
    let level = parseFloat(field.val());
    const levels = [0, 1, 2, 3, 4];
    let idx = levels.indexOf(level),
        newLevel = levels[(idx === levels.length - 1) ? 0 : idx + 1];

    // Update the field value and save the form
    field.val(newLevel);
    this._onSubmit(event);
  }

  /* -------------------------------------------- */

  _onDragItemStart(event) {
    let itemId = Number(event.currentTarget.getAttribute("data-item-id"));
	  event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      actorId: this.actor._id,
      id: itemId
    }));
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onItemRoll(event) {
    event.preventDefault();
    let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id")),
        item = this.actor.getOwnedItem(itemId);
    item.roll();
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item"),
        item = this.actor.getOwnedItem(Number(li.attr("data-item-id"))),
        chatData = item.getChatData({secrets: this.actor.owner});

    // Toggle summary
    if ( li.hasClass("expanded") ) {
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      let props = $(`<div class="item-properties"></div>`);
      if (chatData.properties) chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);

      let buttons = $(`<div class="item-buttons"></div>`);
      switch (item.data.type) {
          case 'action':
              if (chatData.weapon.value) {    
                if (chatData.weapon.value) {
                  buttons.append(`<span class="tag"><button data-action="weaponAttack">Attack</button></span>`);
                  buttons.append(`<span class="tag"><button data-action="weaponDamage">Damage</button></span>`);                  
                } 
              }
              break;
          case 'weapon':
              buttons.append(`<span class="tag"><button data-action="weaponAttack">Attack</button></span>`);
              buttons.append(`<span class="tag"><button data-action="weaponDamage">Damage</button></span>`);              
              break;
          case 'spell':
              if (chatData.isSave) buttons.append(`<span class="tag">Save DC ${chatData.save.dc} (${chatData.save.str})</span>`);
              if (chatData.isAttack) buttons.append(`<span class="tag"><button data-action="spellAttack">Attack</button></span>`);
              if (item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="spellDamage">${chatData.damageLabel}</button></span>`);
              break;
          case 'consumable':
              if (chatData.hasCharges) buttons.append(`<span class="tag"><button data-action="consume">Use ${item.name}</button></span>`);
              break;
          case 'tool':
              buttons.append(`<span class="tag"><button data-action="toolCheck" data-ability="${chatData.ability.value}">Use ${item.name}</button></span>`);
              break;
      }

      div.append(buttons);

      buttons.find('button').click(ev => {
          ev.preventDefault();
          ev.stopPropagation();

          // which function gets called depends on the type of button stored in the dataset attribute action
          switch (ev.target.dataset.action) {
              case 'weaponAttack': item.rollWeaponAttack(ev); break;
              case 'weaponDamage': item.rollWeaponDamage(ev); break;
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
    li.toggleClass("expanded");
  

  
  }


  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    let header = event.currentTarget,
        data = duplicate(header.dataset);
    
    if (data.type === "feat") {
      data["name"] = `New ${data.featType.capitalize()} ${data.type.capitalize()}`;    
      mergeObject(data, {"data.featType.value": data.featType});
    } else if (data.type === "action") {
      data["name"] = `New ${data.actionType.capitalize()}`;    
      mergeObject(data, {"data.actionType.value": data.actionType});
    } else if (data.type === "melee") {
      data["name"] = `New ${data.actionType.capitalize()}`;    
      mergeObject(data, {"data.weaponType.value": data.actionType});
    }
    else {
      data["name"] = `New ${data.type.capitalize()}`;    
    }
    this.actor.createOwnedItem(data, {renderSheet: true});
  }

  /* -------------------------------------------- */

  _onTraitSelector(event) {
    event.preventDefault();
    let a = $(event.currentTarget);
    const options = {
      name: a.parents("label").attr("for"),
      title: a.parent().text().trim(),
      choices: CONFIG[a.attr("data-options")]
    };
    new TraitSelector5e(this.actor, options).render(true)
  }
}

Actors.unregisterSheet("core", ActorSheet);


