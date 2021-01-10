/* global game, CONFIG */
import { ActorSheetPF2eCreature } from './creature';
import { PF2EActor, SKILL_DICTIONARY } from '../actor';
import { identifyCreature } from '../../recall-knowledge';
import { RecallKnowledgePopup } from './RecallKnowledgePopup';

/**
 * @category Actor
 */
export class ActorSheetPF2eNPC extends ActorSheetPF2eCreature {
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat(['pf2e', 'actor', 'npc-sheet']),
            width: 650,
            height: 680,
            showUnpreparedSpells: true,
        });
        return options;
    }

    /* -------------------------------------------- */

    /**
     * Get the correct HTML template path to use for rendering this particular sheet
     * @type {String}
     */
    get template() {
        const path = 'systems/pf2e/templates/actors/';
        return `${path}npc-sheet.html`;
        /*     if ( !game.user.isGM && this.actor.limited ) return path + "limited-sheet.html";
    return path + "npc-sheet.html"; */
    }

    /* -------------------------------------------- */

    /**
     * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
     */
    getData() {
        const sheetData = super.getData();

        sheetData.monsterTraits = CONFIG.PF2E.monsterTraits;

        // recall knowledge DCs
        const proficiencyWithoutLevel = game.settings.get('pf2e', 'proficiencyVariant') === 'ProficiencyWithoutLevel';
        const identifyCreatureData = identifyCreature(sheetData, { proficiencyWithoutLevel });

        sheetData.identifyCreatureData = identifyCreatureData;
        sheetData.identifySkillDC = identifyCreatureData.skill.dc;
        sheetData.identifySkillAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.skill.start];
        sheetData.identifySkillProgression = identifyCreatureData.skill.progression.join('/');
        sheetData.identificationSkills = Array.from(identifyCreatureData.skills)
            .sort()
            .map((skillAcronym) => CONFIG.PF2E.skills[skillAcronym]);
        sheetData.identificationSkillList = sheetData.identificationSkills.join(', ');

        sheetData.specificLoreDC = identifyCreatureData.specificLoreDC.dc;
        sheetData.specificLoreAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.specificLoreDC.start];
        sheetData.specificLoreProgression = identifyCreatureData.specificLoreDC.progression.join('/');

        sheetData.unspecificLoreDC = identifyCreatureData.unspecificLoreDC.dc;
        sheetData.unspecificLoreAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.unspecificLoreDC.start];
        sheetData.unspecificLoreProgression = identifyCreatureData.unspecificLoreDC.progression.join('/');

        // Return data for rendering
        return sheetData;
    }

    /* -------------------------------------------- */

    /**
     * Organize and classify Items for NPC sheets
     * @private
     */
    _prepareItems(actorData) {
        // Actions
        const attacks = {
            melee: { label: 'NPC Melee Attack', prefix: 'PF2E.NPCAttackMelee', items: [], type: 'melee' },
            ranged: { label: 'NPC Ranged Attack', prefix: 'PF2E.NPCAttackRanged', items: [], type: 'melee' },
        };

        // Actions
        const actions = {
            action: { label: 'Actions', actions: [] },
            reaction: { label: 'Reactions', actions: [] },
            free: { label: 'Free Actions', actions: [] },
            passive: { label: 'Passive Actions', actions: [] },
        };

        // Spellbook
        // const spellbook = {};
        const tempSpellbook = [];
        const spellcastingEntriesList = [];
        const spellbooks: any = [];
        spellbooks.unassigned = {};

        // Spellcasting Entries
        const spellcastingEntries = [];

        // Skills
        const lores = [];

        // Iterate through items, allocating to containers
        for (const i of actorData.items) {
            i.img = i.img || CONST.DEFAULT_TOKEN;

            // Spells
            if (i.type === 'spell') {
                tempSpellbook.push(i);
            }

            // Spellcasting Entries
            else if (i.type === 'spellcastingEntry') {
                // collect list of entries to use later to match spells against.
                spellcastingEntriesList.push(i._id);

                if ((i.data.prepared || {}).value === 'prepared') i.data.prepared.preparedSpells = true;
                else i.data.prepared.preparedSpells = false;
                // Check if Ritual spellcasting tradtion and set Boolean
                if ((i.data.tradition || {}).value === 'ritual') i.data.tradition.ritual = true;
                else i.data.tradition.ritual = false;

                spellcastingEntries.push(i);
            }

            // Weapons
            else if (i.type === 'weapon') {
                // we don't want to do anything if they're a weapon. They should be using the melee attacks
            }

            // NPC Generic Attacks
            else if (i.type === 'melee') {
                const weaponType = (i.data.weaponType || {}).value || 'melee';
                const isAgile = (i.data.traits.value || []).includes('agile');
                i.data.bonus.total = parseInt(i.data.bonus.value, 10) || 0;
                i.data.isAgile = isAgile;

                // get formated traits for read-only npc sheet
                const traits = [];
                if ((i.data.traits.value || []).length !== 0) {
                    for (let j = 0; j < i.data.traits.value.length; j++) {
                        const traitsObject = {
                            label:
                                CONFIG.PF2E.weaponTraits[i.data.traits.value[j]] ||
                                i.data.traits.value[j].charAt(0).toUpperCase() + i.data.traits.value[j].slice(1),
                            description: CONFIG.PF2E.traitsDescriptions[i.data.traits.value[j]] || '',
                        };
                        traits.push(traitsObject);
                    }
                }
                i.traits = traits.filter((p) => !!p);

                attacks[weaponType].items.push(i);
            }

            // Actions
            else if (i.type === 'action') {
                const actionType = i.data.actionType.value || 'action';
                i.img = PF2EActor.getActionGraphics(
                    actionType,
                    parseInt((i.data.actions || {}).value, 10) || 1,
                ).imageUrl;

                // get formated traits for read-only npc sheet
                const traits = [];
                if ((i.data.traits.value || []).length !== 0) {
                    for (let j = 0; j < i.data.traits.value.length; j++) {
                        const traitsObject = {
                            label:
                                CONFIG.PF2E.weaponTraits[i.data.traits.value[j]] ||
                                i.data.traits.value[j].charAt(0).toUpperCase() + i.data.traits.value[j].slice(1),
                            description: CONFIG.PF2E.traitsDescriptions[i.data.traits.value[j]] || '',
                        };
                        traits.push(traitsObject);
                    }
                }
                if (i.data.actionType.value) {
                    traits.push({
                        label:
                            CONFIG.PF2E.weaponTraits[i.data.actionType.value] ||
                            i.data.actionType.value.charAt(0).toUpperCase() + i.data.actionType.value.slice(1),
                        description: CONFIG.PF2E.traitsDescriptions[i.data.actionType.value] || '',
                    });
                }
                i.traits = traits.filter((p) => !!p);

                actions[actionType].actions.push(i);
            }

            // Feats
            else if (i.type === 'feat') {
                const actionType = i.data.actionType.value || 'passive';

                if (Object.keys(actions).includes(actionType)) {
                    i.feat = true;
                    i.img = PF2EActor.getActionGraphics(
                        actionType,
                        parseInt((i.data.actions || {}).value, 10) || 1,
                    ).imageUrl;
                    actions[actionType].actions.push(i);
                }
            }

            // Lore Skills
            else if (i.type === 'lore') {
                lores.push(i);
            }
        }

        const embeddedEntityUpdate = [];

        // Iterate through all spells in the temp spellbook and check that they are assigned to a valid spellcasting entry. If not place in unassigned.
        for (const i of tempSpellbook) {
            const spellType = i.data.time.value;

            // format spell level for display
            if (spellType === 'reaction') i.img = PF2EActor.getActionGraphics('reaction').imageUrl;
            else if (spellType === 'free') i.img = PF2EActor.getActionGraphics('free').imageUrl;
            else if (parseInt(spellType, 10))
                i.img = PF2EActor.getActionGraphics('action', parseInt(spellType, 10)).imageUrl;

            // check if the spell has a valid spellcasting entry assigned to the location value.
            if (spellcastingEntriesList.includes(i.data.location.value)) {
                const location = i.data.location.value;
                spellbooks[location] = spellbooks[location] || {};
                this._prepareSpell(actorData, spellbooks[location], i);
            } else if (spellcastingEntriesList.length === 1) {
                // if not BUT their is only one spellcasting entry then assign the spell to this entry.
                const location = spellcastingEntriesList[0];
                spellbooks[location] = spellbooks[location] || {};

                // Update spell to perminantly have the correct ID now
                embeddedEntityUpdate.push({ _id: i._id, 'data.location.value': spellcastingEntriesList[0] });

                this._prepareSpell(actorData, spellbooks[location], i);
            } else {
                // else throw it in the orphaned list.
                this._prepareSpell(actorData, spellbooks.unassigned, i);
            }
        }

        // Update all embedded entities that have an incorrect location.
        if (embeddedEntityUpdate.length) {
            console.log(
                'PF2e System | Prepare Actor Data | Updating location for the following embedded entities: ',
                embeddedEntityUpdate,
            );
            this.actor.updateEmbeddedEntity('OwnedItem', embeddedEntityUpdate);
            ui.notifications.info(
                'PF2e actor data migration for orphaned spells applied. Please close actor and open again for changes to take affect.',
            );
        }

        // Assign and return
        actorData.actions = actions;
        actorData.attacks = attacks;
        actorData.lores = lores;

        if (Object.keys(spellbooks.unassigned).length) {
            actorData.orphanedSpells = true;
            actorData.orphanedSpellbook = spellbooks.unassigned;
        }

        for (const entry of spellcastingEntries) {
            if (entry.data.prepared.preparedSpells && spellbooks[entry._id]) {
                this._preparedSpellSlots(entry, spellbooks[entry._id]);
            }
            entry.spellbook = spellbooks[entry._id];
        }

        actorData.spellcastingEntries = spellcastingEntries;
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

        // NPC Weapon Rolling
        html.find('button:not(.recall-knowledge-breakdown)').click((ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
            // item = this.actor.items.find(i => { return i.id === itemId });
            const item = this.actor.getOwnedItem(itemId);

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (ev.target.dataset.action) {
                case 'weaponAttack':
                    item.rollWeaponAttack(ev);
                    break;
                case 'weaponAttack2':
                    item.rollWeaponAttack(ev, 2);
                    break;
                case 'weaponAttack3':
                    item.rollWeaponAttack(ev, 3);
                    break;
                case 'weaponDamage':
                    item.rollWeaponDamage(ev);
                    break;
                case 'weaponDamageCritical':
                    item.rollWeaponDamage(ev, true);
                    break;
                case 'npcAttack':
                    item.rollNPCAttack(ev);
                    break;
                case 'npcAttack2':
                    item.rollNPCAttack(ev, 2);
                    break;
                case 'npcAttack3':
                    item.rollNPCAttack(ev, 3);
                    break;
                case 'npcDamage':
                    item.rollNPCDamage(ev);
                    break;
                case 'npcDamageCritical':
                    item.rollNPCDamage(ev, true);
                    break;
                case 'spellAttack':
                    item.rollSpellAttack(ev);
                    break;
                case 'spellDamage':
                    item.rollSpellDamage(ev);
                    break;
                case 'consume':
                    item.rollConsumable(ev);
                    break;
                default:
                    throw new Error('Unknown action type');
            }
        });

        if (!this.options.editable) return;

        // NPC SKill Rolling
        html.find('.item .npc-skill-name').click((event) => {
            event.preventDefault();
            const shortform = $(event.currentTarget).parents('.item').attr('data-skill');
            const opts = this.actor.getRollOptions(['all', 'skill-check', SKILL_DICTIONARY[shortform] ?? shortform]);
            this.actor.data.data.skills[shortform]?.roll(event, opts); // eslint-disable-line no-unused-expressions
        });

        html.find('.skill-input').change(async (event) => {
            const itemId = event.target.attributes['data-item-id'].value;
            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.mod.value': Number(event.target.value),
            });
        });

        html.find('.spelldc-input').change(async (event) => {
            event.preventDefault();

            const li = $(event.currentTarget).parents('.item-container');
            const itemId = li.attr('data-container-id');
            const spelldcType = $(event.currentTarget).parents('.npc-defense').attr('data-spelldc-attribute');

            if (spelldcType === 'dc' || spelldcType === 'value') {
                const key = `data.spelldc.${spelldcType}`;
                const options = { _id: itemId };
                options[key] = Number(event.target.value);

                await this.actor.updateEmbeddedEntity('OwnedItem', options);
            }
        });

        html.find('.recall-knowledge-breakdown').on('click', (event) => {
            event.preventDefault();
            const { identifyCreatureData } = this.getData();
            new RecallKnowledgePopup(identifyCreatureData).render(true);
        });
    }
}
