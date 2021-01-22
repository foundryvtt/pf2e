/* global canvas, game, CONFIG, getProperty, MeasuredTemplate */
import { RemoveCoinsPopup } from './RemoveCoinsPopup';
import { sellAllTreasureSimple, sellTreasure } from '../../item/treasure';
import { AddCoinsPopup } from './AddCoinsPopup';
import { addKit } from '../../item/kits';
import { compendiumBrowser } from '../../packs/compendium-browser';
import { MoveLootPopup } from './loot/MoveLootPopup';
import { PF2EActor, SKILL_DICTIONARY } from '../actor';
import { TraitSelector5e } from '../../system/trait-selector';
import { PF2EItem } from '../../item/item';
import { ItemData, ConditionData, isPhysicalItem, SpellData } from '../../item/dataDefinitions';
import { PF2eConditionManager } from '../../conditions';
import { IdentifyItemPopup } from './IdentifyPopup';
import { PF2EPhysicalItem } from '../../item/physical';
import { ScrollWandPopup } from './scroll-wand-popup';
import { scrollFromSpell, wandFromSpell } from '../../item/spellConsumables';

/**
 * Extend the basic ActorSheet class to do all the PF2e things!
 * This sheet is an Abstract layer which is not used.
 * @category Actor
 */
export abstract class ActorSheetPF2e<ActorType extends PF2EActor> extends ActorSheet<ActorType, PF2EItem> {
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            scrollY: [
                '.sheet-sidebar',
                '.spellcastingEntry-list',
                '.actions-list',
                '.skills-pane',
                '.feats-pane',
                '.inventory-pane',
                '.actions-pane',
                '.spellbook-pane',
                '.skillstab-pane',
            ],
        });
    }

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
        const sheetData: any = super.getData();

        this._prepareTraits(sheetData.data.traits);
        this._prepareItems(sheetData.actor);

        sheetData.isTargetFlatFooted = this.actor.getFlag(game.system.id, 'rollOptions.all.target:flatFooted');
        sheetData.isProficiencyLocked = this.actor.getFlag(game.system.id, 'proficiencyLock');

        // Return data to the sheet
        return sheetData;
    }

    abstract _prepareItems(actor: PF2EActor): void;

    _findActiveList() {
        return (this.element as JQuery).find('.tab.active .directory-list');
    }

    /* -------------------------------------------- */

    _prepareTraits(traits) {
        if (traits === undefined) return;

        const map = {
            languages: CONFIG.PF2E.languages,
            dr: CONFIG.PF2E.resistanceTypes,
            di: CONFIG.PF2E.immunityTypes,
            dv: CONFIG.PF2E.weaknessTypes,
            ci: CONFIG.PF2E.immunityTypes,
            traits: CONFIG.PF2E.monsterTraits,
        };

        for (const [t, choices] of Object.entries(map)) {
            const trait = traits[t] || { value: [], selected: [] };

            if (Array.isArray(trait)) {
                // todo this is so wrong...
                (trait as any).selected = {};
                for (const entry of trait) {
                    if (typeof entry === 'object') {
                        if ('exceptions' in entry && entry.exceptions !== '') {
                            (trait as any).selected[entry.type] = `${choices[entry.type]} (${entry.value}) [${
                                entry.exceptions
                            }]`;
                        } else {
                            let text = `${choices[entry.type]}`;
                            if (entry.value !== '') text = `${text} (${entry.value})`;
                            (trait as any).selected[entry.type] = text;
                        }
                    } else {
                        (trait as any).selected[entry] = choices[entry] || `${entry}`;
                    }
                }
            } else if (trait.value) {
                trait.selected = Object.fromEntries(trait.value.map((name) => [name, name]));
            }

            // Add custom entry
            if (trait.custom) trait.selected.custom = trait.custom;
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
        const spellLvl = Number(spell.data.level.value) < 11 ? Number(spell.data.level.value) : 10;
        let spellcastingEntry: any = null;

        if ((spell.data.location || {}).value) {
            spellcastingEntry = (this.actor.getOwnedItem(spell.data.location.value) || {}).data;
        }

        // if the spellcaster entry cannot be found (maybe it was deleted?)
        if (!spellcastingEntry) {
            console.log(`PF2e System | Prepare Spell | Spellcasting entry not found for spell ${spell.name}`);
            return;
        }

        // This is needed only if we want to prepare the data model only for the levels that a spell is already prepared in setup spellbook levels for all of those to catch case where sheet only has spells of lower level prepared in higher level slot
        const isNotLevelBasedSpellcasting =
            spellcastingEntry.data?.tradition?.value === 'wand' ||
            spellcastingEntry.data?.tradition?.value === 'scroll' ||
            spellcastingEntry.data?.tradition?.value === 'ritual' ||
            spellcastingEntry.data?.tradition?.value === 'focus';

        const spellsSlotsWhereThisIsPrepared = Object.entries(
            (spellcastingEntry.data?.slots || {}) as Record<any, any>,
        )?.filter(
            (slotArr) => !!Object.values(slotArr[1].prepared as any[]).find((slotSpell) => slotSpell?.id === spell._id),
        );
        const highestSlotPrepared =
            spellsSlotsWhereThisIsPrepared
                ?.map((slot) => parseInt(slot[0].match(/slot(\d+)/)[1], 10))
                .reduce((acc, cur) => (cur > acc ? cur : acc), 0) ?? spellLvl;
        const normalHighestSpellLevel = Math.ceil(actorData.data.details.level.value / 2);
        const maxSpellLevelToShow = Math.min(10, Math.max(spellLvl, highestSlotPrepared, normalHighestSpellLevel));
        // Extend the Spellbook level
        for (let i = maxSpellLevelToShow; i >= 0; i--) {
            if (!isNotLevelBasedSpellcasting || i === spellLvl) {
                spellbook[i] = spellbook[i] || {
                    isCantrip: i === 0,
                    isFocus: i === 11,
                    label: CONFIG.PF2E.spellLevels[i],
                    spells: [],
                    prepared: [],
                    uses: spellcastingEntry ? parseInt(spellcastingEntry.data?.slots[`slot${i}`].value, 10) || 0 : 0,
                    slots: spellcastingEntry ? parseInt(spellcastingEntry.data?.slots[`slot${i}`].max, 10) || 0 : 0,
                    displayPrepared:
                        spellcastingEntry &&
                        spellcastingEntry.data.displayLevels &&
                        spellcastingEntry.data.displayLevels[i] !== undefined
                            ? spellcastingEntry.data.displayLevels[i]
                            : true,
                    unpreparedSpellsLabel:
                        spellcastingEntry &&
                        spellcastingEntry.data.tradition.value === 'arcane' &&
                        spellcastingEntry.data.prepared.value === 'prepared'
                            ? game.i18n.localize('PF2E.UnpreparedSpellsLabelArcanePrepared')
                            : game.i18n.localize('PF2E.UnpreparedSpellsLabel'),
                };
            }
        }

        // Add the spell to the spellbook at the appropriate level
        spell.data.school.str = CONFIG.PF2E.spellSchools[spell.data.school.value];
        // Add chat data
        try {
            const item = this.actor.getOwnedItem(spell._id);
            if (item) {
                spell.spellInfo = item.getSpellInfo();
            }
        } catch (err) {
            console.log(`PF2e System | Character Sheet | Could not load chat data for spell ${spell.id}`, spell);
        }
        spellbook[spellLvl].spells.push(spell);
    }

    /* -------------------------------------------- */

    /**
     * Insert prepared spells into the spellbook object when rendering the character sheet
     * @param {Object} spellcastingEntry    The spellcasting entry data being prepared
     * @param {Object} spellbook            The spellbook data being prepared
     * @private
     */
    _preparedSpellSlots(spellcastingEntry, spellbook) {
        // let isNPC = this.actorType === "npc";

        for (const [key, spl] of Object.entries(spellbook as Record<any, any>)) {
            if (spl.slots > 0) {
                for (let i = 0; i < spl.slots; i++) {
                    const entrySlot = ((spellcastingEntry.data.slots[`slot${key}`] || {}).prepared || {})[i] || null;

                    if (entrySlot && entrySlot.id) {
                        // console.log(`PF2e System | Getting item: ${entrySlot.id}: `);
                        const item: any = this.actor.getOwnedItem(entrySlot.id);
                        if (item) {
                            // console.log(`PF2e System | Duplicating item: ${item.name}: `, item);
                            const itemCopy: any = duplicate(item);
                            if (entrySlot.expended) {
                                itemCopy.expended = true;
                            } else {
                                itemCopy.expended = false;
                            }

                            spl.prepared[i] = itemCopy;
                            if (spl.prepared[i]) {
                                // enrich data with spell school formatted string
                                if (
                                    spl.prepared[i].data &&
                                    spl.prepared[i].data.school &&
                                    spl.prepared[i].data.school.str
                                ) {
                                    spl.prepared[i].data.school.str =
                                        CONFIG.PF2E.spellSchools[spl.prepared[i].data.school.value];
                                }

                                // Add chat data
                                try {
                                    spl.prepared[i].spellInfo = item.getSpellInfo();
                                } catch (err) {
                                    console.log(
                                        `PF2e System | Character Sheet | Could not load prepared spell ${entrySlot.id}`,
                                        item,
                                    );
                                }

                                spl.prepared[i].prepared = true;
                            }
                            // prepared spell not found
                            else {
                                spl.prepared[i] = {
                                    name: 'Empty Slot (drag spell here)',
                                    id: null,
                                    prepared: false,
                                };
                            }
                        } else {
                            // Could not find an item for ID: ${entrySlot.id}. Marking the slot as empty so it can be overwritten.
                            spl.prepared[i] = {
                                name: 'Empty Slot (drag spell here)',
                                id: null,
                                prepared: false,
                            };
                        }
                    } else {
                        // if there is no prepared spell for this slot then make it empty.
                        spl.prepared[i] = {
                            name: 'Empty Slot (drag spell here)',
                            id: null,
                            prepared: false,
                        };
                    }
                }
            }
        }
    }

    /* -------------------------------------------- */

    /**
     * Prepare Spell SLot
     * Saves the prepared spell slot data to the actor
     * @param spellLevel {String}   The level of the spell slot
     * @param spellSlot {String}    The number of the spell slot
     * @param spell {String}        The item details for the spell
     */
    async _allocatePreparedSpellSlot(spellLevel, spellSlot, spell: SpellData, entryId) {
        if (spell.data.level.value > spellLevel) {
            console.warn(`Attempted to add level ${spell.data.level.value} spell to level ${spellLevel} spell slot.`);
            return;
        }
        if (CONFIG.debug.hooks === true)
            console.log(
                `PF2e DEBUG | Updating location for spell ${spell.name} to match spellcasting entry ${entryId}`,
            );
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        const options = {
            _id: entryId,
        };
        options[key] = { id: spell._id };
        this.actor.updateEmbeddedEntity('OwnedItem', options);
    }

    /* -------------------------------------------- */

    /**
     * Remove Spell Slot
     * Removes the spell from the saved spell slot data for the actor
     * @param spellLevel {String}   The level of the spell slot
     * @param spellSlot {String}    The number of the spell slot    *
     */
    async _removePreparedSpellSlot(spellLevel, spellSlot, entryId) {
        // let spellcastingEntry = this.actor.items.find(i => { return i.id === Number(entryId) });;
        /*     let spellcastingEntry = this.actor.getOwnedItem(Number(entryId)).data;

    spellcastingEntry.data.slots["slot" + spellLevel].prepared[spellSlot] = {
      name: "Empty Slot (drag spell here)",
      id: null,
      prepared: false
    };
    await this.actor.updateOwnedItem(spellcastingEntry, true);  */
        if (CONFIG.debug.hooks === true)
            console.log(
                `PF2e DEBUG | Updating spellcasting entry ${entryId} to remove spellslot ${spellSlot} for spell level ${spellLevel}`,
            );
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        const options = {
            _id: entryId,
        };
        options[key] = {
            name: 'Empty Slot (drag spell here)',
            id: null,
            prepared: false,
        };
        this.actor.updateEmbeddedEntity('OwnedItem', options);
    }

    /**
     * Sets the expended state of a  Spell Slot
     * Marks the slot as expended which is reflected in the UI
     * @param spellLevel {String}   The level of the spell slot
     * @param spellSlot {String}    The number of the spell slot    *
     */
    async _setExpendedPreparedSpellSlot(spellLevel, spellSlot, entryId, expendedState) {
        let state = true;
        if (expendedState === 'true') state = false;

        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        const options = {
            _id: entryId,
        };
        options[key] = {
            expended: state,
        };
        this.actor.updateEmbeddedEntity('OwnedItem', options);
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
            4: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
        };
        return icons[level];
    }

    /* -------------------------------------------- */

    /**
     * Get the font-awesome icon used to display a certain level of dying
     * @private
     */
    _getDyingIcon(level) {
        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const doomed = this.object.data.data.attributes.doomed.value || 0;
        const circle = '<i class="far fa-circle"></i>';
        const cross = '<i class="fas fa-times-circle"></i>';
        const skull = '<i class="fas fa-skull"></i>';
        const redOpen = '<span>';
        const redClose = '</span>';
        const icons = {};

        for (let dyingLevel = 0; dyingLevel <= maxDying; dyingLevel++) {
            icons[dyingLevel] = dyingLevel === maxDying ? redOpen : '';
            for (let column = 1; column <= maxDying; column++) {
                if (column >= maxDying - doomed || dyingLevel === maxDying) {
                    icons[dyingLevel] += skull;
                } else if (dyingLevel < column) {
                    icons[dyingLevel] += circle;
                } else {
                    icons[dyingLevel] += cross;
                }
            }
            icons[dyingLevel] += dyingLevel === maxDying ? redClose : '';
        }

        return icons[level];
    }

    /**
     * Get the font-awesome icon used to display a certain level of wounded
     * @private
     */
    _getWoundedIcon(level) {
        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const icons = {};
        const usedPoint = '<i class="fas fa-dot-circle"></i>';
        const unUsedPoint = '<i class="far fa-circle"></i>';

        for (let i = 0; i < maxDying; i++) {
            let iconHtml = '';
            for (let iconColumn = 1; iconColumn < maxDying; iconColumn++) {
                iconHtml += iconColumn <= i ? usedPoint : unUsedPoint;
            }
            icons[i] = iconHtml;
        }

        return icons[level];
    }

    /**
     * Get the font-awesome icon used to display a certain level of doomed
     * @private
     */
    _getDoomedIcon(level) {
        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const icons = {};
        const usedPoint = '<i class="fas fa-skull"></i>';
        const unUsedPoint = '<i class="far fa-circle"></i>';

        for (let i = 0; i < maxDying; i++) {
            let iconHtml = '';
            for (let iconColumn = 1; iconColumn < maxDying; iconColumn++) {
                iconHtml += iconColumn <= i ? usedPoint : unUsedPoint;
            }
            icons[i] = iconHtml;
        }

        return icons[level];
    }

    /* -------------------------------------------- */

    /**
     * Get the font-awesome icon used to display hero points
     * @private
     */
    _getHeroPointsIcon(level) {
        const icons = {
            0: '<i class="far fa-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
            1: '<i class="fas fa-hospital-symbol"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
            2: '<i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i><i class="far fa-circle"></i>',
            3: '<i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i>',
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
    activateListeners(html: JQuery) {
        super.activateListeners(html);

        // Pad field width
        html.find('[data-wpad]').each((i, e) => {
            const text = e.tagName === 'INPUT' ? (e as HTMLInputElement).value : e.innerText;
            const w = (text.length * parseInt(e.getAttribute('data-wpad'), 10)) / 2;
            e.setAttribute('style', `flex: 0 0 ${w}px`);
        });

        // Item summaries
        html.find('.item .item-name h4').click((event) => {
            this._onItemSummary(event);
        });

        // NPC Attack summaries
        html.find('.item .melee-name h4').click((event) => {
            this._onItemSummary(event);
        });

        // strikes
        html.find('.strikes-list [data-action-index]').on('click', '.action-name', (event) => {
            $(event.currentTarget).parents('.expandable').toggleClass('expanded');
        });

        // the click listener registered on all buttons breaks the event delegation here...
        // html.find('.strikes-list [data-action-index]').on('click', '.damage-strike', (event) => {
        html.find('.strikes-list .damage-strike').on('click', (event) => {
            if (!['character', 'npc'].includes(this.actor.data.type))
                throw Error('This sheet only works for characters and NPCs');
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
            const opts = this.actor.getRollOptions(['all', 'damage-roll']);
            this.actor.data.data.actions[Number(actionIndex)].damage(event, opts);
        });

        // the click listener registered on all buttons breaks the event delegation here...
        // html.find('.strikes-list [data-action-index]').on('click', '.critical-strike', (event) => {
        html.find('.strikes-list .critical-strike').on('click', (event) => {
            if (!['character', 'npc'].includes(this.actor.data.type))
                throw Error('This sheet only works for characters and NPCs');
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
            const opts = this.actor.getRollOptions(['all', 'damage-roll']);
            this.actor.data.data.actions[Number(actionIndex)].critical(event, opts);
        });

        // for spellcasting checks
        html.find('.spellcasting.rollable').click((event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
            const item = this.actor.getOwnedItem(itemId) as PF2EItem;
            item.rollSpellcastingEntryCheck(event);
        });

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        /* -------------------------------------------- */
        /*  Attributes, Skills, Saves and Traits
     /* -------------------------------------------- */

        // Roll Save Checks
        html.find('.save-name').click((ev) => {
            ev.preventDefault();
            const save = $(ev.currentTarget).parents('[data-save]')[0].getAttribute('data-save');
            if (this.actor.data.data.saves[save]?.roll) {
                const opts = this.actor.getRollOptions(['all', 'saving-throw', save]);
                this.actor.data.data.saves[save].roll(ev, opts);
            } else {
                this.actor.rollSave(ev, save);
            }
        });

        // Roll Attribute Checks
        html.find('.roll-init').click((ev) => {
            ev.preventDefault();
            const checkType = this.actor.data.data.attributes.initiative.ability;
            const opts = this.actor.getRollOptions(
                ['all', 'initiative'].concat(SKILL_DICTIONARY[checkType] ?? checkType),
            );
            this.actor.data.data.attributes.initiative.roll(ev, opts);
        });

        html.find('.attribute-name').click((ev) => {
            ev.preventDefault();
            const attribute = ev.currentTarget.parentElement.getAttribute('data-attribute');
            const isSecret = ev.currentTarget.getAttribute('data-secret');
            if (this.actor.data.data.attributes[attribute]?.roll) {
                const opts = this.actor.getRollOptions(['all', attribute]);
                if (isSecret) {
                    opts.push('secret');
                }
                this.actor.data.data.attributes[attribute].roll(ev, opts);
            } else {
                this.actor.rollAttribute(ev, attribute);
            }
        });

        // Roll Ability Checks
        html.find('.ability-name').click((ev) => {
            ev.preventDefault();
            const ability = ev.currentTarget.parentElement.getAttribute('data-ability');
            this.actor.rollAbility(ev, ability);
        });

        // Roll Skill Checks
        html.find('.skill-name.rollable, .skill-score.rollable').click((ev) => {
            const skl = ev.currentTarget.parentElement.getAttribute('data-skill');
            if (this.actor.data.data.skills[skl]?.roll) {
                const opts = this.actor.getRollOptions(['all', 'skill-check', SKILL_DICTIONARY[skl] ?? skl]);
                this.actor.data.data.skills[skl].roll(ev, opts);
            } else {
                this.actor.rollSkill(ev, skl);
            }
        });

        // Roll Recovery Flat Check when Dying
        html.find('.recoveryCheck.rollable').click((ev) => {
            this.actor.rollRecovery(ev);
        });

        // Toggle Levels of stats (like proficiencies conditions or hero points)
        html.find('.click-stat-level').on('click contextmenu', this._onClickStatLevel.bind(this));

        // Toggle Dying Wounded
        html.find('.dying-click').on('click contextmenu', this._onClickDying.bind(this));

        // Remove Spell Slot
        html.find('.item-unprepare').click((ev) => {
            const slotId = Number($(ev.currentTarget).parents('.item').attr('data-slot-id'));
            const spellLvl = Number($(ev.currentTarget).parents('.item').attr('data-spell-lvl'));
            const entryId = $(ev.currentTarget).parents('.item').attr('data-entry-id');
            this._removePreparedSpellSlot(spellLvl, slotId, entryId);
        });

        // Set Expended Status of Spell Slot
        html.find('.item-toggle-prepare').click((ev) => {
            const slotId = Number($(ev.currentTarget).parents('.item').attr('data-slot-id'));
            const spellLvl = Number($(ev.currentTarget).parents('.item').attr('data-spell-lvl'));
            const entryId = $(ev.currentTarget).parents('.item').attr('data-entry-id');
            const expendedState = $(ev.currentTarget).parents('.item').attr('data-expended-state');
            this._setExpendedPreparedSpellSlot(spellLvl, slotId, entryId, expendedState);
        });

        // Toggle equip
        html.find('.item-toggle-equip').click((ev) => {
            const f = $(ev.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id');
            const active = f.hasClass('active');
            this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.equipped.value': !active });
        });

        // Toggle invest
        html.find('.item-toggle-invest').click((ev) => {
            const f = $(ev.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id');
            const active = f.hasClass('active');
            this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.invested.value': !active });
        });

        // Trait Selector
        html.find('.trait-selector').click((ev) => this._onTraitSelector(ev));

        html.find('.add-coins-popup button').click((ev) => this._onAddCoinsPopup(ev));

        html.find('.remove-coins-popup button').click((ev) => this._onRemoveCoinsPopup(ev));

        html.find('.sell-all-treasure button').click((ev) => this._onSellAllTreasure(ev));

        // Feat Browser
        html.find('.feat-browse').click((ev) => compendiumBrowser.openTab('feat'));

        // Action Browser
        html.find('.action-browse').click((ev) => compendiumBrowser.openTab('action'));

        // Spell Browser
        html.find('.spell-browse').click((ev) => compendiumBrowser.openTab('spell'));

        // Inventory Browser
        html.find('.inventory-browse').click((ev) => compendiumBrowser.openTab('equipment'));

        // Spell Create
        html.find('.spell-create').click((ev) => this._onItemCreate(ev));

        // Add Spellcasting Entry
        html.find('.spellcasting-create').click((ev) => this._createSpellcastingEntry(ev));

        // Remove Spellcasting Entry
        html.find('.spellcasting-remove').click((ev) => this._removeSpellcastingEntry(ev));

        // toggle visibility of filter containers
        html.find('.hide-container-toggle').click((ev) => {
            $(ev.target)
                .parent()
                .siblings()
                .toggle(100, () => {});
        });

        /* -------------------------------------------- */
        /*  Inventory
    /* -------------------------------------------- */

        // Create New Item
        html.find('.item-create').click((ev) => this._onItemCreate(ev));

        html.find('.item-toggle-container').click((ev) => this._toggleContainer(ev));

        // Sell treasure item
        html.find('.item-sell-treasure').click((ev) => {
            const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
            sellTreasure(this.actor, itemId);
        });

        // Update Inventory Item
        html.find('.item-edit').click((ev) => {
            const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
            const Item = CONFIG.Item.entityClass;
            // const item = new Item(this.actor.items.find(i => i.id === itemId), {actor: this.actor});
            const item = new Item(this.actor.getOwnedItem(itemId).data, { actor: this.actor });
            item.sheet.render(true);
        });

        // Toggle identified
        html.find('.item-toggle-identified').click((ev) => {
            const f = $(ev.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id');
            const identified = f.hasClass('identified');
            if (identified) {
                const item = this.actor.getOwnedItem(itemId);
                if (!(item instanceof PF2EPhysicalItem)) {
                    throw Error(`PF2e | ${item.name} is not a physical item.`);
                }
                item.setIsIdentified(false);
            } else {
                new IdentifyItemPopup(this.actor, { itemId }).render(true);
            }
        });

        // Delete Inventory Item
        html.find('.item-delete').click(async (ev) => {
            const li = $(ev.currentTarget).parents('.item');
            const itemId = li.attr('data-item-id');
            const item = new PF2EItem(this.actor.getOwnedItem(itemId).data, { actor: this.actor });

            if (item.type === 'condition' && item.getFlag(game.system.id, 'condition')) {
                // Condition Item.

                const condition = item.data as ConditionData;
                const list: string[] = [];
                const references = li.find('.condition-references');

                console.log(references.html());

                const content = await renderTemplate('systems/pf2e/templates/actors/delete-condition-dialog.html', {
                    name: item.name,
                    ref: references.html(),
                });
                new Dialog({
                    title: 'Remove Condition',
                    content,
                    buttons: {
                        Yes: {
                            icon: '<i class="fa fa-check"></i>',
                            label: 'Yes',
                            callback: async () => {
                                this.actor.data.items
                                    .filter(
                                        (i) =>
                                            i.type === 'condition' &&
                                            i.flags.pf2e?.condition &&
                                            i.data.base === condition.data.base &&
                                            i.data.value.value === condition.data.value.value,
                                    )
                                    .forEach((i: ConditionData) => {
                                        list.push(i._id);
                                    });

                                await PF2eConditionManager.removeConditionFromToken(list, this.token);
                            },
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: 'Cancel',
                        },
                    },
                    default: 'Yes',
                }).render(true);
            } else {
                const content = await renderTemplate('systems/pf2e/templates/actors/delete-item-dialog.html', {
                    name: item.name,
                });
                new Dialog({
                    title: 'Delete Confirmation',
                    content,
                    buttons: {
                        Yes: {
                            icon: '<i class="fa fa-check"></i>',
                            label: 'Yes',
                            callback: async () => {
                                await this.actor.deleteOwnedItem(itemId);
                                if (item.type === 'lore') {
                                    // normalize skill name to lower-case and dash-separated words
                                    const skill = item.name.toLowerCase().replace(/\s+/g, '-');
                                    // remove derived skill data
                                    await this.actor.update({ [`data.skills.-=${skill}`]: null });
                                } else {
                                    // clean up any individually targeted modifiers to attack and damage
                                    await this.actor.update({
                                        [`data.customModifiers.-=${itemId}-attack`]: null,
                                        [`data.customModifiers.-=${itemId}-damage`]: null,
                                    });
                                }
                                li.slideUp(200, () => this.render(false));
                            },
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: 'Cancel',
                        },
                    },
                    default: 'Yes',
                }).render(true);
            }
        });

        // Increase Item Quantity
        html.find('.item-increase-quantity').click((event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            const item = this.actor.getOwnedItem(itemId).data;
            if (!('quantity' in item.data)) {
                throw new Error('Tried to update quantity on item that does not have quantity');
            }
            this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.quantity.value': Number(item.data.quantity.value) + 1,
            });
        });

        // Decrease Item Quantity
        html.find('.item-decrease-quantity').click((event) => {
            const li = $(event.currentTarget).parents('.item');
            const itemId = li.attr('data-item-id');
            const item = this.actor.getOwnedItem(itemId).data;
            if (!('quantity' in item.data)) {
                throw new Error('Tried to update quantity on item that does not have quantity');
            }
            if (Number(item.data.quantity.value) > 0) {
                this.actor.updateEmbeddedEntity('OwnedItem', {
                    _id: itemId,
                    'data.quantity.value': Number(item.data.quantity.value) - 1,
                });
            }
        });

        // Toggle Spell prepared value
        html.find('.item-prepare').click((ev) => {
            const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
            // item = this.actor.items.find(i => { return i.id === itemId });
            const item = this.actor.getOwnedItem(itemId).data;
            if (!('prepared' in item.data)) {
                throw new Error('Tried to update prepared on item that does not have prepared');
            }
            item.data.prepared.value = !item.data.prepared.value;
            this.actor.updateEmbeddedEntity('OwnedItem', item);
        });

        // Item Dragging
        const handler = (ev) => this._onDragItemStart(ev);
        html.find('.item').each((i, li) => {
            li.setAttribute('draggable', 'true');
            li.addEventListener('dragstart', handler, false);
        });

        // Skill Dragging
        const skillHandler = (ev) => this._onDragSkillStart(ev);
        html.find('.skill').each((i, li) => {
            li.setAttribute('draggable', 'true');
            li.addEventListener('dragstart', skillHandler, false);
        });

        // Toggle Dragging
        html.find('[data-toggle-property][data-toggle-label]').each((i, li) => {
            li.setAttribute('draggable', 'true');
            li.addEventListener('dragstart', (event) => this._onDragToggleStart(event), false);
        });

        // change background for dragged over items that are containers
        const containerItems = Array.from(html[0].querySelectorAll('[data-item-is-container="true"]'));
        containerItems.forEach((elem: HTMLElement) =>
            elem.addEventListener('dragenter', () => elem.classList.add('hover-container'), false),
        );
        containerItems.forEach((elem: HTMLElement) =>
            elem.addEventListener('dragleave', () => elem.classList.remove('hover-container'), false),
        );

        // Action Rolling (strikes)
        html.find('[data-action-index].item .item-image.action-strike').click((event) => {
            if (!('actions' in this.actor.data.data)) throw Error('Strikes are not supported on this actor');

            const actionIndex = $(event.currentTarget).parents('.item').attr('data-action-index');
            const opts = this.actor.getRollOptions(['all', 'attack-roll']);
            this.actor.data.data.actions[Number(actionIndex)].roll(event, opts);
        });

        html.find('[data-variant-index].variant-strike').click((event) => {
            if (!('actions' in this.actor.data.data)) throw Error('Strikes are not supported on this actor');
            event.stopImmediatePropagation();
            const actionIndex = $(event.currentTarget).parents('.item').attr('data-action-index');
            const variantIndex = $(event.currentTarget).attr('data-variant-index');
            const opts = this.actor.getRollOptions(['all', 'attack-roll']);
            this.actor.data.data.actions[Number(actionIndex)].variants[Number(variantIndex)].roll(event, opts);
        });

        // Item Rolling
        html.find('[data-item-id].item .item-image').click((event) => this._onItemRoll(event));

        // Update Item Bonus on an actor.item input
        html.find<HTMLInputElement>('.focus-pool-input').change(async (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
            const focusPool = Math.clamped(Number(event.target.value), 0, 3);
            const item = this.actor.getOwnedItem(itemId);
            let focusPoints = getProperty(item.data, 'data.focus.points') || 0;
            focusPoints = Math.clamped(focusPoints, 0, focusPool);
            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.focus.points': focusPoints,
                'data.focus.pool': focusPool,
            });
        });

        // Update Item Bonus on an actor.item input
        html.find<HTMLInputElement>('.item-value-input').change(async (event) => {
            event.preventDefault();

            let itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            if (!itemId) {
                itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
            }

            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.item.value': Number(event.target.value),
            });
        });

        // Update Item Name
        html.find<HTMLInputElement>('.item-name-input').change(async (event) => {
            const itemId = event.target.attributes['data-item-id'].value;
            await this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, name: event.target.value });
        });

        // Update used slots for Spell Items
        html.find<HTMLInputElement>('.spell-slots-input').change(async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            const slotLvl = Number($(event.currentTarget).parents('.item').attr('data-level'));

            const key = `data.slots.slot${slotLvl}.value`;
            const options = { _id: itemId };
            options[key] = Number(event.target.value);

            await this.actor.updateEmbeddedEntity('OwnedItem', options);
        });

        // Update max slots for Spell Items
        html.find<HTMLInputElement>('.spell-max-input').change(async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            const slotLvl = Number($(event.currentTarget).parents('.item').attr('data-level'));
            const key = `data.slots.slot${slotLvl}.max`;
            const options = { _id: itemId };
            options[key] = Number(event.target.value);

            await this.actor.updateEmbeddedEntity('OwnedItem', options);
        });

        // Modify select element
        html.find<HTMLSelectElement>('.ability-select').change(async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.ability.value': event.target.value,
            });
        });

        // Update max slots for Spell Items
        html.find('.prepared-toggle').click(async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
            const itemToEdit = this.actor.getOwnedItem(itemId).data;
            if (itemToEdit.type !== 'spellcastingEntry')
                throw new Error('Tried to toggle prepared spells on a non-spellcasting entry');
            const bool = !(itemToEdit.data.showUnpreparedSpells || {}).value;

            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.showUnpreparedSpells.value': bool,
            });
        });

        html.find('.level-prepared-toggle').click(async (event) => {
            event.preventDefault();

            const parentNode = $(event.currentTarget).parents('.spellbook-header');
            const itemId = parentNode.attr('data-item-id');
            const lvl = parentNode.attr('data-level');
            const itemToEdit = this.actor.getOwnedItem(itemId).data;
            if (itemToEdit.type !== 'spellcastingEntry')
                throw new Error('Tried to toggle prepared spells on a non-spellcasting entry');
            const currentDisplayLevels = itemToEdit.data.displayLevels || {};
            currentDisplayLevels[lvl] = !currentDisplayLevels[lvl];
            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.displayLevels': currentDisplayLevels,
            });
            this.render();
        });

        // Select all text in an input field on focus
        html.find('input[type=text], input[type=number]').focus((event: any) => {
            event.currentTarget.select();
        });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle cycling of dying
     * @private
     */
    _onClickDying(event) {
        event.preventDefault();
        const field = $(event.currentTarget).siblings('input[type="hidden"]');
        const maxDying = this.object.data.data.attributes.dying.max;
        // const wounded = this.object.data.data.attributes.wounded.value;
        const wounded = 0; // Don't automate wounded when clicking on dying until dying is also automated on damage from chat and Recovery rolls
        const doomed = this.object.data.data.attributes.doomed.value;

        // Get the current level and the array of levels
        const level = parseFloat(`${field.val()}`);
        let newLevel;

        // Toggle next level - forward on click, backwards on right
        if (event.type === 'click') {
            newLevel = Math.clamped(level + 1 + wounded, 0, maxDying);
            if (newLevel + doomed >= maxDying) newLevel = maxDying;
        } else if (event.type === 'contextmenu') {
            newLevel = Math.clamped(level - 1, 0, maxDying);
            if (newLevel + doomed >= maxDying) newLevel -= doomed;
        }

        // Update the field value and save the form
        field.val(newLevel);
        this._onSubmit(event);
    }

    /**
     * Handle clicking of stat levels. The max level is by default 4.
     * The max level can be set in the hidden input field with a data-max attribute. Eg: data-max="3"
     * @private
     */
    _onClickStatLevel(event) {
        event.preventDefault();
        const field = $(event.currentTarget).siblings('input[type="hidden"]');
        const max = field.data('max') ?? 4;
        const { statType, category } = field.data();
        if (this.actor.getFlag('pf2e', 'proficiencyLock') && category === 'proficiency') return;

        // Get the current level and the array of levels
        const level = parseFloat(`${field.val()}`);
        let newLevel;

        // Toggle next level - forward on click, backwards on right
        if (event.type === 'click') {
            newLevel = Math.clamped(level + 1, 0, max);
        } else if (event.type === 'contextmenu') {
            newLevel = Math.clamped(level - 1, 0, max);
        }
        // Update the field value and save the form

        if (statType === 'item') {
            let itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            if (itemId === undefined) {
                // Then item is spellcastingEntry, this could be refactored
                // but data-contained-id and proviciency/proficient need to be refactored everywhere to give
                // Lore Skills, Martial Skills and Spellcasting Entries the same structure.

                itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
                if (category === 'focus') {
                    const item = this.actor.getOwnedItem(itemId);
                    const focusPoolSize = getProperty(item.data, 'data.focus.pool') || 1;
                    newLevel = Math.clamped(newLevel, 0, focusPoolSize);
                    this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.focus.points': newLevel });
                } else {
                    this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.proficiency.value': newLevel });
                }
            } else {
                this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.proficient.value': newLevel });
            }
            return;
        }
        field.val(newLevel);
        this._onSubmit(event);
    }

    /* -------------------------------------------- */

    _onDragItemStart(event: any): boolean {
        event.stopImmediatePropagation();

        const itemId = event.currentTarget.getAttribute('data-item-id');
        const containerId = event.currentTarget.getAttribute('data-container-id');
        const actionIndex = event.currentTarget.getAttribute('data-action-index');

        if (itemId || containerId) {
            const item = this.actor.getOwnedItem(itemId || containerId);
            event.dataTransfer.setData(
                'text/plain',
                JSON.stringify({
                    type: 'Item',
                    data: item.data,
                    actorId: this.actor._id,
                    tokenId: this.actor.token?.id,
                    id: itemId,
                }),
            );

            return true;
        } else if (actionIndex) {
            event.dataTransfer.setData(
                'text/plain',
                JSON.stringify({
                    type: 'Action',
                    index: actionIndex,
                    actorId: this.actor._id,
                }),
            );

            return true;
        }
        return false;
    }

    _onDragSkillStart(event: any): boolean {
        const skill = event.currentTarget.getAttribute('data-skill');

        if (skill) {
            const skillName = $(event.currentTarget).find('.skill-name').text();
            event.dataTransfer.setData(
                'text/plain',
                JSON.stringify({
                    type: 'Skill',
                    skill,
                    skillName,
                    actorId: this.actor._id,
                }),
            );

            return true;
        }
        return false;
    }

    _onDragToggleStart(event: any): boolean {
        const property = event.currentTarget.getAttribute('data-toggle-property');
        const label = event.currentTarget.getAttribute('data-toggle-label');
        if (property) {
            event.dataTransfer.setData(
                'text/plain',
                JSON.stringify({
                    type: 'Toggle',
                    property,
                    label,
                    actorId: this.actor._id,
                }),
            );
            return true;
        }
        return false;
    }

    /* -------------------------------------------- */

    /**
     * Handle a drop event for an existing Owned Item to sort that item
     * @param {Event} event
     * @param {Object} itemData
     * @private
     */
    async _onSortItem(event, itemData) {
        const dropSlotType = $(event.target).parents('.item').attr('data-item-type');
        const dropContainerType = $(event.target).parents('.item-container').attr('data-container-type');

        // if they are dragging onto another spell, it's just sorting the spells
        // or moving it from one spellcastingEntry to another
        if (itemData.type === 'spell') {
            if (dropSlotType === 'spell') {
                const sourceId = itemData._id;
                const dropId = $(event.target).parents('.item').attr('data-item-id');
                if (sourceId !== dropId) {
                    const source: any = this.actor.getOwnedItem(sourceId);
                    const sourceLevel = source.data.data.level.value;
                    const sourceLocation = source.data.data.location.value;
                    const target: any = this.actor.getOwnedItem(dropId);
                    const targetLevel = target.data.data.level.value;
                    const targetLocation = target.data.data.location.value;

                    if (sourceLevel === targetLevel && sourceLocation === targetLocation) {
                        const siblings: any[] = (this.actor as any).items.entries.filter(
                            (i: PF2EItem) =>
                                i.data.type === 'spell' &&
                                i.data.data.level.value === sourceLevel &&
                                i.data.data.location.value === sourceLocation,
                        );
                        const sortBefore = source.data.sort >= target.data.sort;
                        source.sortRelative({ target, siblings, sortBefore });
                    }
                }
            } else if (dropSlotType === 'spellSlot') {
                if (CONFIG.debug.hooks === true) console.log('PF2e DEBUG | ***** spell dropped on a spellSlot *****');
                const dropID = $(event.target).parents('.item').attr('data-item-id');
                const spellLvl = Number($(event.target).parents('.item').attr('data-spell-lvl'));
                const entryId = $(event.target).parents('.item').attr('data-entry-id');

                return this._allocatePreparedSpellSlot(spellLvl, dropID, itemData, entryId);
            } else if (dropContainerType === 'spellcastingEntry') {
                // if the drop container target is a spellcastingEntry then check if the item is a spell and if so update its location.
                // if the dragged item is a spell and is from the same actor
                if (CONFIG.debug.hooks === true)
                    console.log('PF2e DEBUG | ***** spell from same actor dropped on a spellcasting entry *****');

                const dropID = $(event.target).parents('.item-container').attr('data-container-id');

                if (dropID) {
                    itemData.data.location = { value: dropID };
                    return this.actor.updateEmbeddedEntity('OwnedItem', itemData);
                }
            }
        } else if (itemData.type === 'spellcastingEntry') {
            // target and source are spellcastingEntries and need to be sorted
            if (dropContainerType === 'spellcastingEntry') {
                const sourceId = itemData._id;
                const dropId = $(event.target).parents('.item-container').attr('data-container-id');

                if (sourceId !== dropId) {
                    const source: any = this.actor.getOwnedItem(sourceId);
                    const target: any = this.actor.getOwnedItem(dropId);
                    const siblings: any[] = (this.actor as any).items.entries.filter(
                        (i: PF2EItem) => i.data.type === 'spellcastingEntry',
                    );

                    if (source && target) {
                        const sortBefore = source.data.sort >= target.data.sort;
                        return source.sortRelative({ target, siblings, sortBefore });
                    }
                }
            }
        }

        const container = $(event.target).parents('[data-item-is-container="true"]');
        let containerId = null;
        if (container[0] !== undefined) {
            containerId = container[0].dataset.itemId?.trim();
        }
        await PF2EActor.stashOrUnstash(
            this.actor,
            async () => this.actor.getOwnedItem(itemData._id) as PF2EPhysicalItem,
            containerId,
        );
        return super._onSortItem(event, itemData);
    }

    async _onDropItemCreate(itemData: ItemData): Promise<ItemData> {
        if (itemData.type === 'ancestry' || itemData.type === 'background' || itemData.type === 'class') {
            // ignore these. they should get handled in the derived class
            ui.notifications.error(game.i18n.localize('PF2E.ItemNotSupportedOnActor'));
            return null;
        }
        return super._onDropItemCreate(itemData);
    }

    async onDropItem(data) {
        return await this._onDropItem({ preventDefault() {} }, data);
    }

    /**
     * Extend the base _onDrop method to handle dragging spells onto spell slots.
     * @private
     */
    protected async _onDropItem(event, data) {
        event.preventDefault();

        const item = await PF2EItem.fromDropData(data);
        const itemData = duplicate(item.data);

        const actor = this.actor;
        const isSameActor = data.actorId === actor._id || (actor.isToken && data.tokenId === actor.token.id);
        if (isSameActor) return this._onSortItem(event, itemData);

        if (data.actorId && isPhysicalItem(itemData)) {
            return this.moveItemBetweenActors(event, data.actorId, data.tokenId, actor._id, actor.token?.id, data.id);
        }

        // get the item type of the drop target
        const dropSlotType = $(event.target).parents('.item').addBack().attr('data-item-type');
        const dropContainerType = $(event.target).parents('.item-container').attr('data-container-type');

        // otherwise they are dragging a new spell onto their sheet.
        // we still need to put it in the correct spellcastingEntry
        if (itemData.type === 'spell') {
            if (dropSlotType === 'spellSlot' || dropContainerType === 'spellcastingEntry') {
                const dropID = $(event.target).parents('.item-container').attr('data-container-id');
                itemData.data.location = { value: dropID };
                this.actor._setShowUnpreparedSpells(dropID, itemData.data.level?.value);
                return this.actor.createEmbeddedEntity('OwnedItem', itemData);
            } else if (dropContainerType === 'actorInventory' && itemData.data.level.value > 0) {
                const popup = new ScrollWandPopup(this.actor, {}, async (heightenedLevel, itemType, spellData) => {
                    if (itemType === 'scroll') {
                        const item = await scrollFromSpell(itemData, heightenedLevel);
                        return this._onDropItemCreate(item);
                    } else if (itemType === 'wand') {
                        const item = await wandFromSpell(itemData, heightenedLevel);
                        return this._onDropItemCreate(item);
                    }
                });
                popup.spellData = itemData;
                popup.render(true);
                return true;
            } else {
                return false;
            }
        } else if (itemData.type === 'spellcastingEntry') {
            // spellcastingEntry can only be created. drag & drop between actors not allowed
            return false;
        } else if (itemData.type === 'kit') {
            await addKit(itemData, async (newItems) => {
                const items = await actor.createOwnedItem(newItems);
                if (Array.isArray(items)) {
                    return items.map((i) => i._id);
                }
                return [items._id];
            });
            return true;
        } else if (itemData.type === 'condition' && itemData.flags.pf2e?.condition) {
            const condition = itemData as ConditionData;
            const token = actor.token
                ? actor.token
                : canvas.tokens.controlled.find((canvasToken) => canvasToken.actor.id === actor.id);

            if (token) {
                await PF2eConditionManager.addConditionToToken(condition, token);
                return true;
            } else {
                ui.notifications.error('You do not control this actor.');
                return false;
            }
        }

        if (isPhysicalItem(itemData)) {
            const container = $(event.target).parents('[data-item-is-container="true"]');
            let containerId = null;
            if (container[0] !== undefined) {
                containerId = container[0].dataset.itemId?.trim();
            }
            itemData.data.containerId.value = containerId || '';
        }
        return this._onDropItemCreate(itemData);
    }

    /**
     * Moves an item between two actors' inventories.
     * @param {event} event         Event that fired this method.
     * @param {actor} sourceActorId ID of the actor who originally owns the item.
     * @param {actor} targetActorId ID of the actor where the item will be stored.
     * @param {id} itemId           ID of the item to move between the two actors.
     */
    async moveItemBetweenActors(event, sourceActorId, sourceTokenId, targetActorId, targetTokenId, itemId) {
        const sourceActor = sourceTokenId ? game.actors.tokens[sourceTokenId] : game.actors.get(sourceActorId);
        const targetActor = targetTokenId ? game.actors.tokens[targetTokenId] : game.actors.get(targetActorId);
        const item = sourceActor.getOwnedItem(itemId);

        const container = $(event.target).parents('[data-item-is-container="true"]');
        let containerId = null;
        if (container[0] !== undefined) {
            containerId = container[0].dataset.itemId?.trim();
        }

        const sourceItemQuantity = 'quantity' in item.data.data ? Number(item.data.data.quantity.value) : 0;

        // If more than one item can be moved, show a popup to ask how many to move
        if (sourceItemQuantity > 1) {
            const popup = new MoveLootPopup(sourceActor, {}, (quantity) => {
                console.log(`Accepted moving ${quantity} items`);
                sourceActor.transferItemToActor(targetActor, item, quantity, containerId);
            });

            popup.render(true);
        } else {
            sourceActor.transferItemToActor(targetActor, item, 1, containerId);
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
     * @private
     */
    _onItemRoll(event: JQuery.ClickEvent) {
        event.preventDefault();
        const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
        const item = this.actor.getOwnedItem(itemId);
        if (item instanceof PF2EPhysicalItem && !item.isIdentified) {
            // we don't want to show the item card for items that aren't identified
            return;
        }

        item.roll(event);
    }

    /* -------------------------------------------- */

    /**
     * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
     * @private
     */
    _onItemSummary(event: JQuery.ClickEvent) {
        event.preventDefault();

        const li = $(event.currentTarget).parent().parent();
        const itemId = li.attr('data-item-id');
        const itemType = li.attr('data-item-type');
        let item: PF2EItem;

        if (itemType === 'spellSlot') return;

        try {
            item = this.actor.getOwnedItem(itemId);
            if (!item.type) return;
        } catch (err) {
            return;
        }

        if (item.data.type === 'spellcastingEntry' || item.data.type === 'condition') return;

        const chatData = item.getChatData({ secrets: this.actor.owner });

        if (
            game.user.isGM ||
            !(item instanceof PF2EPhysicalItem) ||
            (item instanceof PF2EPhysicalItem && item.isIdentified)
        ) {
            this._renderItemSummary(li, item, chatData);
        }
    }

    _renderItemSummary(li, item, chatData) {
        const localize = game.i18n.localize.bind(game.i18n);

        // Toggle summary
        if (li.hasClass('expanded')) {
            const summary = li.children('.item-summary');
            summary.slideUp(200, () => summary.remove());
        } else {
            const div = $(
                `<div class="item-summary"><div class="item-description">${chatData.description.value}</div></div>`,
            );
            const props = $('<div class="item-properties tags"></div>');
            if (chatData.properties) {
                chatData.properties
                    .filter((p) => typeof p === 'string')
                    .forEach((p) => {
                        props.append(`<span class="tag tag_secondary">${localize(p)}</span>`);
                    });
            }
            if (chatData.critSpecialization)
                props.append(
                    `<span class="tag" title="${localize(
                        chatData.critSpecialization.description,
                    )}" style="background: rgb(69,74,124); color: white;">${localize(
                        chatData.critSpecialization.label,
                    )}</span>`,
                );
            // append traits (only style the tags if they contain description data)
            if (chatData.traits && chatData.traits.length) {
                chatData.traits.forEach((p) => {
                    if (p.description)
                        props.append(
                            `<span class="tag tag_alt" title="${localize(p.description)}">${localize(p.label)}</span>`,
                        );
                    else props.append(`<span class="tag">${localize(p.label)}</span>`);
                });
            }

            div.append(props);
            li.append(div.hide());
            div.slideDown(200);
        }
        li.toggleClass('expanded');
    }

    /* -------------------------------------------- */

    /**
     * Opens an item container
     */
    _toggleContainer(event) {
        const itemId = $(event.currentTarget).parents('.item').data('item-id');
        const item = this.actor.getOwnedItem(itemId);
        if (item === null || item.data.type !== 'backpack') {
            return;
        }

        const isCollapsed = item?.data?.data?.collapsed?.value ?? false;
        item.update({ 'data.collapsed.value': !isCollapsed });
    }

    /**
     * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
     * @private
     */
    _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const data = duplicate(header.dataset);

        if (data.type === 'feat') {
            const featTypeString = game.i18n.localize(`PF2E.FeatType${data.featType.capitalize()}`);
            data.name = `${game.i18n.localize('PF2E.NewLabel')} ${featTypeString}`;
            mergeObject(data, { 'data.featType.value': data.featType });
        } else if (data.type === 'action') {
            const newLabel = game.i18n.localize('PF2E.NewLabel');
            const actionTypeLabel = game.i18n.localize(`PF2E.ActionType${data.actionType.capitalize()}`);
            data.name = `${newLabel} ${actionTypeLabel}`;
            mergeObject(data, { 'data.actionType.value': data.actionType });
        } else if (data.type === 'melee') {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
            mergeObject(data, { 'data.weaponType.value': data.actionType });
        } else if (data.type === 'spell') {
            // for prepared spellcasting entries, set showUnpreparedSpells to true to avoid the confusion of nothing appearing to happen.
            this.actor._setShowUnpreparedSpells(data.location, data.level);

            const newLabel = game.i18n.localize('PF2E.NewLabel');
            const spellLevel = game.i18n.localize(`PF2E.SpellLevel${data.level}`);
            const spellLabel = data.level > 0 ? game.i18n.localize('PF2E.SpellLabel') : '';
            data.name = `${newLabel} ${spellLevel} ${spellLabel}`;
            mergeObject(data, {
                'data.level.value': data.level,
                'data.location.value': data.location,
            });
            // Show the spellbook pages if you're adding a new spell
            const currentLvlToDisplay = {};
            currentLvlToDisplay[data.level] = true;
            this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: data.location,
                'data.showUnpreparedSpells.value': true,
                'data.displayLevels': currentLvlToDisplay,
            });
        } else if (data.type === 'lore') {
            if (this.actorType === 'npc') {
                data.name = game.i18n.localize('PF2E.SkillLabel');
                data.img = '/icons/svg/d20-black.svg';
            } else data.name = game.i18n.localize('PF2E.NewPlaceholders.Lore');
        } else {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
        }
        // this.actor.createOwnedItem(data, {renderSheet: true});
        this.actor.createEmbeddedEntity('OwnedItem', data);
    }

    /* -------------------------------------------- */

    /**
     * Handle creating a new spellcasting entry for the actor
     * @private
     */

    _createSpellcastingEntry(event: JQuery.ClickEvent) {
        event.preventDefault();

        // let entries = this.actor.data.data.attributes.spellcasting.entry || {};

        let magicTradition = 'arcane';
        let spellcastingType = 'innate';

        // Render modal dialog
        const template = 'systems/pf2e/templates/actors/spellcasting-dialog.html';
        const title = game.i18n.localize('PF2E.SpellcastingTypeLabel');
        const dialogOptions = {
            width: 300,
            top: event.clientY - 80,
            left: window.innerWidth - 710,
        };
        const dialogData = {
            magicTradition,
            magicTraditions: CONFIG.PF2E.magicTraditions,
            spellcastingType,
            spellcastingTypes: CONFIG.PF2E.preparationType,
        };
        renderTemplate(template, dialogData).then((dlg) => {
            new Dialog(
                {
                    title,
                    content: dlg,
                    buttons: {
                        create: {
                            label: game.i18n.localize('PF2E.CreateLabelUniversal'),
                            callback: (html: JQuery) => {
                                // if ( onClose ) onClose(html, parts, data);
                                let name = '';
                                magicTradition = `${html.find('[name="magicTradition"]').val()}`;
                                if (magicTradition === 'ritual') {
                                    spellcastingType = '';
                                    name = `${CONFIG.PF2E.magicTraditions[magicTradition]}s`;
                                } else if (magicTradition === 'focus') {
                                    spellcastingType = '';
                                    name = `${CONFIG.PF2E.magicTraditions[magicTradition]} Spells`;
                                } else if (magicTradition === 'scroll') {
                                    spellcastingType = '';
                                    name = `${CONFIG.PF2E.magicTraditions[magicTradition]}`;
                                } else if (magicTradition === 'wand') {
                                    spellcastingType = 'prepared';
                                    name = `${CONFIG.PF2E.magicTraditions[magicTradition]}`;
                                } else {
                                    spellcastingType = `${html.find('[name="spellcastingType"]').val()}`;
                                    name = `${CONFIG.PF2E.preparationType[spellcastingType]} ${CONFIG.PF2E.magicTraditions[magicTradition]} Spells`;
                                }

                                // Define new spellcasting entry
                                const spellcastingEntity = {
                                    ability: {
                                        type: 'String',
                                        label: 'Spellcasting Ability',
                                        value: '',
                                    },
                                    spelldc: {
                                        type: 'String',
                                        label: 'Class DC',
                                        item: 0,
                                    },
                                    tradition: {
                                        type: 'String',
                                        label: 'Magic Tradition',
                                        value: magicTradition,
                                    },
                                    prepared: {
                                        type: 'String',
                                        label: 'Spellcasting Type',
                                        value: spellcastingType,
                                    },
                                    showUnpreparedSpells: { value: true },
                                };

                                const data = {
                                    name,
                                    type: 'spellcastingEntry',
                                    data: spellcastingEntity,
                                };

                                this.actor.createEmbeddedEntity('OwnedItem', (data as unknown) as ItemData);
                            },
                        },
                    },
                    default: 'create',
                },
                dialogOptions,
            ).render(true);
        });
    }

    /* -------------------------------------------- */

    /**
     * Handle removing an existing spellcasting entry for the actor
     * @private
     */

    _removeSpellcastingEntry(event) {
        event.preventDefault();

        const li = $(event.currentTarget).parents('.item');
        const itemId = li.attr('data-container-id');
        const item = this.actor.getOwnedItem(itemId);

        // Render confirmation modal dialog
        renderTemplate('systems/pf2e/templates/actors/delete-spellcasting-dialog.html').then((html) => {
            new Dialog({
                title: 'Delete Confirmation',
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: async () => {
                            console.log('PF2e | Deleting Spell Container: ', item.name);
                            // Delete all child objects
                            const itemsToDelete = [];
                            for (const i of this.actor.data.items) {
                                if (i.type === 'spell') {
                                    if (i.data.location.value === itemId) {
                                        itemsToDelete.push(i._id);
                                    }
                                }
                            }

                            await this.actor.deleteOwnedItem(itemsToDelete);

                            // Delete item container
                            await this.actor.deleteOwnedItem(itemId);
                            li.slideUp(200, () => this.render(false));
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        });
    }

    /* -------------------------------------------- */
    _onAddCoinsPopup(event) {
        event.preventDefault();
        new AddCoinsPopup(this.actor, {}).render(true);
    }

    _onRemoveCoinsPopup(event) {
        event.preventDefault();
        new RemoveCoinsPopup(this.actor, {}).render(true);
    }

    _onSellAllTreasure(event) {
        event.preventDefault();
        // Render confirmation modal dialog
        renderTemplate('systems/pf2e/templates/actors/sell-all-treasure-dialog.html').then((html) => {
            new Dialog({
                title: game.i18n.localize('PF2E.SellAllTreasureTitle'),
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: async () => {
                            console.log('PF2e | Selling all treasure: ', this.actor);
                            sellAllTreasureSimple(this.actor);
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        });
    }

    _onTraitSelector(event) {
        event.preventDefault();
        const a = $(event.currentTarget);
        const options = {
            name: a.parents('label').attr('for'),
            title: a.parent().text().trim(),
            choices: CONFIG.PF2E[a.attr('data-options')],
            has_values: a.attr('data-has-values') === 'true',
            allow_empty_values: a.attr('data-allow-empty-values') === 'true',
            has_exceptions: a.attr('data-has-exceptions') === 'true',
        };
        new TraitSelector5e(this.actor, options).render(true);
    }

    _onCrbTraitSelector(event) {
        event.preventDefault();
        const a = $(event.currentTarget);
        const options = {
            name: a.parents('li').attr('for'),
            title: a.parent().parent().siblings('h4').text().trim(),
            choices: CONFIG.PF2E[a.attr('data-options')],
            has_values: a.attr('data-has-values') === 'true',
            allow_empty_values: a.attr('data-allow-empty-values') === 'true',
            has_exceptions: a.attr('data-has-exceptions') === 'true',
        };
        new TraitSelector5e(this.actor, options).render(true);
    }

    _onAreaEffect(event) {
        const areaType = $(event.currentTarget).attr('data-area-areaType');
        const areaSize = Number($(event.currentTarget).attr('data-area-size'));

        let tool = 'cone';
        if (areaType === 'burst') tool = 'circle';
        else if (areaType === 'emanation') tool = 'rect';
        else if (areaType === 'line') tool = 'ray';

        // Delete any existing templates for this actor.
        let templateData = this.actor.getFlag('pf2e', 'areaEffectId') || null;
        let templateScene = null;
        if (templateData) {
            templateScene = this.actor.getFlag('pf2e', 'areaEffectScene') || null;
            this.actor.setFlag('pf2e', 'areaEffectId', null);
            this.actor.setFlag('pf2e', 'areaEffectScene', null);

            console.log(`PF2e | Existing MeasuredTemplate ${templateData.id} from Scene ${templateScene} found`);
            if (canvas.templates.objects.children) {
                for (const placeable of canvas.templates.objects.children) {
                    console.log(
                        `PF2e | Placeable Found - id: ${placeable.data._id}, scene: ${canvas.scene._id}, type: ${placeable.constructor.name}`,
                    );
                    if (
                        placeable.data._id === templateData.id &&
                        canvas.scene._id === templateScene &&
                        placeable.constructor.name === 'MeasuredTemplate'
                    ) {
                        console.log(`PF2e | Deleting MeasuredTemplate ${templateData.id} from Scene ${templateScene}`);

                        const existingTemplate = new MeasuredTemplate(templateData, templateScene);
                        existingTemplate.delete(templateScene);
                    }
                }
            }
        }

        // data to pull in dynamically
        let x;
        let y;

        let data = {};
        const gridWidth = canvas.grid.grid.w;

        if (areaType === 'emanation' || areaType === 'cone') {
            if (canvas.tokens.controlled.length > 1) {
                ui.notifications.info('Please select a single target token');
            } else if (canvas.tokens.controlled.length === 0) {
                ui.notifications.info('Please select a target token');
            } else {
                const t = canvas.tokens.controlled[0];
                let { rotation } = t.data;
                const { width } = t.data;

                x = t.data.x;
                y = t.data.y;

                // Cone placement logic
                if (tool === 'cone') {
                    if (rotation < 0) rotation = 360 + rotation;
                    if (rotation < 35) {
                        x += gridWidth / 2;
                        y += gridWidth;
                    } else if (rotation < 55) {
                        y += gridWidth;
                    } else if (rotation < 125) {
                        y += gridWidth / 2;
                    } else if (rotation < 145) {
                        // y = y;
                    } else if (rotation < 215) {
                        x += gridWidth / 2;
                    } else if (rotation < 235) {
                        x += gridWidth;
                    } else if (rotation < 305) {
                        x += gridWidth;
                        y += gridWidth / 2;
                    } else if (rotation < 325) {
                        x += gridWidth;
                        y += gridWidth;
                    } else {
                        x += gridWidth / 2;
                        y += gridWidth;
                    }
                    rotation += 90;

                    data = {
                        t: tool,
                        x,
                        y,
                        distance: areaSize,
                        direction: rotation,
                        fillColor: game.user.data.color || '#FF0000',
                    };
                } else if (tool === 'rect') {
                    x -= gridWidth * (areaSize / 5);
                    y -= gridWidth * (areaSize / 5);
                    rotation = 45;

                    const rectSide = areaSize + width * 5 + areaSize;
                    const distance = Math.sqrt(rectSide ** 2 + rectSide ** 2);
                    data = {
                        t: tool,
                        x,
                        y,
                        distance,
                        direction: rotation,
                        fillColor: game.user.data.color || '#FF0000',
                    };
                }

                // Create the template
                MeasuredTemplate.create(canvas.scene, data).then((results) => {
                    templateData = results.data;

                    // Save MeasuredTemplate information to actor flags
                    this.actor.setFlag('pf2e', 'areaEffectId', templateData);
                    this.actor.setFlag('pf2e', 'areaEffectScene', canvas.scene._id);
                });
            }
        }
    }

    _onSubmit(event: any): Promise<any> {
        // Limit HP value to data.attributes.hp.max value
        if (event?.currentTarget?.name === 'data.attributes.hp.value') {
            event.currentTarget.value = Math.clamped(
                Number(event.currentTarget.value),
                Number(this.actor.data.data.attributes.hp?.min ?? 0),
                Number(this.actor.data.data.attributes.hp?.max ?? 0),
            );
        }

        return super._onSubmit(event);
    }

    /**
     * Always submit on a form field change. Added because tabbing between fields
     * wasn't working.
     */
    _onChangeInput(event) {
        this._onSubmit(event);
    }
}
