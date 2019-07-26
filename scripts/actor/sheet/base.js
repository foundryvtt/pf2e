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
    console.log("sheetData: ", sheetData);

    // Save proficiency
    sheetData.data.attributes.fortitude.icon = this._getProficiencyIcon(sheetData.data.attributes.fortitude.rank);
    sheetData.data.attributes.reflex.icon = this._getProficiencyIcon(sheetData.data.attributes.reflex.rank);
    sheetData.data.attributes.will.icon = this._getProficiencyIcon(sheetData.data.attributes.will.rank);
    sheetData.data.attributes.fortitude.hover = CONFIG.proficiencyLevels[sheetData.data.attributes.fortitude.rank];
    sheetData.data.attributes.reflex.hover = CONFIG.proficiencyLevels[sheetData.data.attributes.reflex.rank];
    sheetData.data.attributes.will.hover = CONFIG.proficiencyLevels[sheetData.data.attributes.will.rank];

    // Update skill labels
/*     for ( let skl of Object.values(sheetData.data.skills)) {
      skl.ability = sheetData.data.abilities[skl.ability].label.substring(0, 3);
      skl.icon = this._getProficiencyIcon(skl.value);
      skl.hover = CONFIG.proficiencyLevels[skl.value];
    } */

    // Update traits
/*     sheetData["actorSizes"] = CONFIG.actorSizes;
    this._prepareTraits(sheetData.data["traits"]); */

    // Prepare owned items
/*     this._prepareItems(sheetData.actor); */

    // Return data to the sheet
    return sheetData;
  }

  /* -------------------------------------------- */

/*   _prepareTraits(traits) {
    const map = {
      "dr": CONFIG.damageTypes,
      "di": CONFIG.damageTypes,
      "dv": CONFIG.damageTypes,
      "ci": CONFIG.conditionTypes,
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
  } */

  /* -------------------------------------------- */

  /**
   * Insert a spell into the spellbook object when rendering the character sheet
   * @param {Object} actorData    The Actor data being prepared
   * @param {Object} spellbook    The spellbook data being prepared
   * @param {Object} spell        The spell data being prepared
   * @private
   */
/*   _prepareSpell(actorData, spellbook, spell) {
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
  } */

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of skill proficiency
   * @private
   */
  _getProficiencyIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
      1: '<i class="far fa-check-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
      2: '<i class="far fa-check-circle"></i><i class="far fa-check-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
      3: '<i class="far fa-check-circle"></i><i class="far fa-check-circle"></i><i class="far fa-check-circle"></i><i class="far fa-circle"></i>',
      4: '<i class="far fa-check-circle"></i><i class="far fa-check-circle"></i><i class="far fa-check-circle"></i><i class="far fa-check-circle"></i>'
    };
    return icons[level];
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
    /* html.find('.item .item-name h4').click(event => this._onItemSummary(event)); */

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    /* -------------------------------------------- */
    /*  Abilities, Skills, and Traits
     /* -------------------------------------------- */

/*     // Ability Proficiency
    html.find('.ability-proficiency').click(ev => {
      let field = $(ev.currentTarget).siblings('input[type="hidden"]');
      this.actor.update({[field[0].name]: 1 - parseInt(field[0].value)});
    });

    // Ability Checks
    html.find('.ability-name').click(event => {
      event.preventDefault();
      let ability = event.currentTarget.parentElement.getAttribute("data-ability");
      this.actor.rollAbility(ability, {event: event});
    }); */

    // Toggle Skill Proficiency
    html.find('.proficiency-rank').click(ev => this._onCycleSkillProficiency(ev));

/*     // Roll Skill Checks
    html.find('.skill-name').click(ev => {
      let skl = ev.currentTarget.parentElement.getAttribute("data-skill");
      this.actor.rollSkill(ev, skl);
    });

    // Trait Selector
    html.find('.trait-selector').click(ev => this._onTraitSelector(ev)); */

    /* -------------------------------------------- */
    /*  Inventory
    /* -------------------------------------------- */
/* 
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

    // Re-render the sheet when toggling visibility of spells
    html.find('.prepared-toggle').click(ev => {
      this.options.showUnpreparedSpells = !this.options.showUnpreparedSpells;
      this.render()
    }); */
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

/*   _onDragItemStart(event) {
    let itemId = Number(event.currentTarget.getAttribute("data-item-id"));
	  event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      actorId: this.actor._id,
      id: itemId
    }));
  } */

  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
/*   _onItemRoll(event) {
    event.preventDefault();
    let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id")),
        item = this.actor.getOwnedItem(itemId);
    item.roll();
  } */

  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
/*   _onItemSummary(event) {
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
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  } */


  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @private
   */
/*   _onItemCreate(event) {
    event.preventDefault();
    let header = event.currentTarget,
        data = duplicate(header.dataset);
    data["name"] = `New ${data.type.capitalize()}`;
    this.actor.createOwnedItem(data, {renderSheet: true});
  } */

  /* -------------------------------------------- */

/*   _onTraitSelector(event) {
    event.preventDefault();
    let a = $(event.currentTarget);
    const options = {
      name: a.parents("label").attr("for"),
      title: a.parent().text().trim(),
      choices: CONFIG[a.attr("data-options")]
    };
    new TraitSelector5e(this.actor, options).render(true)
  } */
}

Actors.unregisterSheet("core", ActorSheet);



/* -------------------------------------------- */


/**
 * A helper Dialog subclass for rolling Hit Dice on short rest
 * @type {Dialog}
 */
/* class ShortRestDialog extends Dialog {
  constructor(actor, dialogData, options) {
    super(dialogData, options);
    this.actor = actor;
  }

  activateListeners(html) {
    super.activateListeners(html);
    let btn = html.find("#roll-hd");
    if ( this.actor.data.data.attributes.hd.value === 0 ) btn[0].disabled = true;
    btn.click(ev => {
      event.preventDefault();
      let fml = ev.target.form.hd.value;
      this.actor.rollHitDie(fml).then(roll => {
        if ( this.actor.data.data.attributes.hd.value === 0 ) btn[0].disabled = true;
      });
    })
  }
} */

