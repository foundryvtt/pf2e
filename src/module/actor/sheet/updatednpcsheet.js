/**
 * @author Farhan Siddiqi
 * @version 0.0.1
 */

// import { monsterAbilities } from './monsterAbilities.js';
import ActorSheetPF2eNPC from './npc.js';

class UpdatedNPCActorPF2ESheet extends ActorSheetPF2eNPC {
  get template() {
    const path = 'systems/pf2e/templates/actors/';

    if (this.actor.getFlag('pf2e', 'editNPC.value')) return `${path}npc-sheet.html`;
    return `${path}npc-sheet-no-edit.html`;
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      classes: options.classes.concat(['pf2e', 'actor', 'npc-sheet', 'updatedNPCSheet']),
      width: 650,
      height: 680,
      showUnpreparedSpells: true,
    });
    return options;
  }

  /* -------------------------------------------- */

  /**
 * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
 */
  getData() {
    const sheetData = super.getData();
    sheetData.flags = sheetData.actor.flags;
    if (sheetData.flags.pf2e_updatednpcsheet === undefined) sheetData.flags.pf2e_updatednpcsheet = {};
    if (sheetData.flags.pf2e_updatednpcsheet.editNPC === undefined) sheetData.flags.pf2e_updatednpcsheet.editNPC = { value: false };
    if (sheetData.flags.pf2e_updatednpcsheet.allSaveDetail === undefined) sheetData.flags.pf2e_updatednpcsheet.allSaveDetail = { value: '' };

    // Elite or Weak adjustment
    sheetData.npcEliteActive = this.npcIsElite()?' active':'';
    sheetData.npcWeakActive = this.npcIsWeak()?' active':'';
    sheetData.npcEliteHidden = this.npcIsWeak()?' hidden':'';
    sheetData.npcWeakHidden = this.npcIsElite()?' hidden':'';
    
    // rarity
    sheetData.actorRarities = CONFIG.PF2E.rarityTraits;
    sheetData.actorRarity = sheetData.actorRarities[sheetData.data.traits.rarity.value];
    sheetData.isNotCommon = sheetData.data.traits.rarity.value !== 'common';
    // size
    sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];
    sheetData.actorTraits = (sheetData.data.traits.traits || {}).value;
    sheetData.actorAlignment = sheetData.data.details.alignment.value;
    // languages
    sheetData.hasLanguages = false;
    if (sheetData.data.traits.languages.value && Array.isArray(sheetData.data.traits.languages.value) && sheetData.actor.data.traits.languages.value.length > 0) {
      sheetData.hasLanguages = true;
    }

    // Skills
    sheetData.hasSkills = sheetData.actor.lores.length > 0;

    // AC Details
    sheetData.hasACDetails = sheetData.data.attributes.ac.details && sheetData.data.attributes.ac.details !== '';
    // HP Details
    sheetData.hasHPDetails = sheetData.data.attributes.hp.details && sheetData.data.attributes.hp.details !== '';

    // ********** This section needs work *************
    // Fort Details
    sheetData.hasFortDetails = sheetData.data.saves.fortitude.saveDetail && sheetData.data.saves.fortitude.saveDetail !== '';
    // Reflex Details
    sheetData.hasRefDetails = sheetData.data.saves.reflex.saveDetail && sheetData.data.saves.reflex.saveDetail !== '';
    // Will Details
    sheetData.hasWillDetails = sheetData.data.saves.will.saveDetail && sheetData.data.saves.will.saveDetail !== '';
    // All Save Details
    sheetData.hasAllSaveDetails = (sheetData.data.attributes.allSaves || {}).value && (sheetData.data.attributes.allSaves || {}).value !== '';

    // Immunities check
    sheetData.hasImmunities = sheetData.data.traits.di.value.length ? sheetData.data.traits.di.value : false;
    // Resistances check
    sheetData.hasResistances = sheetData.data.traits.dr.length ? Array.isArray(sheetData.data.traits.dr) : false;
    // Weaknesses check
    sheetData.hasWeaknesses = sheetData.data.traits.dv.length ? Array.isArray(sheetData.data.traits.dv) : false;

    // Speed Details check
    if (sheetData.data.attributes.speed && sheetData.data.attributes.speed.otherSpeeds) sheetData.hasSpeedDetails = sheetData.data.attributes.speed.otherSpeeds.length ? sheetData.data.attributes.speed.otherSpeeds : false;

    // Spellbook
    sheetData.hasSpells = sheetData.actor.spellcastingEntries.length ? sheetData.actor.spellcastingEntries : false;
    // sheetData.spellAttackBonus = sheetData.data.attributes.spelldc.value;

    const equipment = [];
    const reorgActions = {
      interaction: {
        label: 'Interaction Actions',
        actions: {
          action: { label: 'Actions', actions: [] },
          reaction: { label: 'Reactions', actions: [] },
          free: { label: 'Free Actions', actions: [] },
          passive: { label: 'Passive Actions', actions: [] },
        },
      },
      defensive: {
        label: 'Defensive Actions',
        actions: {
          action: { label: 'Actions', actions: [] },
          reaction: { label: 'Reactions', actions: [] },
          free: { label: 'Free Actions', actions: [] },
          passive: { label: 'Passive Actions', actions: [] },
        },
      },
      offensive: {
        label: 'Offensive Actions',
        actions: {
          action: { label: 'Actions', actions: [] },
          reaction: { label: 'Reactions', actions: [] },
          free: { label: 'Free Actions', actions: [] },
          passive: { label: 'Passive Actions', actions: [] },
        },
      },
    };
    sheetData.hasInteractionActions = false;
    sheetData.hasDefensiveActions = false;
    sheetData.hasOffensiveActions = false;
    sheetData.hasEquipment = false;
    for (const i of sheetData.actor.items) {
      // Equipment
      if (i.type === 'weapon' || i.type === 'armor' || i.type === 'equipment' || i.type === 'consumable' || i.type === 'treasure') {
        equipment.push(i);
        sheetData.hasEquipment = true;
      }
      // Actions
      else if (i.type === 'action') {
        const actionType = i.data.actionType.value || 'action';
        if (i.flags && i.flags.pf2e_updatednpcsheet && i.flags.pf2e_updatednpcsheet.npcActionType && i.flags.pf2e_updatednpcsheet.npcActionType.value) {
          switch (i.flags.pf2e_updatednpcsheet.npcActionType.value) {
            case 'interaction':
              reorgActions.interaction.actions[actionType].actions.push(i);
              sheetData.hasInteractionActions = true;
              break;
            case 'defensive':
              reorgActions.defensive.actions[actionType].actions.push(i);
              sheetData.hasDefensiveActions = true;
              break;
              // Should be offensive but throw anything else in there too
            default:
              reorgActions.offensive.actions[actionType].actions.push(i);
              sheetData.hasOffensiveActions = true;
          }
        } else {
          reorgActions.offensive.actions[actionType].actions.push(i);
          sheetData.hasOffensiveActions = true;
        }
      }
      // Give Melee/Ranged an img
      else if (i.type === 'melee' || i.type === 'ranged') {
        const actionImg = 1;
        i.img = this._getActionImg(actionImg);
      }
    }
    sheetData.actor.reorgActions = reorgActions;
    sheetData.actor.equipment = equipment;

    // Return data for rendering
    return sheetData;
  }

  /**
   * Increases the NPC via the Elite/Weak adjustment rules
   */
  npcAdjustment(increase) {
    let actorData = duplicate(this.actor.data);
    const tokenData = (this.token !== null) ? duplicate(this.token.data) : duplicate(this.actor.data.token);
    let traits = getProperty(actorData.data, 'traits.traits.value') || [];
    let traitsAdjusted = false;
    let tokenScale = 1;
    let adjustBackToNormal = false;

    if (increase) {
      console.log(`PF2e System | Adjusting NPC to become more powerful`);

      // Adjusting trait
      for (const trait of traits) {
        if (trait === 'weak') { //removing weak
          const index = traits.indexOf(trait);
          if (index > -1) traits.splice(index, 1);
          traitsAdjusted = true;
        } else if (trait === 'elite') {
          traitsAdjusted = true; //prevents to add another elite trait
        }
      }
      if (!traitsAdjusted) {
        traits.push('elite');
        actorData.name = "Elite "+actorData.name;
        tokenData.name = "Elite "+tokenData.name;
        tokenScale = 1.2;
      } else {
        if (actorData.name.startsWith("Weak ")) actorData.name = actorData.name.slice(5);
        if (tokenData.name.startsWith("Weak ")) tokenData.name = tokenData.name.slice(5);
        adjustBackToNormal = true;
      }

    } else {
      console.log(`PF2e System | Adjusting NPC to become less powerful`);

      // Adjusting trait
      for (const trait of traits) {
        if (trait === 'elite') { //removing elite
          const index = traits.indexOf(trait);
          if (index > -1) traits.splice(index, 1);
          traitsAdjusted = true;
        } else if (trait === 'weak') {
          traitsAdjusted = true; //prevents to add another weak trait
        }
      }
      if (!traitsAdjusted) {
        traits.push('weak');
        actorData.name = "Weak "+actorData.name;
        tokenData.name = "Weak "+tokenData.name;
        tokenScale = 0.8;
      } else {
        if (actorData.name.startsWith("Elite ")) actorData.name = actorData.name.slice(6);
        if (tokenData.name.startsWith("Elite ")) tokenData.name = tokenData.name.slice(6);
        adjustBackToNormal = true;
      }

    }

    actorData.data.traits.traits.value = traits;
    actorData = this._applyAdjustmentToData(actorData, increase, adjustBackToNormal);

    if (this.token === null) { // Then we need to apply this to the token prototype
      this.actor.update({
        ['token.name']: tokenData.name,
        ['token.scale']: tokenScale
      });
    } else {
      this.token.update({
        ['name']: tokenData.name,
        ['scale']: tokenScale
      });
    }

    //modify actordata, including items
    this.actor.update(actorData);

/*  // For testing purposes to not modify the rest of the actor but its name & trait
    this.actor.update({
      ['name']: actorData.name,
      ['data.traits.traits.value']: traits
    }); */

  }

  /**
   * Elite/Weak adjustment
   *  Increase/decrease the creatures level.
   *  Increase/decrease the creature’s Hit Points based on its starting level (20+ 30HP, 5~19 20HP, 2~4 15HP, 1 or lower 10HP).
   *  Increase/decrease by 2:
   *   - AC
   *   - Perception
   *   - saving throws
   *   - attack modifiers
   *   - skill modifiers
   *   - DCs
   *  If the creature has limits on how many times or how often it can use an ability 
   *  (such as a spellcaster’s spells or a dragon’s Breath Weapon), in/decrease the damage by 4 instead.
   */
  _applyAdjustmentToData(actorData, increase, adjustBackToNormal) {
    const positive = increase ? 1 : -1;
    const mod = 2 * positive;

    const lvl = parseInt(actorData.data.details.level.value, 10);
    const originalLvl = adjustBackToNormal ? lvl+positive : lvl;
    const hp = parseInt(actorData.data.attributes.hp.max, 10);
    actorData.data.attributes.hp.max = hp + ( (originalLvl>=20)?30:( (originalLvl>=5)?20:( (originalLvl>=2)?15:10 ) ) ) * positive;
    actorData.data.attributes.hp.value = actorData.data.attributes.hp.max;
    actorData.data.details.level.value = lvl + positive;

    const ac = parseInt(actorData.data.attributes.ac.value, 10);
    actorData.data.attributes.ac.value = ac + mod;

    const perception = parseInt(actorData.data.attributes.perception.value, 10);
    actorData.data.attributes.perception.value = perception + mod;

    const fort = parseInt(actorData.data.saves.fortitude.value, 10);
    actorData.data.saves.fortitude.value = fort + mod;
    const refl = parseInt(actorData.data.saves.reflex.value, 10);
    actorData.data.saves.reflex.value = refl + mod;
    const will = parseInt(actorData.data.saves.will.value, 10);
    actorData.data.saves.will.value = will + mod;

    for (const item of actorData.items) {
      if (item.type == "melee") {
        // melee type is currently used for both melee and ranged attacks
        const attack = getProperty(item.data, 'bonus.value');
        if (attack !== undefined) {
          item.data.bonus.value = parseInt(attack, 10) + mod;
          item.data.bonus.total = item.data.bonus.value;
          const dmg = getProperty(item.data.damageRolls[0], 'damage');
          if (dmg !== undefined) {
            const lastTwoChars = dmg.slice(-2);
            if ( parseInt(lastTwoChars,10) == (mod*-1) ) {
              item.data.damageRolls[0].damage = dmg.slice(0, -2);
            } else {
              item.data.damageRolls[0].damage = dmg + (increase?'+':'') + mod;
            }
          }
        }

      } else if (item.type == "lore") {
        // lore type is currently used for all monster skills
        const skill = getProperty(item.data, 'mod.value');
        if (skill !== undefined) {
          item.data.mod.value = parseInt(skill, 10) + mod;
        }

      } else if (item.type == "spellcastingEntry") {
        const spellDc = getProperty(item.data, 'spelldc.dc');
        if (spellDc !== undefined) {
          item.data.spelldc.dc = parseInt(spellDc, 10) + mod;
          const spellAttack = getProperty(item.data, 'spelldc.value');
          item.data.spelldc.value = parseInt(spellAttack, 10) + mod;
        }

      } else if (item.type == "spell") {
        //TODO? Spell descriptions are currently not updated with the damage increase, only the damage.value field.
        const spellName = item.name.toLowerCase();
        const spellDamage = getProperty(item.data, 'damage.value'); //string
        const spellLevel = getProperty(item.data, 'level.value');
        let spellDmgAdjustmentMod = 1; // 1 = unlimited uses, 2 = limited uses
        
        //checking truthy is possible, as it's unlikely that spellDamage = 0 in a damage spell :)
        if ( spellDamage ) {
          if (spellLevel == 0 || spellName.includes('at will')) {
            spellDmgAdjustmentMod = 1;
          } else {
            spellDmgAdjustmentMod = 2;
          }
          const lastTwoChars = spellDamage.slice(-2);
          if ( parseInt(lastTwoChars,10) == ( mod*spellDmgAdjustmentMod*-1 ) ) {
            item.data.damage.value = spellDamage.slice(0, -2);
          } else {
            item.data.damage.value = spellDamage + (increase?'+':'') + ( mod*spellDmgAdjustmentMod );
          }
        }

      } else if (item.type == "action") {
        let actionDescr = getProperty(item.data, 'description.value');
        if (actionDescr !== undefined) {
          actionDescr = actionDescr.replace(/DC (\d+)+/g, function(match, number) {
            return 'DC ' + (parseInt(number) + mod);
          });
          //Assuming that all abilities with damage in the description are damage attacks that cant be done each turn and as increase twice as much.
          actionDescr = actionDescr.replace(/(\d+)?d(\d+)([\+\-]\d+)?(\s+[a-z]+[\s.,])?/g, function(match, a, b, c, d) {
            // match: '1d4+1 rounds.', a: 1, b: 4, c: '+1', d: ' rounds.'
            let bonus = parseInt(c, 10);
            if (d?.substring(1,7) !== 'rounds') {
              if (isNaN(bonus)) { //c is empty in this case so dont need to add
                c = (increase?'+':'') + (mod*2);
              } else {
                if ( bonus == (mod*2*-1) ) {
                  c = '' ;
                } else {
                  const newC = bonus + mod*2
                  c = newC === 0 ? '' : newC > 0 ? `+${newC}` : `${newC}`
                }
              }
            } else {
              if (c === undefined) {
                c = '';
              }
            }
            return (a ? a : '')+'d'+b+c+(d ? d : '');
          });
          item.data.description.value = actionDescr;
        }

      }
      
    }
    return actorData;
  }

  /**
   * Check if Elite
   */
  npcIsElite() {
    const actorData = duplicate(this.actor.data);
    let traits = getProperty(actorData.data, 'traits.traits.value') || [];
    for (const trait of traits) {
      if (trait == 'elite') return true;
    }
    return false;
  }
  /**
   * Check if Weak
   */
  npcIsWeak() {
    const actorData = duplicate(this.actor.data);
    let traits = getProperty(actorData.data, 'traits.traits.value') || [];
    for (const trait of traits) {
      if (trait == 'weak') return true;
    }
    return false;
  }

  /**
   * Roll NPC Damage using DamageRoll
   * Rely upon the DicePF2e.damageRoll logic for the core implementation
   */
  rollNPCDamageRoll(damageRoll, item) {
    // Get data
    const itemData = item.data.data;
    const rollData = duplicate(item.actor.data.data);
    const weaponDamage = damageRoll.die;
    // abl = itemData.ability.value || "str",
    // abl = "str",
    const parts = [weaponDamage];
    const dtype = CONFIG.PF2E.damageTypes[damageRoll.damageType];

    // Append damage type to title
    let title = `${item.name} - Damage`;
    if (dtype) title += ` (${dtype})`;

    // Call the roll helper utility
    rollData.item = itemData;
    DicePF2e.damageRoll({
      event,
      parts,
      actor: item.actor,
      data: rollData,
      title,
      speaker: ChatMessage.getSpeaker({ actor: item.actor }),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710,
      },
    });
  }

  /**
   * Toggle expansion of an attackEffect ability if it exists.
   *
   */
  expandAttackEffect(attackEffectName, event, triggerItem) {
    const actionList = $(event.currentTarget).parents('form').find('.item.action-item');
    let toggledAnything = false;
    const mAbilities = CONFIG.PF2E.monsterAbilities();
    console.log('PF2e System | mAbilities: ', mAbilities);
    actionList.each(function (index) {
      // 'this' = element found
      if ($(this).attr('data-item-name').trim().toLowerCase() === attackEffectName.trim().toLowerCase()) {
        $(this).find('h4').click();
        toggledAnything = true;
      }
    });
    if (!toggledAnything) {
      const newAbilityInfo = mAbilities[attackEffectName];
      if (newAbilityInfo) {
        const newAction = {
          name: attackEffectName,
          type: 'action',
          data: {
            actionType: { value: newAbilityInfo.actionType },
            source: { value: '' },
            description: { value: newAbilityInfo.description },
            traits: { value: [] },
            actions: { value: newAbilityInfo.actionCost },
          },
          flags: { pf2e_updatednpcsheet: { npcActionType: 'offensive' } },
        };

        const traitRegEx = /(?:Traits.aspx.+?">)(?:<\w+>)*(.+?)(?:<\/\w+>)*(?:<\/a>)/g;
        const matchTraits = [...newAbilityInfo.description.matchAll(traitRegEx)];

        for (let i = 0; i < matchTraits.length; i++) {
          if (matchTraits[i] && matchTraits[i].length >= 2 && matchTraits[i][1]) {
            if (!newAction.data.traits.value.includes(matchTraits[i][1])) newAction.data.traits.value.push(matchTraits[i][1]);
          }
        }

        triggerItem.actor.createOwnedItem(newAction, { displaySheet: false });
      }
    }
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
    if (!this.options.editable) return;

    /* Roll NPC HP */
    /*     html.find('.npc-roll-hp').click(ev => {
  let ad = this.actor.data.data;
  let hp = new Roll(ad.attributes.hp.formula).roll().total;
  AudioHelper.play({src: CONFIG.sounds.dice});
  this.actor.update({"data.attributes.hp.value": hp, "data.attributes.hp.max": hp});
  }); */

    // NPC SKill Rolling
    // html.find('.item .npc-skill-name').click(event => {
    //  event.preventDefault();
    //  let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id")),
    //     item = this.actor.getOwnedItem(itemId);
    //  this.actor.rollLoreSkill(event, item);
    // });

    // html.find('.skill-input').focusout(async event => {
    //  let itemId = Number(event.target.attributes["data-item-id"].value);
    //  const itemToEdit = this.actor.items.find(i => i.id === itemId);
    //  itemToEdit.data.mod.value = Number(event.target.value);

    //  // Need to update all skills every time because if the user tabbed through and updated many, only the last one would be saved
    //  let skills = this.actor.items.filter(i => i.type == "lore")
    //  for(let skill of skills)
    //  {
    //   await this.actor.updateOwnedItem(skill, true);
    //  }
    // });

    html.find('.npc-detail-text textarea').focusout(async (event) => {
      event.target.style.height = '5px';
      event.target.style.height = `${event.target.scrollHeight}px`;
    });

    html.find('.npc-detail-text textarea').each(function (index) {
      this.style.height = '5px';
      this.style.height = `${this.scrollHeight}px`;
    });

    html.find('.isNPCEditable').change((ev) => {
      this.actor.setFlag('pf2e', 'editNPC', { value: ev.target.checked });
    });

    // NPC Attack summaries
    // Unbind the base.js click event handler
    // html.find('.item .melee-name h4').off( "click" );
    //    html.find('.item .melee-name h4').click(event => {
    //     event.preventDefault();
    //       this._onUpNPCAttackSummary(event);
    //    });

    // NPC Weapon Rolling

    // html.find('button.npc-damageroll').off( "click" );
    html.find('button.npc-damageroll').click((ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
      const drId = Number($(ev.currentTarget).attr('data-dmgRoll'));
      // item = this.actor.items.find(i => { return i.id === itemId });
      const item = this.actor.getOwnedItem(itemId);
      const damageRoll = item.data.flags.pf2e_updatednpcsheet.damageRolls[drId];

      // which function gets called depends on the type of button stored in the dataset attribute action
      switch (ev.target.dataset.action) {
        case 'npcDamageRoll': this.rollNPCDamageRoll(damageRoll, item); break;
      }
    });

    html.find('button.npc-attackEffect').click((ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
      const aId = Number($(ev.currentTarget).attr('data-attackEffect'));
      // item = this.actor.items.find(i => { return i.id === itemId });
      const item = this.actor.getOwnedItem(itemId);
      const attackEffect = item.data.data.attackEffects.value[aId];
      console.log('PF2e System | clicked an attackEffect:', attackEffect, ev);

      // which function gets called depends on the type of button stored in the dataset attribute action
      switch (ev.target.dataset.action) {
        case 'npcAttackEffect': this.expandAttackEffect(attackEffect, ev, item); break;
      }
    });
    
    html.find('a.npc-elite-adjustment').click(e => {
      e.preventDefault();
      console.log(`PF2e System | Adding Elite adjustment to NPC`);
      const eliteButton = $(e.currentTarget);
      const weakButton = eliteButton.siblings('.npc-weak-adjustment');
      eliteButton.toggleClass('active');
      weakButton.toggleClass('hidden');
      this.npcAdjustment(eliteButton.hasClass('active'));
    });
    html.find('a.npc-weak-adjustment').click(e => {
      e.preventDefault();
      console.log(`PF2e System | Adding Weak adjustment to NPC`);
      const weakButton = $(e.currentTarget);
      const eliteButton = weakButton.siblings('.npc-elite-adjustment');
      weakButton.toggleClass('active');
      eliteButton.toggleClass('hidden');
      this.npcAdjustment( ! weakButton.hasClass('active') );
    });

  }
}

Handlebars.registerHelper('if_all', function () {
  const args = [].slice.apply(arguments);
  const opts = args.pop();

  let { fn } = opts;
  for (let i = 0; i < args.length; ++i) {
    if (args[i]) continue;
    fn = opts.inverse;
    break;
  }
  return fn(this);
});

Handlebars.registerHelper('strip_tags', (value, options) => {
  function strip_tags(input, allowed) { // eslint-disable-line camelcase
    const _phpCastString = function (value) {
      const type = typeof value;
      switch (type) {
        case 'boolean':
          return value ? '1' : '';
        case 'string':
          return value;
        case 'number':
          if (isNaN(value)) {
            return 'NAN';
          }

          if (!isFinite(value)) {
            return `${value < 0 ? '-' : ''}INF`;
          }

          return `${value}`;
        case 'undefined':
          return '';
        case 'object':
          if (Array.isArray(value)) {
            return 'Array';
          }

          if (value !== null) {
            return 'Object';
          }

          return '';
        case 'function':
          // fall through
        default:
          throw new Error('Unsupported value type');
      }
    };

    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed = ((`${allowed || ''}`).toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');

    const tags = /<\/?([a-z0-9]*)\b[^>]*>?/gi;
    const commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

    let after = _phpCastString(input);
    // removes tha '<' char at the end of the string to replicate PHP's behaviour
    after = (after.substring(after.length - 1) === '<') ? after.substring(0, after.length - 1) : after;

    // recursively remove tags to ensure that the returned string doesn't contain forbidden tags after previous passes (e.g. '<<bait/>switch/>')
    while (true) {
      const before = after;
      after = before.replace(commentsAndPhpTags, '').replace(tags, ($0, $1) => (allowed.indexOf(`<${$1.toLowerCase()}>`) > -1 ? $0 : ''));

      // return once no more tags are removed
      if (before === after) {
        return after;
      }
    }
  }

  return strip_tags(String(value));
});

export default UpdatedNPCActorPF2ESheet;
