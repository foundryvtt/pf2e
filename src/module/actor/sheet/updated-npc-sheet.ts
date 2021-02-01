import { ActorSheetPF2eNPC } from './npc';
import { DicePF2e } from '../../../scripts/dice';
import { PF2Modifier, PF2ModifierType } from '../../modifiers';
import { PF2EActor } from '../actor';

/**
 * @category Other
 */
export class UpdatedNPCActorPF2ESheet extends ActorSheetPF2eNPC {
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
        if (sheetData.flags.pf2e_updatednpcsheet.editNPC === undefined)
            sheetData.flags.pf2e_updatednpcsheet.editNPC = { value: false };
        if (sheetData.flags.pf2e_updatednpcsheet.allSaveDetail === undefined)
            sheetData.flags.pf2e_updatednpcsheet.allSaveDetail = { value: '' };

        // Elite or Weak adjustment
        sheetData.npcEliteActive = this.npcIsElite() ? ' active' : '';
        sheetData.npcWeakActive = this.npcIsWeak() ? ' active' : '';
        sheetData.npcEliteHidden = this.npcIsWeak() ? ' hidden' : '';
        sheetData.npcWeakHidden = this.npcIsElite() ? ' hidden' : '';

        // rarity
        sheetData.actorRarities = CONFIG.PF2E.rarityTraits;
        sheetData.actorRarity = sheetData.actorRarities[sheetData.data.traits.rarity.value];
        sheetData.isNotCommon = sheetData.data.traits.rarity.value !== 'common';
        // size
        sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];
        sheetData.actorTraits = (sheetData.data.traits.traits || {}).value;
        sheetData.actorAlignment = sheetData.data.details.alignment.value;
        sheetData.actorAttitudes = CONFIG.PF2E.attitude;
        sheetData.actorAttitude = sheetData.actorAttitudes[sheetData.data.traits.attitude?.value ?? 'indifferent'];
        // languages
        sheetData.hasLanguages = false;
        if (
            sheetData.data.traits.languages.value &&
            Array.isArray(sheetData.data.traits.languages.value) &&
            sheetData.actor.data.traits.languages.value.length > 0
        ) {
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
        sheetData.hasFortDetails =
            sheetData.data.saves.fortitude.saveDetail && sheetData.data.saves.fortitude.saveDetail !== '';
        // Reflex Details
        sheetData.hasRefDetails =
            sheetData.data.saves.reflex.saveDetail && sheetData.data.saves.reflex.saveDetail !== '';
        // Will Details
        sheetData.hasWillDetails = sheetData.data.saves.will.saveDetail && sheetData.data.saves.will.saveDetail !== '';
        // All Save Details
        sheetData.hasAllSaveDetails =
            (sheetData.data.attributes.allSaves || {}).value && (sheetData.data.attributes.allSaves || {}).value !== '';

        // Immunities check
        sheetData.hasImmunities = sheetData.data.traits.di.value.length ? sheetData.data.traits.di.value : false;
        // Resistances check
        sheetData.hasResistances = sheetData.data.traits.dr.length ? Array.isArray(sheetData.data.traits.dr) : false;
        // Weaknesses check
        sheetData.hasWeaknesses = sheetData.data.traits.dv.length ? Array.isArray(sheetData.data.traits.dv) : false;

        // Speed Details check
        if (sheetData.data.attributes.speed && sheetData.data.attributes.speed.otherSpeeds)
            sheetData.hasSpeedDetails = sheetData.data.attributes.speed.otherSpeeds.length
                ? sheetData.data.attributes.speed.otherSpeeds
                : false;

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
            if (
                i.type === 'weapon' ||
                i.type === 'armor' ||
                i.type === 'equipment' ||
                i.type === 'consumable' ||
                i.type === 'treasure'
            ) {
                // non-strict because `quantity.value` can be a string
                // eslint-disable-next-line eqeqeq
                if (i.data.quantity.value != 1) {
                    // `i` is a copy, so we can append the quantity to it without updating the original
                    i.name += ` (${i.data.quantity.value})`;
                }
                equipment.push(i);
                sheetData.hasEquipment = true;
            }
            // Actions
            else if (i.type === 'action') {
                const actionType = i.data.actionType.value || 'action';
                const actionCategory = i.data.actionCategory?.value || 'offensive';
                switch (actionCategory) {
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
            }
            // Give Melee/Ranged an img
            else if (i.type === 'melee' || i.type === 'ranged') {
                i.img = PF2EActor.getActionGraphics('action', 1).imageUrl;
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
    npcAdjustment(increase: boolean) {
        let actorData = duplicate(this.actor.data);
        const traits = getProperty(actorData.data, 'traits.traits.value') || [];
        let traitsAdjusted = false;
        let adjustBackToNormal = false;

        if (increase) {
            console.log(`PF2e System | Adjusting NPC to become more powerful`);

            // Adjusting trait
            for (const trait of traits) {
                if (trait === 'weak') {
                    // removing weak
                    const index = traits.indexOf(trait);
                    if (index > -1) traits.splice(index, 1);
                    traitsAdjusted = true;
                } else if (trait === 'elite') {
                    traitsAdjusted = true; // prevents to add another elite trait
                }
            }
            if (!traitsAdjusted) {
                traits.push('elite');
            } else {
                adjustBackToNormal = true;
            }
        } else {
            console.log(`PF2e System | Adjusting NPC to become less powerful`);

            // Adjusting trait
            for (const trait of traits) {
                if (trait === 'elite') {
                    // removing elite
                    const index = traits.indexOf(trait);
                    if (index > -1) traits.splice(index, 1);
                    traitsAdjusted = true;
                } else if (trait === 'weak') {
                    traitsAdjusted = true; // prevents to add another weak trait
                }
            }
            if (!traitsAdjusted) {
                traits.push('weak');
            } else {
                adjustBackToNormal = true;
            }
        }

        actorData.data.traits.traits.value = traits;
        actorData = this._applyAdjustmentToData(actorData, increase, adjustBackToNormal);

        // modify actordata, including items
        this.actor.update(actorData);
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

        // adjustment by using custom modifiers
        const customModifiers = actorData.data.customModifiers ?? {};
        customModifiers.all = (customModifiers.all ?? []).filter((m) => !['Weak', 'Elite'].includes(m.name)); // remove existing elite/weak modifier
        if (!adjustBackToNormal) {
            const modifier = new PF2Modifier(increase ? 'Elite' : 'Weak', mod, PF2ModifierType.UNTYPED);
            customModifiers.all.push(modifier);
        }

        const lvl = parseInt(actorData.data.details.level.value, 10);
        const originalLvl = adjustBackToNormal ? lvl + positive : lvl;
        const hp = parseInt(actorData.data.attributes.hp.max, 10);
        let hpAdjustment = 10;
        if (originalLvl >= 20) {
            hpAdjustment = 30;
        } else if (originalLvl >= 5) {
            hpAdjustment = 20;
        } else if (originalLvl >= 2) {
            hpAdjustment = 15;
        }
        actorData.data.attributes.hp.max = hp + hpAdjustment * positive;
        actorData.data.attributes.hp.value = actorData.data.attributes.hp.max;
        actorData.data.details.level.value = lvl + positive;

        for (const item of actorData.items) {
            if (item.type === 'melee') {
                // melee type is currently used for both melee and ranged attacks
                const attack = getProperty(item.data, 'bonus.value');
                if (attack !== undefined) {
                    item.data.bonus.value = parseInt(attack, 10) + mod;
                    item.data.bonus.total = item.data.bonus.value;
                    const dmg = getProperty(item.data.damageRolls[0], 'damage');
                    if (dmg !== undefined) {
                        const lastTwoChars = dmg.slice(-2);
                        if (parseInt(lastTwoChars, 10) === mod * -1) {
                            item.data.damageRolls[0].damage = dmg.slice(0, -2);
                        } else {
                            item.data.damageRolls[0].damage = dmg + (increase ? '+' : '') + mod;
                        }
                    }
                }
            } else if (item.type === 'spellcastingEntry') {
                const spellDc = getProperty(item.data, 'spelldc.dc');
                if (spellDc !== undefined) {
                    item.data.spelldc.dc = parseInt(spellDc, 10) + mod;
                    const spellAttack = getProperty(item.data, 'spelldc.value');
                    item.data.spelldc.value = parseInt(spellAttack, 10) + mod;
                }
            } else if (item.type === 'spell') {
                // TODO? Spell descriptions are currently not updated with the damage increase, only the damage.value field.
                const spellName = item.name.toLowerCase();
                const spellDamage = getProperty(item.data, 'damage.value'); // string
                const spellLevel = getProperty(item.data, 'level.value');
                let spellDmgAdjustmentMod = 1; // 1 = unlimited uses, 2 = limited uses

                // checking truthy is possible, as it's unlikely that spellDamage = 0 in a damage spell :)
                if (spellDamage) {
                    if (spellLevel === 0 || spellName.includes('at will')) {
                        spellDmgAdjustmentMod = 1;
                    } else {
                        spellDmgAdjustmentMod = 2;
                    }
                    const lastTwoChars = spellDamage.slice(-2);
                    if (parseInt(lastTwoChars, 10) === mod * spellDmgAdjustmentMod * -1) {
                        item.data.damage.value = spellDamage.slice(0, -2);
                    } else {
                        item.data.damage.value = spellDamage + (increase ? '+' : '') + mod * spellDmgAdjustmentMod;
                    }
                }
            } else if (item.type === 'action') {
                let actionDescr = getProperty(item.data, 'description.value');
                if (actionDescr !== undefined) {
                    actionDescr = actionDescr.replace(/DC (\d+)+/g, (match, number) => {
                        return `DC ${parseInt(number, 10) + mod}`;
                    });
                    // Assuming that all abilities with damage in the description are damage attacks that cant be done each turn and as increase twice as much.
                    actionDescr = actionDescr.replace(
                        /(\d+)?d(\d+)([+-]\d+)?(\s+[a-z]+[\s.,])?/g,
                        (match, a, b, c, d) => {
                            // match: '1d4+1 rounds.', a: 1, b: 4, c: '+1', d: ' rounds.'
                            const bonus = parseInt(c, 10);
                            if (d?.substring(1, 7) !== 'rounds') {
                                if (Number.isNaN(bonus)) {
                                    // c is empty in this case so dont need to add
                                    c = (increase ? '+' : '') + mod * 2;
                                } else if (bonus === mod * 2 * -1) {
                                    c = '';
                                } else {
                                    const newC = bonus + mod * 2;
                                    c = newC === 0 ? '' : `${newC > 0 ? '+' : ''}${newC}`;
                                }
                            } else if (c === undefined) {
                                c = '';
                            }
                            return `${a || ''}d${b}${c}${d || ''}`;
                        },
                    );
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
        const traits = getProperty(actorData.data, 'traits.traits.value') || [];
        for (const trait of traits) {
            if (trait === 'elite') return true;
        }
        return false;
    }

    /**
     * Check if Weak
     */
    npcIsWeak() {
        const actorData = duplicate(this.actor.data);
        const traits = getProperty(actorData.data, 'traits.traits.value') || [];
        for (const trait of traits) {
            if (trait === 'weak') return true;
        }
        return false;
    }

    /**
     * Roll NPC Damage using DamageRoll
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollNPCDamageRoll(event, damageRoll, item) {
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
        actionList.each((index, element) => {
            // 'this' = element found
            if ($(element).attr('data-item-name').trim().toLowerCase() === attackEffectName.trim().toLowerCase()) {
                $(element).find('h4').click();
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
                        actionCategory: { value: 'offensive' },
                        source: { value: '' },
                        description: { value: newAbilityInfo.description },
                        traits: { value: [] },
                        actions: { value: newAbilityInfo.actionCost },
                    },
                };

                const traitRegEx = /(?:Traits.aspx.+?">)(?:<\w+>)*(.+?)(?:<\/\w+>)*(?:<\/a>)/g;
                const matchTraits = [...newAbilityInfo.description.matchAll(traitRegEx)];

                for (let i = 0; i < matchTraits.length; i++) {
                    if (matchTraits[i] && matchTraits[i].length >= 2 && matchTraits[i][1]) {
                        if (!newAction.data.traits.value.includes(matchTraits[i][1]))
                            newAction.data.traits.value.push(matchTraits[i][1]);
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

        html.find('.npc-detail-text textarea').focusout(async (event) => {
            event.target.style.height = '5px';
            event.target.style.height = `${event.target.scrollHeight}px`;
        });

        html.find('.npc-detail-text textarea').each((index, element) => {
            element.style.height = '5px';
            element.style.height = `${element.scrollHeight}px`;
        });

        html.find('.isNPCEditable').change((ev) => {
            this.actor.setFlag('pf2e', 'editNPC', { value: ev.target.checked });
        });

        // NPC Weapon Rolling

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
                case 'npcDamageRoll':
                    this.rollNPCDamageRoll(ev, damageRoll, item);
                    break;
                default:
            }
        });

        html.find('button.npc-attackEffect').click((ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            const itemId = $(ev.currentTarget).parents('.item').attr('data-item-id');
            const aId = Number($(ev.currentTarget).attr('data-attackEffect'));
            // item = this.actor.items.find(i => { return i.id === itemId });
            const item = this.actor.getOwnedItem(itemId);
            if (item === null || item.data.type !== 'melee') {
                console.log('PF2e System | clicked an attackEffect, but item was not a melee');
                return;
            }

            const attackEffect = item.data.data.attackEffects.value[aId];
            console.log('PF2e System | clicked an attackEffect:', attackEffect, ev);

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (ev.target.dataset.action) {
                case 'npcAttackEffect':
                    this.expandAttackEffect(attackEffect, ev, item);
                    break;
                default:
            }
        });

        html.find('a.npc-elite-adjustment').click((e) => {
            e.preventDefault();
            console.log(`PF2e System | Adding Elite adjustment to NPC`);
            const eliteButton = $(e.currentTarget);
            const weakButton = eliteButton.siblings('.npc-weak-adjustment');
            eliteButton.toggleClass('active');
            weakButton.toggleClass('hidden');
            this.npcAdjustment(eliteButton.hasClass('active'));
        });
        html.find('a.npc-weak-adjustment').click((e) => {
            e.preventDefault();
            console.log(`PF2e System | Adding Weak adjustment to NPC`);
            const weakButton = $(e.currentTarget);
            const eliteButton = weakButton.siblings('.npc-elite-adjustment');
            weakButton.toggleClass('active');
            eliteButton.toggleClass('hidden');
            this.npcAdjustment(!weakButton.hasClass('active'));
        });
    }
}
