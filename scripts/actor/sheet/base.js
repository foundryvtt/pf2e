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
/*     let showSpell = this.options.showUnpreparedSpells || isNPC || spell.data.prepared.value || (lvl === 0);
    if ( !showSpell ) return; */

    // Extend the Spellbook level
    spellbook[lvl] = spellbook[lvl] || {
      isCantrip: lvl === 0,
      isFocus: lvl === 11,
      label: CONFIG.spellLevels[lvl],
      spells: [],
      prepared: [],
      uses: parseInt(actorData.data.spells["spell"+lvl].value) || 0,
      slots: parseInt(actorData.data.spells["spell"+lvl].max) || 0
    };

    // Add the spell to the spellbook at the appropriate level
    spell.data.school.str = CONFIG.spellSchools[spell.data.school.value];
    spellbook[lvl].spells.push(spell);
  }


    /* -------------------------------------------- */

  /**
   * Insert prepared spells into the spellbook object when rendering the character sheet
   * @param {Object} actorData    The Actor data being prepared
   * @param {Object} spellbook    The spellbook data being prepared
   * @private
   */
  _preparedSpellSlots(actorData, spellbook) {
    //let isNPC = this.actorType === "npc";

    for (let [key, spl] of Object.entries(spellbook)) {
      if (spl.slots > 0) {
      
        for(var i = 0; i < spl.slots; i++){
          let actorSlot = actorData.data.spells["spell"+key].prepared[i];
          if (actorSlot) {
            actorSlot["prepared"] = true;
            actorSlot.data.school.str = CONFIG.spellSchools[actorSlot.data.school.value];
            spl.prepared[i] = actorSlot;
          } else {
            // if there is no prepared spell for this slot then make it empty.
            // also need to make the html check for an empty slot and hide/show appropriate columns 
            spl.prepared[i] = {
              name: "Empty Slot (drag spell here)",
              id: null,
              prepared: false          
            }
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
   * Get the action image to use for a particular action type.
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
      "passive": "systems/pf2e/icons/actions/Passive.png",
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

    // NPC Attack summaries
    html.find('.item .melee-name h4').click(event => {
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

    // Roll Ability Checks
    html.find('.ability-name').click(ev => {
      ev.preventDefault();
      let ability = ev.currentTarget.parentElement.getAttribute("data-ability");
      this.actor.rollAbility(ev, ability);
    });

    // Roll Skill Checks
    html.find('.skill-name.rollable').click(ev => {
      let skl = ev.currentTarget.parentElement.getAttribute("data-skill");
      this.actor.rollSkill(ev, skl);
    });

    // Toggle Skill Proficiency
    //html.find('.proficiency-click').click(ev => this._onCycleSkillProficiency(ev));
    html.find('.proficiency-click').on("click contextmenu", this._onCycleSkillProficiency.bind(this));

    // Prepare Spell Slot
    html.find('.prepare-click').click(ev => {
      let itemId = 10,
          slotId = Number($(ev.currentTarget).parents(".item").attr("data-item-id")),
          spellLvl = Number($(ev.currentTarget).parents(".item").attr("data-spell-lvl")),
          spell = this.actor.items.find(i => { return i.id === itemId });

          this.actor.allocatePreparedSpellSlot(spellLvl, slotId, spell);
    });
    
    // Remove Spell Slot
    html.find('.item-unprepare').click(ev => {
      let slotId = Number($(ev.currentTarget).parents(".item").attr("data-slot-id")),
          spellLvl = Number($(ev.currentTarget).parents(".item").attr("data-spell-lvl"));
      this.actor.removePreparedSpellSlot(spellLvl, slotId);
    });

    // Trait Selector
    html.find('.trait-selector').click(ev => this._onTraitSelector(ev));

    // Spell Browser
    html.find('.spell-create').click(ev => spellBrowser.render(true));
    

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

    // NPC Weapon Rolling
    html.find('button').click(ev => {
      ev.preventDefault();
      ev.stopPropagation();

      let itemId = Number($(ev.currentTarget).parents(".item").attr("data-item-id")),
          //item = this.actor.items.find(i => { return i.id === itemId });
          item = this.actor.getOwnedItem(itemId);

      // which function gets called depends on the type of button stored in the dataset attribute action
      switch (ev.target.dataset.action) {
          case 'weaponAttack': item.rollWeaponAttack(ev); break;
          case 'weaponAttack2': item.rollWeaponAttack(ev, 2); break;
          case 'weaponAttack3': item.rollWeaponAttack(ev, 3); break;
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
    html.find('.item .lore-score-rollable').click(event => {
    event.preventDefault();
    let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id")),
        item = this.actor.getOwnedItem(itemId);
    this.actor.rollLoreSkill(event, item);
    });      

    // Lore Item Bonus Input
    html.find('.lore-item-input').focusout(async event => {
      //let itemId = Number(event.target.attributes["data-item-id"].value);
      let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id"));
      const itemToEdit = this.actor.items.find(i => i.id === itemId);
      itemToEdit.data.item.value = Number(event.target.value);

      // Need to update all skills every time because if the user tabbed through and updated many, only the last one would be saved
      let skills = this.actor.items.filter(i => i.type == "lore")
      for(let skill of skills)
      {
        await this.actor.updateOwnedItem(skill, true);      
      }
    });

    html.find('.item-name').focusout(async event => {
      let itemId = Number(event.target.attributes["data-item-id"].value);
      const itemToEdit = this.actor.items.find(i => i.id === itemId);
      itemToEdit.name = event.target.value;

      // Need to update all skills every time because if the user tabbed through and updated many, only the last one would be saved
      let skills = this.actor.items.filter(i => i.type == "lore")
      for(let skill of skills)
      {
        await this.actor.updateOwnedItem(skill, true);      
      }
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

    // Get the skill type (used to determine if this is a Lore skill)
    let skillType = $(event.currentTarget).parents(".item").attr("data-skill-type");

    // Get the current level and the array of levels
    let level = parseFloat(field.val());
    const levels = [0, 1, 2, 3, 4];
    let idx = levels.indexOf(level)
    let newLevel = "";

    // Toggle next level - forward on click, backwards on right
    if ( event.type === "click" ) {
      newLevel = levels[(idx === levels.length - 1) ? 0 : idx + 1];
    } else if ( event.type === "contextmenu" ) {
      newLevel = levels[(idx === 0) ? levels.length - 1 : idx - 1];
    }

    // Update the field value and save the form
    if (skillType === "lore") {
      let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id"));
      const itemToEdit = this.actor.items.find(i => i.id === itemId);
      itemToEdit.data.proficient.value = newLevel;
      this.actor.updateOwnedItem(itemToEdit, true);
    } else {
      field.val(newLevel);
      this._onSubmit(event);
    }
  }



  /* -------------------------------------------- */

/*   _onDragItemStart(event) {
    let itemId = Number(event.currentTarget.getAttribute("data-item-id"));
	  event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      actorId: this.actor._id,
      id: itemId
    }));
  } */
  _onDragItemStart(event) {
    const itemId = Number(event.currentTarget.getAttribute("data-item-id"));
    const item = this.actor.getOwnedItem(itemId);
	  event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      data: item.data,
      actorId: this.actor._id,
      id: itemId
    }));
  }

  /* -------------------------------------------- */

  /**
   * Extend the base _onDrop method to handle dragging spells onto spell slots.
   * @private
   */
  async _onDrop(event) {
    
    // get the item type of the drop target
    let dropType = $(event.target).parents(".item").attr("data-item-type");

    // if the drop target is of type spellSlot then check if the item dragged onto it is a spell.
    if (dropType === "spellSlot") {
      let dragData = event.dataTransfer.getData("text/plain"),
          dragItem = this.actor.getOwnedItem(JSON.parse(dragData).id);
          
      if (dragItem.data.type === "spell") {
        let dropID = Number($(event.target).parents(".item").attr("data-item-id")),
            spellLvl = Number($(event.target).parents(".item").attr("data-spell-lvl"));

        this.actor.allocatePreparedSpellSlot(spellLvl, dropID, dragItem.data);
      }
    }

    super._onDrop(event)
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
      if (chatData.critSpecialization) props.append(`<span class="tag" title="${chatData.critSpecialization.description}" style="background: rgb(69,74,124); color: white;">${chatData.critSpecialization.label}</span>`);
      if (chatData.traits) chatData.traits.forEach(p => props.append(`<span class="tag" title="${p.description}" style="background: #b75b5b; color: white;">${p.label}</span>`));

      if (chatData.area) props.append(`<span class="tag area-tool rollable" style="background: rgb(69,74,124); color: white;" data-area-areaType="${chatData.area.areaType}" data-area-size="${chatData.area.size}">${chatData.area.label}</span>`);

      div.append(props);

/*       props.find('.area-tool').click(ev => {
        ev.preventDefault();
        ev.stopPropagation();

        this._onAreaEffect(ev);
      }) */

      let buttons = $(`<div class="item-buttons"></div>`);
      switch (item.data.type) {
          case 'action':
              if (chatData.weapon.value) {    
                if (chatData.weapon.value) {
                  buttons.append(`<span class="tag"><button data-action="weaponAttack">Strike</button></span>`);
                  buttons.append(`<span class="tag"><button data-action="weaponAttack2">2</button></span>`);
                  buttons.append(`<span class="tag"><button data-action="weaponAttack3">3</button></span>`);
                  buttons.append(`<span class="tag"><button data-action="weaponDamage">Damage</button></span>`);                  
                } 
              }
              break;
          case 'weapon':
              let isAgile = (item.data.data.traits.value || []).includes("agile");
              buttons.append(`<span class="tag"><button data-action="weaponAttack">Attack</button></span>`);
              buttons.append(`<span class="tag"><button data-action="weaponAttack2">${isAgile?'-4':'-5'}</button></span>`);
              buttons.append(`<span class="tag"><button data-action="weaponAttack3">${isAgile?'-8':'-10'}</button></span>`);
              buttons.append(`<span class="tag"><button data-action="weaponDamage">Damage</button></span>`);              
              break;
          case 'spell':
              if (chatData.isSave) buttons.append(`<span class="tag">Save DC ${chatData.save.dc} (${chatData.save.str})</span>`);
              if (chatData.isAttack) buttons.append(`<span class="tag"><button data-action="spellAttack">Attack</button></span>`);
              if (item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="spellDamage">${chatData.damageLabel}: ${item.data.data.damage.value}</button></span>`);
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
              case 'weaponAttack2': item.rollWeaponAttack(ev, 2); break;
              case 'weaponAttack3': item.rollWeaponAttack(ev, 3); break;
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
    } else if (data.type === "spell") {
      data["name"] = `New  Level ${data.level} ${data.type.capitalize()}`;    
      mergeObject(data, {"data.level.value": data.level});
    } else if (data.type === "lore") {
      if (this.actorType === "npc") {
        data["name"] = `New Skill`;
        data["img"] = "/icons/svg/d20-black.svg";
      }
      else data["name"] = `New ${data.type.capitalize()}`; 
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

  _onAreaEffect(event) {

    let areaType = $(event.currentTarget).attr("data-area-areaType");
    let areaSize = Number($(event.currentTarget).attr("data-area-size"));
    
    let tool = "cone";
    if (areaType === "burst") tool = "circle";
    else if (areaType === "emanation") tool = "rect";
    else if (areaType === "line") tool = "ray";
    
    // Delete any existing templates for this actor.
    let templateData = this.actor.getFlag("pf2e", "areaEffectId") || null;
    let templateScene = null;
    if (templateData) {
      templateScene = this.actor.getFlag("pf2e", "areaEffectScene") || null;
      this.actor.setFlag("pf2e", "areaEffectId", null);
      this.actor.setFlag("pf2e", "areaEffectScene", null);  

      console.log(`PF2e | Existing MeasuredTemplate ${templateData.id} from Scene ${templateScene} found`);
      if (canvas.templates.objects.children) {
        for (let placeable of canvas.templates.objects.children) {
          console.log(`PF2e | Placeable Found - id: ${placeable.data.id}, scene: ${canvas.scene._id}, type: ${placeable.__proto__.constructor.name}`)
          if (placeable.data.id === templateData.id & canvas.scene._id === templateScene & placeable.__proto__.constructor.name === "MeasuredTemplate") {
            console.log(`PF2e | Deleting MeasuredTemplate ${templateData.id} from Scene ${templateScene}`);
      
            let existingTemplate = new MeasuredTemplate(templateData, templateScene);
            existingTemplate.delete(templateScene);
          }
        }
      }

    }

    // data to pull in dynamically
    let x,
        y;

    let data = {};
    let gridWidth = canvas.grid.grid.w;
    
    if (areaType === "emanation" || areaType === "cone") {
      if (canvas.tokens.controlled.length > 1) {
        ui.notifications.info(`Please select a single target token`);
      } else if (canvas.tokens.controlled.length === 0) {
        ui.notifications.info(`Please select a target token`);
      } else {
        let t = canvas.tokens.controlled[0];
        let rotation = t.data.rotation,
            width = t.data.width;
          
        x = t.data.x;
        y = t.data.y;
        
        // Cone placement logic
        if (tool === "cone") {
          if (rotation < 0) rotation = 360 + rotation;
          if (rotation < 35) {
            x = x + (gridWidth / 2);
            y = y + (gridWidth);
          } else if (rotation < 55) {
            y = y + (gridWidth);
          } else if (rotation < 125) {
            y = y + (gridWidth / 2);
          }else if (rotation < 145) {
            y = y;
          } else if (rotation < 215) {
            x = x + (gridWidth / 2);
          } else if (rotation < 235) {
            x = x + (gridWidth);
          } else if (rotation < 305) {
            x = x + (gridWidth);
            y = y + (gridWidth / 2);
          }else if (rotation < 325) {
            x = x + (gridWidth);
            y = y + (gridWidth);
          } else {
            x = x + (gridWidth / 2);
            y = y + (gridWidth);
          }
          rotation = rotation + 90;
          
          data = {t: tool, x: x, y: y, distance: areaSize, direction: rotation, fillColor: game.user.data.color || "#FF0000"};
        } else if (tool === "rect") {
          x = x - (gridWidth * (areaSize / 5));
          y = y - (gridWidth * (areaSize / 5));        
          rotation = 45;

          let rectSide = areaSize + (width * 5) + areaSize;
          let distance = Math.sqrt(Math.pow(rectSide, 2) + Math.pow(rectSide, 2));
          data = {t: tool, x: x, y: y, distance: distance, direction: rotation, fillColor: game.user.data.color || "#FF0000"};
        }

        // Create the template
        MeasuredTemplate.create(canvas.scene._id, data).then(results => {
          templateData = results.data;

          // Save MeasuredTemplate information to actor flags
          this.actor.setFlag("pf2e", "areaEffectId", templateData);
          this.actor.setFlag("pf2e", "areaEffectScene", canvas.scene._id);                
        });

      }
    }
  }
}

Actors.unregisterSheet("core", ActorSheet);

