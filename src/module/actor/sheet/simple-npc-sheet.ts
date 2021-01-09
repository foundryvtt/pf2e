/* global ChatMessage */

import { ActorSheetPF2eCreature } from "./creature";
import { TraitSelector5e } from "../../system/trait-selector";
import { DicePF2e } from "../../../scripts/dice";
import { PF2EActor, SKILL_DICTIONARY } from "../actor";
import { PF2Modifier, PF2ModifierType } from "../../modifiers";
import { NPCSkillsEditor } from "../../system/npc-skills-editor";
import { PF2ENPC } from "../npc";
import { identifyCreature } from "../../../module/recall-knowledge";
import { PF2EItem } from "src/module/item/item";

const isString = require('is-string');

export class ActorSheetPF2eSimpleNPC extends ActorSheetPF2eCreature {
    
    static get defaultOptions() {
        const options = super.defaultOptions;
        
        // Mix default options with new ones
        mergeObject(options, {
            classes: options.classes.concat(['pf2e','actor','npc']),
            width: 650,
            height: 680,
            showUnpreparedSpells: true,     // Not sure what it does in an NPC, copied from old code
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main"}]
        });
        
        return options;
    }
    
    /**
    * Returns the path to the HTML template to use to render this sheet.
    */
    get template() {
        return 'systems/pf2e/templates/actors/npc/npc-sheet.html';
    }
    
    /**
    * Prepares items in the actor for easier access during sheet rendering.
    * @param actorData Data from the actor associated to this sheet.
    */
    _prepareItems(actorData) {
        const monsterTraits = actorData.data.traits.traits;
        
        this._prepareAbilities(actorData.data.abilities);
        this._prepareMonsterTraits(monsterTraits);
        this._prepareSize(actorData);
        this._prepareAlignment(actorData);
        this._preparePerception(actorData);
        this._prepareSenses(actorData);
        this._prepareLanguages(actorData.data.traits.languages);
        this._prepareSkills(actorData);
        this._prepareSpeeds(actorData);
        this._prepareWeaknesses(actorData);
        this._prepareResistances(actorData);
        this._prepareImmunities(actorData);
        this._prepareSaves(actorData);
        this._prepareActions(actorData);

        const isWeak = this._isWeak();
        const isElite = this._isElite();
        let adjustmentSign = 0;

        if (isWeak) {
            adjustmentSign = -1;
        } else if (isElite) {
            adjustmentSign = 1;
        }

        const revertToNormal = false;   // TODO

        this._applyAdjustments(actorData, adjustmentSign  , revertToNormal);
    }

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

        const equipment = this._getEquipment(sheetData);

        sheetData.actor.equipment = equipment;

        if (equipment.length > 0) {
            sheetData.hasEquipment = true;
        }

        // Return data for rendering
        return sheetData;
    }

    /**
    * Subscribe to events from the sheet.
    * @param html HTML content ready to render the sheet.
    */
    activateListeners(html) {
        super.activateListeners(html);
        
        // Subscribe to roll events
        html.find('.rollable').click((ev) => this._onRollableClicked(ev));
        html.find('button').click((ev) => this._onButtonClicked(ev));

        html.find(".attack").hover((ev) => this._onAttackHovered(ev), (ev) => this._onAttackHoverEnds(ev));
        html.find(".action").hover((ev) => this._onActionHovered(ev), (ev) => this._onActionHoverEnds(ev))
        html.find('.item').hover((ev) => this._onItemHovered(ev), (ev) => this._onItemHoverEnds(ev));


        // Don't subscribe to edit buttons it the sheet is NOT editable
        if (!this.options.editable) return;
        
        html.find('.trait-edit').click((ev) => this._onTraitEditClicked(ev));
        html.find('.languages-edit').click((ev) => this._onLanguagesClicked(ev));
        html.find('.senses-edit').click((ev) => this._onSensesEditClicked(ev));
        html.find('.skills-edit').click((ev) => this._onSkillsEditClicked(ev));
        html.find('.speed-edit').click((ev) => this._onSpeedEditClicked(ev));
        html.find('.weaknesses-edit').click((ev) => this._onWeaknessesEditClicked(ev));
        html.find('.resistances-edit').click((ev) => this._onResistancesEditClicked(ev));
        html.find('.immunities-edit').click((ev) => this._onImmunitiesEditClicked(ev));
        html.find('.action-add').click((ev) => this._onAddActionClicked(ev));
    }
    
    // TRAITS MANAGEMENT
    
    _prepareAbilities(abilities) {
        for (const ability of Object.keys(abilities)) {
            const codeKey = this._getAbilityCodeKey(ability);
            const localizedCode = game.i18n.localize(codeKey);
            const nameKey = this._getAbilityNameKey(ability);
            const localizedName = game.i18n.localize(nameKey);
            
            abilities[ability].localizedCode = localizedCode;
            abilities[ability].localizedName = localizedName;
        }
    }
    
    _prepareMonsterTraits(traits) {
        traits.localizationMap = {};
        
        for (const trait of traits.value) {
            const localizationKey = this._getMonsterTraitLocalizationKey(trait);
            const localizedName = game.i18n.localize(localizationKey);
            
            traits.localizationMap[trait] = localizedName;
        }
    }
    
    _prepareSize(actorData) {
        const size = actorData.data.traits.size.value;
        const localizationKey = this._getSizeLocalizedKey(size);
        const localizedName = game.i18n.localize(localizationKey);
        
        actorData.data.traits.size.localizedName = localizedName;
    }
    
    _prepareAlignment(actorData) {
        const alignmentCode = actorData.data.details.alignment.value;
        const localizedName = game.i18n.localize(`PF2E.Alignment${alignmentCode}`);
        
        actorData.data.details.alignment.localizedName = localizedName;
    }
    
    _preparePerception(actorData) {
        const perception = actorData.data.attributes.perception;
        
        if (perception.base > 0) {
            perception.readableValue = `+${perception.base}`;
        } else {
            perception.readableValue = perception.base;
        }
    }
    
    _prepareSenses(actorData) {
        // Try to convert old legacy senses to new, array-like senses
        if (isString(actorData.data.traits.senses.value)) {
            const reformattedSenses = this._createSensesFromString(actorData.data.traits.senses.value);
            
            actorData.data.traits.senses = reformattedSenses;
        }
        
        for (const sense of actorData.data.traits.senses)  {
            sense.localizedName = CONFIG.PF2E.senses[sense.type] ?? sense.type;
        }
    }
    
    _createSensesFromString(sensesText) {
        const senses = [];
        const rawSenses = sensesText.split(',');
        const fullSenseRegExp = /(.+)\s+(\(.*\))+(?:\s+)(\d+.*)/g;
        const onlyAcuityRegExp = /(.+)\s+(\(.*\))/g;
        const onlyRangeRegExp = /(.*)\s+(\d+.*)+/g;
        
        for (let rawSense of rawSenses) {
            rawSense = rawSense.trim();
            let type = "";
            let value = "";
            
            // Try to figure out the format of the sense
            const fullResult = fullSenseRegExp.exec(rawSense);        // ie: scent (imprecise) 30 ft.
            const acuityResult = onlyAcuityRegExp.exec(rawSense);     // ie: scent (imprecise)
            const rangeResult = onlyRangeRegExp.exec(rawSense);       // ie: scent 30 ft.
            
            if (fullResult) {
                type = fullResult[1];
                value = `${fullResult[2]} ${fullResult[3]}`;
            } else if (acuityResult) {
                type = acuityResult[1];
                value = acuityResult[2];
            } else if (rangeResult) {
                type = rangeResult[1];
                value = rangeResult[2];
            } else {
                type = rawSense;
            }
            
            const sense = {
                type: type.trim(),
                label: type.trim(),
                value: value.trim()
            };
            
            senses.push(sense);
        }
        
        return senses;
    }
    
    _prepareLanguages(languages) {
        languages.localizedNames = {};
        
        for (const language of Object.keys(languages.selected)) {
            const localizedName = CONFIG.PF2E.languages[language];
            
            languages.localizedNames[language] = localizedName;
        }
    }

    _prepareSkills(actorData) {
        // Prepare a list of skill IDs sorted by their localized name
        // This will help in displaying the skills in alphabetical order in the sheet
        const sortedSkillsIds = duplicate(Object.keys(actorData.data.skills));

        sortedSkillsIds.sort((a: string, b: string) => {
            const skillA = actorData.data.skills[a];
            const skillB = actorData.data.skills[b];

            if (skillA.label < skillB.label) return -1;
            if (skillA.label > skillB.label) return 1;

            return 0;
        });

        const sortedSkills = {};

        for (const skillId of sortedSkillsIds) {
            sortedSkills[skillId] = actorData.data.skills[skillId];
        }

        actorData.data.sortedSkills = sortedSkills;
    }
    
    _prepareSpeeds(actorData) {
        for (const speedId of Object.keys(actorData.data.attributes.speed.otherSpeeds)) {
            const speed = actorData.data.attributes.speed.otherSpeeds[speedId];
            
            // Try to convert it to a recognizable speed name
            // This is done to recognize speed types for NPCs from the compendium
            const speedName = speed.type.trim().toLowerCase().replace(/\s+/g, '-'); 
            
            speed.value = speed.value.replace("feet", "").trim();   // Remove `feet` at the end, wi will localize it later
            speed.label = CONFIG.PF2E.speedTypes[speedName];
        }
        
        // Make sure regular speed has no `feet` at the end, we will add it localized later on
        // This is usally the case for NPCs from the compendium
        if (isString(actorData.data.attributes.speed.value)) {
            actorData.data.attributes.speed.value = actorData.data.attributes.speed.value.replace("feet", "").trim();
        }
    }
    
    _prepareWeaknesses(actorData) {
        for (const key of Object.keys(actorData.data.traits.dv)) {
            const weakness = actorData.data.traits.dv[key];
            
            weakness.label = CONFIG.PF2E.weaknessTypes[weakness.type];
        }        
    }
    
    _prepareResistances(actorData) {
        for (const key of Object.keys(actorData.data.traits.dr)) {
            const resistance = actorData.data.traits.dr[key];
            
            resistance.label = CONFIG.PF2E.resistanceTypes[resistance.type];
        }   
    }
    
    _prepareImmunities(actorData) {
        // Special case for NPCs from compendium
        // Immunities come as a single string
        // Once the change to immunities is done for the compendium data, this
        // will no longer be needed can be deleted
        const immunitiesCount = actorData.data.traits.di.value.length;
        const firstImmunity = immunitiesCount > 0 ? actorData.data.traits.di.value[0] : '';
        const hasCustomImmunities = firstImmunity === 'custom';
        
        if (hasCustomImmunities) {
            console.log("Detected a custom list of immunities. Trying to convert it into a list.");
            const immunities = actorData.data.traits.di.selected.custom.split(",");
            
            // Remove the first element in the array that is set to `custom`
            // We will create the final list manually
            actorData.data.traits.di.value.shift();
            
            for (let immunity of immunities) {
                immunity = immunity.trim();
                actorData.data.traits.di.value.push(immunity);
            }
        }
        // ---
        
        // Try to localize values to show the correct text in the sheet
        // Immunities are store as a simple string array, so we use parallel array
        // for storing the label values, not like we do with resistances and weaknesses
        const labels = [];
        
        for (const id of Object.keys(actorData.data.traits.di.value)) {
            const value = actorData.data.traits.di.value[id].trim();
            const label = CONFIG.PF2E.immunityTypes[value] ?? value;
            
            labels.push(label);
        }
        
        actorData.data.traits.di.labels = labels;
    }

    _prepareSaves(actorData) {
        if (actorData.data.saves === undefined) return;

        const fortitude = actorData.data.saves['fortitude'];
        const reflex = actorData.data.saves['reflex'];
        const will = actorData.data.saves['will'];

        fortitude.labelShort = game.i18n.localize('PF2E.SavesFortitudeShort');
        reflex.labelShort = game.i18n.localize('PF2E.SavesReflexShort');
        will.labelShort = game.i18n.localize('PF2E.SavesWillShort');
    }
    
    /**
    * Prepares the actions list to be accessible from the sheet.
    * @param actorData Data of the actor to be shown in the sheet.
    */
    _prepareActions(actorData) {
        const attacks = {
            melee: { 
                label: game.i18n.localize('PF2E.NPC.AttackType.Melee'),
                labelShort: game.i18n.localize('PF2E.NPCAttackMelee'),
                items: [],
                type: 'melee' },
            ranged: { 
                label: game.i18n.localize('PF2E.NPC.AttackType.Ranged'),
                labelShort: game.i18n.localize('PF2E.NPCAttackRanged'),
                items: [],
                type: 'melee' }
          };
        
        const actions = {
            passive: { label: game.i18n.localize('PF2E.ActionTypePassive'), actions: [] },
            free: { label: game.i18n.localize('PF2E.ActionTypeFree'), actions: [] },
            reaction: { label: game.i18n.localize('PF2E.ActionTypeReaction'), actions: [] },
            action: { label: game.i18n.localize('PF2E.ActionTypeAction'), actions: [] },
        };
        
        // Iterate through the items to search for actions
        for (const item of actorData.items) {
            const isAction = item.type === 'action';
            const isWeapon = item.type === 'weapon';
            const isGenericAttack = item.type === 'melee';

            if (!isAction && !isWeapon && !isGenericAttack) continue;
            if (isWeapon) continue; // Weapons are no longer supported, they use the 'melee' item type

            // Format action traits
            const hasTraits = (item.data.traits.value || []).length !== 0;

            if (hasTraits) {
                const traits = [];

                for (let i = 0; i < item.data.traits.value.length; i++) {
                    const label = CONFIG.PF2E.weaponTraits[item.data.traits.value[i]] || (item.data.traits.value[i].charAt(0).toUpperCase() + item.data.traits.value[i].slice(1));
                    const description = CONFIG.PF2E.traitsDescriptions[item.data.traits.value[i]] || '';

                    const trait = {
                        label,
                        description
                    };

                    traits.push(trait);
                }
                
                // Create trait with the type of action
                const hasType = item.data.actioType && item.data.actionType.value;

                if (hasType) {
                    const label = CONFIG.PF2E.weaponTraits[item.data.actionType.value] || (item.data.actionType.value.charAt(0).toUpperCase() + item.data.actionType.value.slice(1));
                    const description = CONFIG.PF2E.traitsDescriptions[item.data.actionType.value] || '';

                    const trait = {
                        label,
                        description
                    };

                    traits.push(trait);
                }

                // Don't know the purpose of this, coppied from previous code
                item.traits = traits.filter((p) => !!p);
            }

            if (isAction) {
                // Select appropiate image for the action, based on type of action
                const actionType = item.data.actionType.value || 'action';    // Default to action if not set

                switch (actionType) {
                    case 'action': {
                        break;
                    }
                    case 'reaction': {
                        break;
                    }
                    case 'free': {
                        break;
                    }
                    case 'passive': {
                        break;
                    }
                    default: {
                        break;
                    }
                }

                this._assignActionGraphics(item);

                actions[actionType].actions.push(item);

            } else if (isGenericAttack) {
                const weaponType = this._getWeaponType(item);
                const isAgile = this._isAgileWeapon(item);
                const attackBonus = getProperty(item.data, 'bonus.value');

                item.data.bonus.value = parseInt(attackBonus, 10);
                item.data.bonus.total = item.data.bonus.value;
                item.data.isAgile = isAgile;
                item.data.weaponType = weaponType;

                // Format traits to display for read-only NPCs
                const traits = [];
                
                if ((item.data.traits.value || []).length !== 0) {
                    for (let j = 0; j < item.data.traits.value.length; j++) {
                        const traitsObject = {
                        label: CONFIG.PF2E.weaponTraits[item.data.traits.value[j]] || (item.data.traits.value[j].charAt(0).toUpperCase() + item.data.traits.value[j].slice(1)),
                        description: CONFIG.PF2E.traitsDescriptions[item.data.traits.value[j]] || '',
                        };
                        traits.push(traitsObject);
                    }
                }

                item.traits = traits.filter((p) => !!p);

                this._assignActionGraphics(item);

                attacks[weaponType].items.push(item);
            }
        }

        actorData.actions = actions;
        actorData.attacks = attacks;
    }

    /**
     * Prepares the equipment list of the actor.
     * @param sheetData Data of the sheet.
     */
    _getEquipment(sheetData): PF2EItem[] {
        const equipment: PF2EItem[] = [];

        for (const i of sheetData.actor.items) {
            const item = i as PF2EItem;

            if (item === undefined || item === null) continue;

            if (!this._isEquipment(item)) continue;

            equipment.push(item);
        }

        return equipment;
    } 

    /**
     * Checks if an item is an equipment or not.
     * @param item Item to check.
     */
    private _isEquipment(item: PF2EItem) : boolean {
        if (item.type === 'weapon') return true;
        if (item.type === 'armor') return true;
        if (item.type === 'equipment') return true;
        if (item.type === 'consumable') return true;
        if (item.type === 'treasure') return true;

        return false;
    }

    /**
     * Adjusts the NPC with the 'Weak' or 'Elite' modifiers.
     * @param actorData Data been passed to the view.
     */
    _applyAdjustments(actorData, adjustmentSign, revertToNormal) {
        const isWeak = adjustmentSign < 0;
        const isElite = adjustmentSign > 0;

        const npcModifier = adjustmentSign * 2;

        // Use custom modifiers
        const customModifiers = actorData.data.customModifiers ?? {};

        customModifiers.all = (customModifiers.all ?? []).filter(m => !['Weak', 'Elite'].includes(m.name));

        // Add a new custom modifier
        if (!revertToNormal && (isWeak || isElite)) {
            const customModifierName = isWeak ? 'Weak' : 'Elite';
            const customModifier = new PF2Modifier(customModifierName, npcModifier, PF2ModifierType.UNTYPED);

            customModifiers.all.push(customModifier);
        }

        // Adjust HP based on level
        const levelAdjustment = adjustmentSign * 1;
        const currentLevel = parseInt(actorData.data.details.level.value, 10);
        const originalLevel = revertToNormal ? currentLevel + levelAdjustment : currentLevel;
        
        this._adjustHP(actorData, adjustmentSign, originalLevel);

        actorData.data.details.level.value = currentLevel + levelAdjustment;

        // Adjust actions and spells
        for (const item of actorData.items) {
            if (item.type === 'melee') {
                this._adjustNPCAttack(item, adjustmentSign);
            } else if (item.type === 'spellcastingEntry') {
                this._adjustSpellcastingEntry(item, adjustmentSign);
            } else if (item.type === 'spell') {
                this._adjustSpell(item, adjustmentSign);
            } else if (item.type === 'action') {
                this._adjustAction(item, adjustmentSign);
            }
        }

        return actorData;
    }

    _adjustHP(actorData, adjustmentSign, originalLevel) {
        const currentHp = parseInt(actorData.data.attributes.hp.max, 10);
        let hpAdjustment;

        if (originalLevel >= 20) {
            hpAdjustment = 30;
        } else if (originalLevel >= 5) {
            hpAdjustment = 20;
        } else if (originalLevel >= 2) {
            hpAdjustment = 15;
        } else {
            hpAdjustment = 10;
        }

        actorData.data.attributes.hp.max = currentHp + hpAdjustment * adjustmentSign;
        actorData.data.attributes.hp.value = actorData.data.attributes.hp.max;
    }

    _adjustNPCAttack(item, adjustmentSign) {
        const modifier = 2 * adjustmentSign;

        if (modifier === 0) return;

        if (item === undefined) return;
        if (item.data === undefined) return;
        if (item.data.bonus === undefined) return;

        const attack = item.data.bonus.value;

        if (attack === undefined) return;

        item.data.bonus.value = parseInt(attack, 10) + modifier;
        item.data.bonus.total = item.data.bonus.value;

        if (item.data.damageRolls === undefined) return;
        if (item.data.damageRolls.length < 1) return;
        if (item.data.damageRolls[0] === undefined) return;

        const dmg = item.data.damageRolls[0].damage;

        if (dmg === undefined) return;

        const lastTwoChars = dmg.slice(-2);
        const lastValue: number = parseInt(lastTwoChars, 10);
        const isInverseToAdjustment = lastValue === (modifier * -1);
        
        if (isInverseToAdjustment) {
            // Remove previously applied bonus
            item.data.damageRolls[0].damage = dmg.slice(0, -2);
        } else {
            // Add new bonus
            const newBonus = (adjustmentSign ? '+' : '') + modifier;
            item.data.damageRolls[0].damage = dmg + newBonus;
        }
    }

    _adjustSpellcastingEntry(item, adjustmentSign) {
        const modifier = adjustmentSign * 2;

        if (item.data === undefined) return;
        if (item.data.spelldc === undefined) return;
        if (item.data.spelldc.dc === undefined) return;

        const spellDc = item.data.spelldc.dc

        if (spellDc === undefined) return;

        item.data.spelldc.dc = parseInt(spellDc, 10) + modifier;

        const spellAttack = item.data.spelldc.value;

        if (spellAttack === undefined) return;

        item.data.spelldc.value = parseInt(spellAttack, 10) + modifier;
    }

    _adjustSpell(item, adjustmentSign) {
        const modifier = adjustmentSign * 2;
        const spellName = item.name.toLowerCase();

        if (item.data === undefined) return;
        if (item.data.damage === undefined) return;
        if (item.data.level === undefined) return;

        const spellDamage = item.data.damage.value; // string
        const spellLevel = item.data.level.value;
        let spellDmgAdjustmentMod = 1; // 1 = unlimited uses, 2 = limited uses
        
        // checking truthy is possible, as it's unlikely that spellDamage = 0 in a damage spell :)
        if ( spellDamage ) {
            if (spellLevel === 0 || spellName.includes('at will')) {
                spellDmgAdjustmentMod = 1;
            } else {
                spellDmgAdjustmentMod = 2;
            }
            
            const lastTwoChars = spellDamage.slice(-2);

            if (parseInt(lastTwoChars, 10) === (modifier * spellDmgAdjustmentMod * -1 )) {
                item.data.damage.value = spellDamage.slice(0, -2);
            } else {
                item.data.damage.value = spellDamage + (adjustmentSign ? '+' : '') + (modifier * spellDmgAdjustmentMod);
            }
        }
    }

    _adjustAction(item, adjustmentSign) {
        const modifier = adjustmentSign * 2;

        if (modifier === 0) return;

        if (item.data.description === undefined) return;

        let actionDescr = item.data.description.value;

        if (actionDescr === undefined) return;

        actionDescr = actionDescr.replace(/DC (\d+)+/g, (match, number) => {
            return `DC ${  parseInt(number, 10) + modifier}`;
        });

        // Assuming that all abilities with damage in the description are damage attacks that cant be done each turn and as increase twice as much.
        actionDescr = actionDescr.replace(/(\d+)?d(\d+)([+-]\d+)?(\s+[a-z]+[\s.,])?/g, (match, a, b, c, d) => {
            // match: '1d4+1 rounds.', a: 1, b: 4, c: '+1', d: ' rounds.'
            const bonus = parseInt(c, 10);
            if (d?.substring(1,7) !== 'rounds') {
                if (Number.isNaN(bonus)) { // c is empty in this case so dont need to add
                    c = (adjustmentSign?'+':'') + (modifier * 2);
                } else if ( bonus === (modifier * 2 * -1) ) {
                    c = '' ;
                } else {
                    const newC = bonus + modifier * 2
                    c = newC === 0 ? '' : `${newC > 0 ? '+' : ''}${newC}`
                }
            } else if (c === undefined) {
                c = '';
            }
            return `${a || ''}d${b}${c}${d || ''}`;
        });

        item.data.description.value = actionDescr;
    }

    _isWeak() {
        // TODO
        return false;
    }

    _isElite() {
        // TODO
        return false;
    }
    
    _getMonsterTraitLocalizationKey(trait) {
        return CONFIG.PF2E.monsterTraits[trait];
    }
    
    _getSizeLocalizedKey(size) {
        return CONFIG.PF2E.actorSizes[size];
    }
    
    _getAbilityCodeKey(abilityCode) {
        return `PF2E.AbilityId.${abilityCode}`;
    }
    
    _getAbilityNameKey(abilityCode) {
        return CONFIG.PF2E.abilities[abilityCode];
    }
    
    // ROLLS
    
    rollPerception(event) {
        const options = this.actor.getRollOptions(['all', 'perception-check']);
        this.actor.data.data.attributes.perception.roll(event, options);
    }
    
    rollAbility(event, abilityId) {
        const bonus = this.actor.data.data.abilities[abilityId].mod;
        const parts = ['@bonus'];
        const title = game.i18n.localize(`PF2E.AbilityCheck.${abilityId}`);
        const data = {
            bonus
        };
        const speaker = ChatMessage.getSpeaker(this);
        
        DicePF2e.d20Roll({
            event,
            parts,
            data,
            title,
            speaker
        });
    }
    
    rollNPCSkill(event, skillId) {
        const skill = this.actor.data.data.skills[skillId];

        if (skill === undefined) return;

        const isException = $(event.currentTarget).hasClass("exception");
        let exceptionBonus: number;

        if (isException) {
            exceptionBonus = skill.exceptionBonus;
        } else {
            exceptionBonus = 0;
        }

        const npc = this.actor as PF2ENPC;
        const originalSkillValue = skill.value;

        if (isException) {
            npc.assignNPCSkillValue(skillId, originalSkillValue + exceptionBonus);
        }

        if (skill.roll) {
            const opts = this.actor.getRollOptions(['all', 'skill-check', SKILL_DICTIONARY[skillId] ?? skillId]);
            skill.roll(event, opts);
        } else {
            this.actor.rollSkill(event, skillId);
        }

        if (isException) {
            npc.assignNPCSkillValue(skillId, originalSkillValue);
        }
    }
    
    rollSave(event, saveId) {
        this.actor.rollSave(event, saveId);
    }
    
    // ----
    
    // EVENTS
    
    _onTraitEditClicked(eventData) {
        eventData.preventDefault();
        
        console.log("Edit trait clicked.");
        
        const a = $(eventData.currentTarget);
        const options = {
            name: a.parents('div').attr('for'),
            title: a.parent().text().trim(),
            choices: CONFIG.PF2E[a.attr('data-options')],
            has_values: (a.attr('data-has-values') === 'true'),
            allow_empty_values: (a.attr('data-allow-empty-values') === 'true'),
            has_exceptions: (a.attr('data-has-exceptions') === 'true'),
        };
        new TraitSelector5e(this.actor, options).render(true);
    }
    
    _onRollableClicked(eventData) {
        const attribute = $(eventData.currentTarget).parent().attr('data-attribute');
        const skill = $(eventData.currentTarget).parent().attr('data-skill');
        const save = $(eventData.currentTarget).parent().attr('data-save');
        const action = $(eventData.currentTarget).parent().parent().attr('data-action');
        const item = $(eventData.currentTarget).parent().parent().attr('data-item');

        if (attribute) {
            console.log(`Clicked rollable attribute ${attribute}`);
            
            switch (attribute) {
                case 'perception': this._onPerceptionLabelClicked(eventData); break;
                case 'str': this._onAbilityClicked(eventData, attribute); break;
                case 'dex': this._onAbilityClicked(eventData, attribute); break;
                case 'con': this._onAbilityClicked(eventData, attribute); break;
                case 'int': this._onAbilityClicked(eventData, attribute); break;
                case 'wis': this._onAbilityClicked(eventData, attribute); break;
                case 'cha': this._onAbilityClicked(eventData, attribute); break;
                default: break;
            }
        } else if (skill) {
            this.rollNPCSkill(eventData, skill);
        } else if (save) {
            this._onSaveClicked(eventData, save);
        }
        else if (action) {
            this._onActionClicked(eventData, action);
        } else if (item) {
            this._onItemClicked(eventData, item);
        }
    }

    _onButtonClicked(eventData) {
        eventData.preventDefault();
        eventData.stopPropagation();

        switch (eventData.target.dataset.action) {
            case 'npcAttack':
                this._onNPCAttackClicked(eventData, 1);
                break;
            case 'npcAttack2':
                this._onNPCAttackClicked(eventData, 2);
                break;
            case 'npcAttack3':
                this._onNPCAttackClicked(eventData, 3);
                break;
            case 'damage':
                this._onNPCDamageClicked(eventData);
                break;
            case 'critical':
                this._onNPCCriticalClicked(eventData);
                break;
        }
    }

    _onNPCAttackClicked(eventData, attackNumber) {
        const itemId = $(eventData.currentTarget).parents('.item').attr('data-item-id');
        const item = this.actor.getOwnedItem(itemId);

        if (item === undefined) return;

        if (attackNumber < 2) {
            item.rollNPCAttack(eventData);
        } else {
            item.rollNPCAttack(eventData, attackNumber);
        }
    }

    _onNPCDamageClicked(eventData) {
        const itemId = $(eventData.currentTarget).parents('.item').attr('data-item-id');
        const item = this.actor.getOwnedItem(itemId);

        if (item === undefined) return;

        item.rollNPCDamage(eventData);
    }

    _onNPCCriticalClicked(eventData) {
        const itemId = $(eventData.currentTarget).parents('.item').attr('data-item-id');
        const item = this.actor.getOwnedItem(itemId);

        if (item === undefined) return;

        item.rollNPCDamage(eventData, true);
    }

    _onAttackHovered(eventData) {
        const controls = $(eventData.currentTarget).find(".controls");

        if (controls === undefined) return;

        controls.addClass("expanded");
    }

    _onAttackHoverEnds(eventData) {
        const controls = $(eventData.currentTarget).find(".controls");

        if (controls === undefined) return;

        controls.removeClass("expanded");
    }

    _onActionHovered(eventData) {
        const controls = $(eventData.currentTarget).find(".controls");

        if (controls === undefined) return;

        controls.addClass("expanded");
    }

    _onActionHoverEnds(eventData) {
        const controls = $(eventData.currentTarget).find(".controls");

        if (controls === undefined) return;

        controls.removeClass("expanded");
    }

    _onItemHovered(eventData) {
        const controls = $(eventData.currentTarget).find(".controls");

        if (controls === undefined) return;

        controls.addClass("expanded");
    }

    _onItemHoverEnds(eventData) {
        const controls = $(eventData.currentTarget).find(".controls");

        if (controls === undefined) return;

        controls.removeClass("expanded");
    }
    
    _onPerceptionLabelClicked(eventData) {
        this.rollPerception(eventData);
    }
    
    _onAbilityClicked(eventData, abilityId) {
        this.rollAbility(eventData, abilityId);
    }
    
    _onLanguagesClicked(eventData) {
        eventData.preventDefault();
        
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize('PF2E.Languages'),
            choices: CONFIG.PF2E.languages,
            has_values: (htmlElement.attr('data-has-values') === 'true'),
            allow_empty_values: true,
            has_exceptions: false
        };
        
        new TraitSelector5e(this.actor, options).render(true);
    }
    
    _onSensesEditClicked(eventData) {
        eventData.preventDefault();
        
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize('PF2E.Senses'),
            choices: CONFIG.PF2E.senses,
            has_values: 'true',
            allow_empty_values: true,
            has_exceptions: false
        };
        
        new TraitSelector5e(this.actor, options).render(true);
    }
    
    _onSkillsEditClicked(eventData) {
        eventData.preventDefault();
        // const htmlElement = $(eventData.currentTarget);
        // const options = {
        //     name: 'data.skills',
        //     title: game.i18n.localize('PF2.SkillsLabel'),
        //     choices: CONFIG.PF2E.skills,
        //     has_values: true,
        //     allow_empty_values: false,
        //     has_exceptions: true,
        //     no_custom: false
        // };
        
        // new TraitSelector5e(this.actor, options).render(true);

        const options = {

        };
        const skillsEditor = new NPCSkillsEditor(this.actor, options);

        skillsEditor.render(true);
    }
    
    _onSaveClicked(eventData, saveId) {
        this.rollSave(eventData, saveId);
    }
    
    _onSpeedEditClicked(eventData) {
        console.log("Clicked edit speed");
        
        eventData.preventDefault();
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize("PF2.Speed"),
            choices: CONFIG.PF2E.speedTypes,
            has_values: 'true',
            allow_empty_values: false,
            has_exceptions: false
        };
        
        new TraitSelector5e(this.actor, options).render(true);
    }
    
    _onWeaknessesEditClicked(eventData) {
        console.log("Clicked edit weaknesses");
        
        eventData.preventDefault();
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize("PF2E.WeaknessesLabel"),
            choices: CONFIG.PF2E.weaknessTypes,
            has_values: true,
            allow_empty_values: false,
            has_exceptions: false
        };
        
        new TraitSelector5e(this.actor, options).render(true);
    }
    
    _onResistancesEditClicked(eventData) {
        console.log("Clicked edit resistances");
        
        eventData.preventDefault();
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize("PF2E.ResistancesLabel"),
            choices: CONFIG.PF2E.resistanceTypes,
            has_values: true,
            allow_empty_values: false,
            has_exceptions: false
        };
        
        new TraitSelector5e(this.actor, options).render(true);
    }
    
    _onImmunitiesEditClicked(eventData) {
        console.log("Clicked edit immunities");
        
        eventData.preventDefault();
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize("PF2E.ImmunitiesLabel"),
            choices: CONFIG.PF2E.immunityTypes,
            has_values: false,
            allow_empty_values: true,
            has_exceptions: false
        };
        
        new TraitSelector5e(this.actor, options).render(true);
    }
    
    _onAddActionClicked(eventData) {
        console.log("Clicked add action");
    }

    _onActionClicked(eventData, actionId) {
        const actionDetails = $(eventData.currentTarget).parent().parent().find(".action-detail");

        const isExpanded = actionDetails.hasClass("expanded");

        if (isExpanded) {
            actionDetails.slideUp(200, () => { actionDetails.removeClass("expanded"); });
        } else {
            actionDetails.addClass("expanded");
            actionDetails.slideDown(200);
        }
    }

    _onItemClicked(eventData, itemId) {
        console.log(`Clicked item`);
        const itemDetails = $(eventData.currentTarget).parent().parent().find('.item-detail');

        const isExpanded = itemDetails.hasClass("expanded");

        if (isExpanded) {
            itemDetails.slideUp(200, () => { itemDetails.removeClass('expanded'); });
        } else {
            itemDetails.addClass('expanded');
            itemDetails.slideDown(200);
        }
    }

    // Helper functions

    _isAgileWeapon(item) {
        const isAgile = (item.data.traits.value || []).includes('agile');

        return isAgile;
    }

    _getWeaponType(item) {
        const weaponType = (item.data.weaponType || {}).value || 'melee';

        return weaponType;
    }

    _assignActionGraphics(item) {
        const {imageUrl, actionGlyph} = PF2EActor.getActionGraphics(
            (item as any).data?.actionType?.value || 'action',
            parseInt(((item as any).data?.actions || {}).value, 10) || 1
        );

        item.glyph = actionGlyph;
        item.imageUrl = imageUrl;
    }
}