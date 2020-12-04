/* global CONST, ui */
import ActorSheetPF2eCreature from './creature';
import { calculateBulk, itemsFromActorData, stacks, formatBulk, indexBulkItemsById } from '../../item/bulk';
import { calculateEncumbrance } from '../../item/encumbrance';
import { getContainerMap } from '../../item/container';
import { ProficiencyModifier } from '../../modifiers';
import { PF2eConditionManager } from '../../conditions';

/**
 * @category Other
 */
class CRBStyleCharacterActorSheetPF2E extends ActorSheetPF2eCreature {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['default', 'sheet', 'actor', 'pc'],
      width: 700,
      height: 800,
      tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "character" }],
      showUnpreparedSpells: false,
    });
  }

  get template() {
    let style = 'crb-style';
    if (!game.user.isGM && this.actor.limited) {
      style = 'limited';
    }
    return `systems/pf2e/templates/actors/${style}/actor-sheet.html`;
  }

  async _updateObject(event, formData) {
      // update shield hp
      const equippedShieldId = this.getEquippedShield(this.actor.data.items)?._id
      if (equippedShieldId !== undefined) {
          const shieldEntity = this.actor.getOwnedItem(equippedShieldId);
          await shieldEntity.update({
              'data.hp.value': formData['data.attributes.shield.hp.value']
          })
      }
      await super._updateObject(event, formData);
  }

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    // Temporary HP
    const { hp } = sheetData.data.attributes;
    if (hp.temp === 0) delete hp.temp;
    if (hp.tempmax === 0) delete hp.tempmax;

    // Update hero points label
    sheetData.data.attributes.heroPoints.icon = this._getHeroPointsIcon(sheetData.data.attributes.heroPoints.rank);
    sheetData.data.attributes.heroPoints.hover = CONFIG.PF2E.heroPointLevels[sheetData.data.attributes.heroPoints.rank];

    // Update class dc label
    sheetData.data.attributes.classDC.icon = this._getProficiencyIcon(sheetData.data.attributes.classDC.rank);
    sheetData.data.attributes.classDC.hover = CONFIG.PF2E.proficiencyLevels[sheetData.data.attributes.classDC.rank];

    // Spell Details
    sheetData.magicTraditions = CONFIG.PF2E.magicTraditions;
    sheetData.preparationType = CONFIG.PF2E.preparationType;
    sheetData.showUnpreparedSpells = sheetData.options.showUnpreparedSpells;

    // Update dying icon and container width
    sheetData.data.attributes.dying.containerWidth = `width: ${sheetData.data.attributes.dying.max*13}px;`;
    sheetData.data.attributes.dying.icon = this._getDyingIcon(sheetData.data.attributes.dying.value);

    // Update wounded, maximum wounded, and doomed.
    sheetData.data.attributes.wounded.icon = this._getWoundedIcon(sheetData.data.attributes.wounded.value);
    sheetData.data.attributes.wounded.max = sheetData.data.attributes.dying.max - 1;
    sheetData.data.attributes.doomed.icon = this._getDoomedIcon(sheetData.data.attributes.doomed.value);
    sheetData.data.attributes.doomed.max = sheetData.data.attributes.dying.max -1;

    sheetData.uid = this.id;

    // preparing the name of the rank, as this is displayed on the sheet
    sheetData.data.attributes.perception.rankName = game.i18n.format(`PF2E.ProficiencyLevel${sheetData.data.attributes.perception.rank}`);
    for (const save of Object.values(sheetData.data.saves as Record<any, any>)) {
      save.rankName = game.i18n.format(`PF2E.ProficiencyLevel${save.rank}`);
    }
    sheetData.data.attributes.classDC.rankName = game.i18n.format(`PF2E.ProficiencyLevel${sheetData.data.attributes.classDC.rank}`);
    
    // limiting the amount of characters for the save labels
    for (const save of Object.values(sheetData.data.saves as Record<any, any>)) {
      save.short = game.i18n.format(`PF2E.Saves${save.label}Short`); 
    }

    sheetData.data.effects = {};

    sheetData.data.effects.conditions = PF2eConditionManager.getFlattenedConditions(sheetData.actor.items.filter(i => i.flags.pf2e?.condition && i.type === 'condition'));
    // is the stamina variant rule enabled?
    sheetData.hasStamina = (game.settings.get('pf2e', 'staminaVariant') > 0);

    // Return data for rendering
    return sheetData;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Items for Character sheets
   * @private
   */
  _prepareItems(actorData) {
    // Inventory
    const inventory = {
      weapon: { label: game.i18n.localize("PF2E.InventoryWeaponsHeader"), items: [] },
      armor: { label: game.i18n.localize("PF2E.InventoryArmorHeader"), items: [] },
      equipment: { label: game.i18n.localize("PF2E.InventoryEquipmentHeader"), items: [], investedItemCount: 0 },
      consumable: { label: game.i18n.localize("PF2E.InventoryConsumablesHeader"), items: [] },
      treasure: { label: game.i18n.localize("PF2E.InventoryTreasureHeader"), items: [] },
      backpack: { label: game.i18n.localize("PF2E.InventoryBackpackHeader"), items: [] },
    };

    // Spellbook
    // const spellbook = {};
    const tempSpellbook = [];
    const spellcastingEntriesList = [];
    const spellbooks: any = [];
    spellbooks.unassigned = {};

    // Spellcasting Entries
    const spellcastingEntries = [];

    // Feats
    const feats = {
      ancestry: { label: 'PF2E.FeatAncestryHeader', feats: [] },
	    ancestryfeature: { label: 'PF2E.FeaturesAncestryHeader', feats: [] },
	    archetype: { label: 'PF2E.FeatArchetypeHeader', feats: [] },
	    bonus: { label: 'PF2E.FeatBonusHeader', feats: [] },
	    class: { label: 'PF2E.FeatClassHeader', feats: [] },
	    classfeature: { label: 'PF2E.FeaturesClassHeader', feats: [] },
      skill: { label: 'PF2E.FeatSkillHeader', feats: [] },
      general: { label: 'PF2E.FeatGeneralHeader', feats: [] },
      pfsboon: { label: 'PF2E.FeatPFSBoonHeader', feats: [] },
      deityboon: { label: 'PF2E.FeatDeityBoonHeader', feats: [] },
      curse: { label: 'PF2E.FeatCurseHeader', feats: [] },
    };

    // Actions
    const actions = {
      action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
      reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
      free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
    };

    // Read-Only Actions
    const readonlyActions = {
      "interaction": { label: "Interaction Actions", actions: [] },
      "defensive": { label: "Defensive Actions", actions: [] },
      "offensive": { label: "Offensive Actions", actions: [] },
    }

    const readonlyEquipment = [];

    const attacks = {
      weapon: { label: 'Compendium Weapon', items: [], type: 'weapon' },
    };

    // Skills
    const lores = [];
    const martialSkills = [];

    // Iterate through items, allocating to containers
    const bulkConfig = {
        ignoreCoinBulk: game.settings.get('pf2e', 'ignoreCoinBulk'),
        ignoreContainerOverflow: game.settings.get('pf2e', 'ignoreContainerOverflow'),
    };

    const bulkItems = itemsFromActorData(actorData);
    const indexedBulkItems = indexBulkItemsById(bulkItems);
    const containers = getContainerMap(actorData.items, indexedBulkItems, stacks, bulkConfig);

    let investedCount = 0; // Tracking invested items
    for (const i of actorData.items) {
      i.img = i.img || CONST.DEFAULT_TOKEN;
      i.containerData = containers.get(i._id);
      i.isContainer = i.containerData.isContainer;
      i.isNotInContainer = i.containerData.isNotInContainer;
            
      // Read-Only Equipment
      if (i.type === 'armor' || i.type === 'equipment' || i.type === 'consumable' || i.type === 'backpack') {
        readonlyEquipment.push(i);
        actorData.hasEquipment = true;
      }

      i.canBeEquipped = i.isNotInContainer;
      i.isEquipped = i.data?.equipped?.value ?? false;
      i.isSellableTreasure = i.type === 'treasure' && i.data?.stackGroup?.value !== 'coins';
      i.hasInvestedTrait = i.data?.traits?.value?.includes("invested") ?? false;
      i.isInvested = i.data?.invested?.value ?? false;
      if (i.isInvested) {
        investedCount += 1;
      }

      // Inventory
      if (Object.keys(inventory).includes(i.type)) {
        i.data.quantity.value = i.data.quantity.value || 0;
        i.data.weight.value = i.data.weight.value || 0;
        const [approximatedBulk] = calculateBulk([indexedBulkItems.get(i._id)], stacks, false, bulkConfig);
        i.totalWeight = formatBulk(approximatedBulk);
        i.hasCharges = (i.type === 'consumable') && i.data.charges.max > 0;
        i.isTwoHanded = (i.type === 'weapon') && !!((i.data.traits.value || []).find((x) => x.startsWith('two-hand')));
        i.wieldedTwoHanded = (i.type === 'weapon') && (i.data.hands || {}).value;
        if (i.type === 'weapon') {
          attacks.weapon.items.push(i);
        }
        inventory[i.type].items.push(i);
      }

      // Spells
      else if (i.type === 'spell') {
        let item;
          try {
            item = this.actor.getOwnedItem(i._id);
            i.spellInfo = item.getSpellInfo();
          } catch (err) {
            console.log(`PF2e System | Character Sheet | Could not load item ${i.name}`)
          }
        tempSpellbook.push(i);
      }

      // Spellcasting Entries
      else if (i.type === 'spellcastingEntry') {
        // collect list of entries to use later to match spells against.
        spellcastingEntriesList.push(i._id);

        const spellRank = (i.data.proficiency?.value || 0);
        const spellProficiency = ProficiencyModifier.fromLevelAndRank(actorData.data.details.level.value, spellRank).modifier;
        const spellAbl = i.data.ability.value || 'int';
        const spellAttack = actorData.data.abilities[spellAbl].mod + spellProficiency + i.data.item.value;
        if (i.data.spelldc.value !== spellAttack) {
          const updatedItem = {
            _id: i._id,
            data: {
              spelldc: {
                value: spellAttack,
                dc: spellAttack + 10,
                mod: actorData.data.abilities[spellAbl].mod,
              },
            },
          };
          this.actor.updateEmbeddedEntity('OwnedItem', updatedItem);
        }
        i.data.spelldc.mod = actorData.data.abilities[spellAbl].mod;
        i.data.spelldc.breakdown = `10 + ${spellAbl} modifier(${actorData.data.abilities[spellAbl].mod}) + proficiency(${spellProficiency}) + item bonus(${i.data.item.value})`;

        i.data.spelldc.icon = this._getProficiencyIcon(i.data.proficiency.value);
        i.data.spelldc.hover = CONFIG.PF2E.proficiencyLevels[i.data.proficiency.value];
        i.data.tradition.title = CONFIG.PF2E.magicTraditions[i.data.tradition.value];
        i.data.prepared.title = CONFIG.PF2E.preparationType[i.data.prepared.value];
        // Check if prepared spellcasting type and set Boolean
        if ((i.data.prepared || {}).value === 'prepared') i.data.prepared.preparedSpells = true;
        else i.data.prepared.preparedSpells = false;
        // Check if Ritual spellcasting tradition and set Boolean
        if ((i.data.tradition || {}).value === 'ritual') i.data.tradition.ritual = true;
        else i.data.tradition.ritual = false;
        if ((i.data.tradition || {}).value === 'focus') {
          i.data.tradition.focus = true;
          if (i.data.focus === undefined) i.data.focus = { points: 1, pool: 1};
          i.data.focus.icon = this._getFocusIcon(i.data.focus);
        } else i.data.tradition.focus = false;

        spellcastingEntries.push(i);
      }

      // Feats
      else if (i.type === 'feat') {
        const featType = i.data.featType.value || 'bonus';
        const actionType = i.data.actionType.value || 'passive';

        feats[featType].feats.push(i);
        if (Object.keys(actions).includes(actionType)) {
          i.feat = true;
          let actionImg: number|string = 0;
          if (actionType === 'action') actionImg = parseInt((i.data.actions || {}).value, 10) || 1;
          else if (actionType === 'reaction') actionImg = 'reaction';
          else if (actionType === 'free') actionImg = 'free';
          i.img = this._getActionImg(actionImg);
          actions[actionType].actions.push(i);

          // Read-Only Actions
          if(i.data.actionCategory && i.data.actionCategory.value) {
            switch(i.data.actionCategory.value){
              case 'interaction':
                readonlyActions.interaction.actions.push(i);
                actorData.hasInteractionActions = true;
              break;
              case 'defensive':
                readonlyActions.defensive.actions.push(i);
                actorData.hasDefensiveActions = true;
              break;
              // Should be offensive but throw anything else in there too
              default:
                readonlyActions.offensive.actions.push(i);
                actorData.hasOffensiveActions = true;
            }
          }
          else{
            readonlyActions.offensive.actions.push(i);
            actorData.hasOffensiveActions = true;
          }
        }
      }

      // Lore Skills
      else if (i.type === 'lore') {
        i.data.icon = this._getProficiencyIcon((i.data.proficient || {}).value);
        i.data.hover = CONFIG.PF2E.proficiencyLevels[((i.data.proficient || {}).value)];

        const rank = (i.data.proficient?.value || 0);
        const proficiency = ProficiencyModifier.fromLevelAndRank(actorData.data.details.level.value, rank).modifier;
        const modifier = actorData.data.abilities.int.mod;
        const itemBonus = Number((i.data.item || {}).value || 0);
        i.data.itemBonus = itemBonus;
        i.data.value = modifier + proficiency + itemBonus;
        i.data.breakdown = `int modifier(${modifier}) + proficiency(${proficiency}) + item bonus(${itemBonus})`;

        lores.push(i);
      }

      // Martial Skills
      else if (i.type === 'martial') {
        i.data.icon = this._getProficiencyIcon((i.data.proficient || {}).value);
        i.data.hover = CONFIG.PF2E.proficiencyLevels[((i.data.proficient || {}).value)];

        const rank = (i.data.proficient?.value || 0);
        const proficiency = ProficiencyModifier.fromLevelAndRank(actorData.data.details.level.value, rank).modifier;
        /* const itemBonus = Number((i.data.item || {}).value || 0);
        i.data.itemBonus = itemBonus; */
        i.data.value = proficiency// + itemBonus;
        i.data.breakdown = `proficiency(${proficiency})`;

        martialSkills.push(i);
      }

      // Actions
      if (i.type === 'action') {
        const actionType = i.data.actionType.value || 'action';
        let actionImg: number|string = 0;
        if (actionType === 'action') actionImg = parseInt(i.data.actions.value, 10) || 1;
        else if (actionType === 'reaction') actionImg = 'reaction';
        else if (actionType === 'free') actionImg = 'free';
        else if (actionType === 'passive') actionImg = 'passive';
        i.img = this._getActionImg(actionImg);
        if (actionType === 'passive') actions.free.actions.push(i);
        else actions[actionType].actions.push(i);

        // Read-Only Actions
        if(i.data.actionCategory && i.data.actionCategory.value) {
          switch(i.data.actionCategory.value){
            case 'interaction':
              readonlyActions.interaction.actions.push(i);
              actorData.hasInteractionActions = true;
            break;
            case 'defensive':
              readonlyActions.defensive.actions.push(i);
              actorData.hasDefensiveActions = true;
            break;
            case 'offensive':
              readonlyActions.offensive.actions.push(i);
              actorData.hasOffensiveActions = true;
            break;
            // Should be offensive but throw anything else in there too
            default:
              readonlyActions.offensive.actions.push(i);
              actorData.hasOffensiveActions = true;
          }
        }
        else{
          readonlyActions.offensive.actions.push(i);
          actorData.hasOffensiveActions = true;
        }
      }
    }

    inventory.equipment.investedItemCount = investedCount; // Tracking invested items

    const embeddedEntityUpdate = [];
    // Iterate through all spells in the temp spellbook and check that they are assigned to a valid spellcasting entry. If not place in unassigned.
    for (const i of tempSpellbook) {
      // check if the spell has a valid spellcasting entry assigned to the location value.
      if (spellcastingEntriesList.includes(i.data.location.value)) {
        const location = i.data.location.value;
        spellbooks[location] = spellbooks[location] || {};
        this._prepareSpell(actorData, spellbooks[location], i);
      } else if (spellcastingEntriesList.length === 1) { // if not BUT their is only one spellcasting entry then assign the spell to this entry.
        const location = spellcastingEntriesList[0];
        spellbooks[location] = spellbooks[location] || {};

        // Update spell to perminantly have the correct ID now
        // console.log(`PF2e System | Prepare Actor Data | Updating location for ${i.name}`);
        // this.actor.updateEmbeddedEntity("OwnedItem", { "_id": i._id, "data.location.value": spellcastingEntriesList[0]});
        embeddedEntityUpdate.push({ _id: i._id, 'data.location.value': spellcastingEntriesList[0] });

        this._prepareSpell(actorData, spellbooks[location], i);
      } else { // else throw it in the orphaned list.
        this._prepareSpell(actorData, spellbooks.unassigned, i);
      }
    }

    // Update all embedded entities that have an incorrect location.
    if (embeddedEntityUpdate.length) {
      console.log('PF2e System | Prepare Actor Data | Updating location for the following embedded entities: ', embeddedEntityUpdate);
      this.actor.updateEmbeddedEntity('OwnedItem', embeddedEntityUpdate);
    }

    // assign mode to actions
    Object.values(actions).flatMap(section => section.actions).forEach((action: any) => {
        action.downtime = action.data.traits.value.includes('downtime');
        action.exploration = action.data.traits.value.includes('exploration');
        action.encounter = !(action.downtime || action.exploration);
    });

    // Assign and return
    actorData.inventory = inventory;
    // Any spells found that don't belong to a spellcasting entry are added to a "orphaned spells" spell book (allowing the player to fix where they should go)
    if (Object.keys(spellbooks.unassigned).length) {
      actorData.orphanedSpells = true;
      actorData.orphanedSpellbook = spellbooks.unassigned;
    }
    actorData.feats = feats;
    actorData.attacks = attacks;
    actorData.actions = actions;
    actorData.readonlyActions = readonlyActions;
    actorData.readonlyEquipment = readonlyEquipment;
    actorData.lores = lores;
    actorData.martialSkills = martialSkills;


    for (const entry of spellcastingEntries) {
      if (entry.data.prepared.preparedSpells && spellbooks[entry._id]) {
        this._preparedSpellSlots(entry, spellbooks[entry._id]);
      }
      entry.spellbook = spellbooks[entry._id];
    }

    actorData.spellcastingEntries = spellcastingEntries;

    // shield
    const equippedShield = this.getEquippedShield(actorData.items);  
    if (equippedShield === undefined) {
        actorData.data.attributes.shield = {
            hp: {
                value: 0,
            },
            maxHp: {
                value: 0,
            },
            armor: {
                value: 0,
            },
            hardness: {
                value: 0,
            },
            brokenThreshold: {
                value: 0,
            },
        }
        actorData.data.attributes.shieldBroken = false;
    } else {
        actorData.data.attributes.shield = duplicate(equippedShield.data)
        actorData.data.attributes.shieldBroken = equippedShield?.data?.hp?.value <= equippedShield?.data?.brokenThreshold?.value;
    }

    // Inventory encumbrance
    // FIXME: this is hard coded for now
    const featNames = new Set(actorData.items
      .filter(item => item.type === 'feat')
      .map(item => item.name));

    let bonusEncumbranceBulk = actorData.data.attributes.bonusEncumbranceBulk ?? 0;
    let bonusLimitBulk = actorData.data.attributes.bonusLimitBulk ?? 0;
    if (featNames.has('Hefty Hauler')) {
      bonusEncumbranceBulk += 2;
      bonusLimitBulk += 2;
    }
    const equippedLiftingBelt = actorData.items
      .find(item => item.name === 'Lifting Belt' && item.data.equipped.value) !== undefined;
    if (equippedLiftingBelt) {
      bonusEncumbranceBulk += 1;
      bonusLimitBulk += 1;
    }
    const [bulk] = calculateBulk(bulkItems, stacks, false, bulkConfig);
    actorData.data.attributes.encumbrance = calculateEncumbrance(
      actorData.data.abilities.str.mod,
      bonusEncumbranceBulk,
      bonusLimitBulk,
      bulk,
      actorData.data?.traits?.size?.value ?? 'med',  
    );
  }
  
  getEquippedShield(items) {
      return items
          .find(item => item.type === 'armor'
              && item.data.equipped.value
              && item.data.armorType.value === 'shield')
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

    {
      // ensure correct tab name is displayed after actor update
      const title = $('.sheet-navigation .active').data('tabTitle');
      if (title) {
        html.find('.navigation-title').text(title);
      }
    }

    html.find('.sheet-navigation').on('mouseover', '.item', event => {
      const title = event.currentTarget.dataset.tabTitle;
      if (title) {
        $(event.currentTarget).parents('.sheet-navigation').find('.navigation-title').text(title);
      }
    });

    html.find('.sheet-navigation').on('mouseout', '.item', event => {
      const parent = $(event.currentTarget).parents('.sheet-navigation');
      const title = parent.find('.item.active').data('tabTitle');
      if (title) {
        parent.find('.navigation-title').text(title);
      }
    });

    // handle sub-tab navigation on the actions tab
    html.find('.actions-nav').on('click', '.tab:not(.tab-active)', event => {
        const target = $(event.currentTarget);
        const nav = target.parents('.actions-nav');
        // deselect current tab and panel
        nav.children('.tab-active').removeClass('tab-active');
        nav.siblings('.actions-panels').children('.actions-panel.active').removeClass('active')
        // select new tab and panel
        target.addClass('tab-active');
        nav.siblings('.actions-panels').children(`#${target.data('panel')}`).addClass('active');
    });

    html.find('.crb-trait-selector').click((ev) => this._onCrbTraitSelector(ev));

    html.find('.character-builder-button').click((ev) => this._onCharacterBuilder(ev));

    html.find('.strikes-list [data-action-index]').on('click', '.action-name', (event) => {
      $(event.currentTarget).parents('.expandable').toggleClass('expanded');
    });

    // the click listener registered on all buttons breaks the event delegation here...
    // html.find('.strikes-list [data-action-index]').on('click', '.damage-strike', (event) => {
    html.find('.strikes-list .damage-strike').click((event) => {
      if (this.actor.data.type !== 'character') throw Error("This sheet only works for characters");

      event.preventDefault();
      event.stopPropagation();
      const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
      const opts = this.actor.getRollOptions(['all', 'damage-roll']);
      this.actor.data.data.actions[Number(actionIndex)].damage(event, opts);
    });

    // the click listener registered on all buttons breaks the event delegation here...
    // html.find('.strikes-list [data-action-index]').on('click', '.critical-strike', (event) => {
    html.find('.strikes-list .critical-strike').click((event) => {
      if (this.actor.data.type !== 'character') throw Error("This sheet only works for characters");

      event.preventDefault();
      event.stopPropagation();
      const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
      const opts = this.actor.getRollOptions(['all', 'damage-roll']);
      this.actor.data.data.actions[Number(actionIndex)].critical(event, opts);
    });

    html.find('.actions-list').on('click', '[data-roll-option]:not([data-roll-option=""])', (event) => {
        this.actor.toggleRollOption(event.currentTarget.dataset.rollName, event.currentTarget.dataset.rollOption);
    });

    html.find('.add-modifier').on('click', '.fas.fa-plus-circle', (event) => this.onIncrementModifierValue(event));
    html.find('.add-modifier').on('click', '.fas.fa-minus-circle', (event) => this.onDecrementModifierValue(event));
    html.find('.add-modifier').on('click', '.add-modifier-submit', (event) => this.onAddCustomModifier(event));
    html.find('.modifier-list').on('click', '.remove-modifier', (event) => this.onRemoveCustomModifier(event));

    html.find('.hover').tooltipster({
        animation: 'fade',
        delay: 200,
        trigger: 'click',
        arrow: false,
        contentAsHTML: true,
        debug: true,
        interactive: true,
        side: ['right', 'bottom'],
        theme: 'crb-hover',
        minWidth: 120,
    });
  }

  /**
   * Get the font-awesome icon used to display a certain level of focus points
   * expection focus = { points: 1, pool: 1}
   * @private
   */
  _getFocusIcon(focus) {
    const icons = {};
    const usedPoint = '<i class="fas fa-dot-circle"></i>';
    const unUsedPoint = '<i class="far fa-circle"></i>';

    for (let i=0; i<=focus.pool; i++) { // creates focus.pool amount of icon options to be selected in the icons object
      let iconHtml = '';
      for (let iconColumn=1; iconColumn<=focus.pool; iconColumn++) { // creating focus.pool amount of icons
        iconHtml += (iconColumn<=i) ? usedPoint : unUsedPoint;
      }
      icons[i] = iconHtml;
    }

    return icons[focus.points];
  }

  onIncrementModifierValue(event) {
    const parent = $(event.currentTarget).parents('.add-modifier');
    (parent.find('.add-modifier-value input[type=number]')[0] as HTMLInputElement).stepUp();
  }

  onDecrementModifierValue(event) {
    const parent = $(event.currentTarget).parents('.add-modifier');
    (parent.find('.add-modifier-value input[type=number]')[0] as HTMLInputElement).stepDown();
  }

  onAddCustomModifier(event) {
    const parent = $(event.currentTarget).parents('.add-modifier');
    const stat = $(event.currentTarget).attr('data-stat');
    const modifier = Number(parent.find('.add-modifier-value input[type=number]').val());
    const name = `${parent.find('.add-modifier-name').val()}`;
    const type = `${parent.find('.add-modifier-type').val()}`;
    const errors = [];
    if (!stat || !stat.trim()) {
      errors.push('Statistic is required.');
    }
    if (!modifier || Number.isNaN(modifier)) {
        errors.push('Modifier value must be a number.');
    }
    if (!name || !name.trim()) {
        errors.push('Name is required.');
    }
    if (!type || !type.trim().length) {
        errors.push('Type is required.');
    }
    if (errors.length > 0) {
        ui.notifications.error(errors.join(' '));
    } else {
        this.actor.addCustomModifier(stat, name, modifier, type);
    }
  }

  onRemoveCustomModifier(event) {
    const stat = $(event.currentTarget).attr('data-stat');
    const name = $(event.currentTarget).attr('data-name');
    const errors = [];
    if (!stat || !stat.trim()) {
      errors.push('Statistic is required.');
    }
    if (!name || !name.trim()) {
      errors.push('Name is required.');
    }
    if (errors.length > 0) {
      ui.notifications.error(errors.join(' '));
    } else {
      this.actor.removeCustomModifier(stat, name);
    }
  }

  _onSubmit(event: any): Promise<any> {
    // Limit SP value to data.attributes.sp.max value
    if (event?.currentTarget?.name === 'data.attributes.sp.value') {
        event.currentTarget.value = Math.clamped(Number(event.currentTarget.value), Number(this.actor.data.data.attributes?.sp?.min ?? 0), Number(this.actor.data.data.attributes?.sp?.max ?? 0));
    }

    return super._onSubmit(event);
  }
}

export default CRBStyleCharacterActorSheetPF2E;
