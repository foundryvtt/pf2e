/* global ChatMessage */

import { ActorSheetPF2eCreature } from './creature';
import { TraitSelector5e } from '../../system/trait-selector';
import { DicePF2e } from '../../../scripts/dice';
import { PF2EActor, SKILL_DICTIONARY } from '../actor';
import { PF2Modifier, PF2ModifierType } from '../../modifiers';
import { NPCSkillsEditor } from '../../system/npc-skills-editor';
import { PF2ENPC } from '../npc';
import { identifyCreature } from '../../../module/recall-knowledge';
import { PF2EItem } from '../../../module/item/item';
import { PF2EPhysicalItem } from '../../../module/item/physical';

export class ActorSheetPF2eSimpleNPC extends ActorSheetPF2eCreature<PF2ENPC> {
    static get defaultOptions() {
        const options = super.defaultOptions;

        // Mix default options with new ones
        mergeObject(options, {
            classes: options.classes.concat(['pf2e', 'actor', 'npc']),
            width: 650,
            height: 680,
            showUnpreparedSpells: true, // Not sure what it does in an NPC, copied from old code
            tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'main' }],
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
        this._prepareRarity(actorData);
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
        this._prepareSpellcasting(actorData);
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

        sheetData.isNotCommon = sheetData.data.traits.rarity.value !== 'common';
        sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];
        sheetData.actorTraits = (sheetData.data.traits.traits || {}).value;
        sheetData.actorAttitudes = CONFIG.PF2E.attitude;
        sheetData.actorAttitude = sheetData.actorAttitudes[sheetData.data.traits.attitude?.value ?? 'indifferent'];

        // Languages
        if (
            sheetData.data.traits.languages.value &&
            Array.isArray(sheetData.data.traits.languages.value) &&
            sheetData.actor.data.traits.languages.value.length > 0
        ) {
            sheetData.hasLanguages = true;
        } else {
            sheetData.hasLanguages = false;
        }

        const equipment = this._getEquipment(sheetData);

        sheetData.actor.equipment = equipment;

        if (equipment.length > 0) {
            sheetData.hasEquipment = true;
        }

        const isElite = this._isElite();
        const isWeak = this._isWeak();

        if (isElite && isWeak) {
            console.error('NPC is both, Elite and Weak at the same time.');
            sheetData.eliteState = 'active';
            sheetData.weakState = 'active';
        } else if (isElite) {
            sheetData.eliteState = 'active';
            sheetData.weakState = 'inactive';
        } else if (isWeak) {
            sheetData.eliteState = 'inactive';
            sheetData.weakState = 'active';
        } else {
            sheetData.eliteState = 'inactive';
            sheetData.weakState = 'inactive';
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

        html.find('.attack').hover(
            (ev) => this._onAttackHovered(ev),
            (ev) => this._onAttackHoverEnds(ev),
        );
        html.find('.action').hover(
            (ev) => this._onActionHovered(ev),
            (ev) => this._onActionHoverEnds(ev),
        );
        html.find('.npc-item').hover(
            (ev) => this._onItemHovered(ev),
            (ev) => this._onItemHoverEnds(ev),
        );
        html.find('.spell').hover(
            (ev) => this._onSpellHovered(ev),
            (ev) => this._onSpellHoverEnds(ev),
        );
        html.find('a.chat').click((ev) => this._onSendToChatClicked(ev));

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
        html.find('.add-weapon').click((ev) => this._onAddWeaponClicked(ev));
        html.find('.add-armor').click((ev) => this._onAddArmorClicked(ev));
        html.find('.add-equipment').click((ev) => this._onAddEquipmentClicked(ev));
        html.find('.add-consumable').click((ev) => this._onAddConsumableClicked(ev));
        html.find('.add-treasure').click((ev) => this._onAddTreasureClicked(ev));

        // Adjustments
        html.find('.npc-elite-adjustment').click((ev) => this._onEliteAdjustmentClicked(ev));
        html.find('.npc-weak-adjustment').click((ev) => this._onWeakAdjustmentClicked(ev));
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

    _prepareRarity(actorData) {
        if (actorData.data.details.rarity === undefined) {
            actorData.data.details.rarity = 'normal';
        }
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
        if (typeof actorData.data.traits.senses.value === 'string') {
            const reformattedSenses = this._createSensesFromString(actorData.data.traits.senses.value);

            actorData.data.traits.senses = reformattedSenses;
        }

        for (const sense of actorData.data.traits.senses) {
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
            let type = '';
            let value = '';

            // Try to figure out the format of the sense
            const fullResult = fullSenseRegExp.exec(rawSense); // ie: scent (imprecise) 30 ft.
            const acuityResult = onlyAcuityRegExp.exec(rawSense); // ie: scent (imprecise)
            const rangeResult = onlyRangeRegExp.exec(rawSense); // ie: scent 30 ft.

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
                value: value.trim(),
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

            speed.value = speed.value.replace('feet', '').trim(); // Remove `feet` at the end, wi will localize it later
            speed.label = CONFIG.PF2E.speedTypes[speedName];
        }

        // Make sure regular speed has no `feet` at the end, we will add it localized later on
        // This is usally the case for NPCs from the compendium
        if (typeof actorData.data.attributes.speed.value === 'string') {
            actorData.data.attributes.speed.value = actorData.data.attributes.speed.value.replace('feet', '').trim();
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
            console.log('Detected a custom list of immunities. Trying to convert it into a list.');
            const immunities = actorData.data.traits.di.selected.custom.split(',');

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
                type: 'melee',
            },
            ranged: {
                label: game.i18n.localize('PF2E.NPC.AttackType.Ranged'),
                labelShort: game.i18n.localize('PF2E.NPCAttackRanged'),
                items: [],
                type: 'melee',
            },
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
                    const label =
                        CONFIG.PF2E.weaponTraits[item.data.traits.value[i]] ||
                        item.data.traits.value[i].charAt(0).toUpperCase() + item.data.traits.value[i].slice(1);
                    const description = CONFIG.PF2E.traitsDescriptions[item.data.traits.value[i]] || '';

                    const trait = {
                        label,
                        description,
                    };

                    traits.push(trait);
                }

                // Create trait with the type of action
                const hasType = item.data.actioType && item.data.actionType.value;

                if (hasType) {
                    const label =
                        CONFIG.PF2E.weaponTraits[item.data.actionType.value] ||
                        item.data.actionType.value.charAt(0).toUpperCase() + item.data.actionType.value.slice(1);
                    const description = CONFIG.PF2E.traitsDescriptions[item.data.actionType.value] || '';

                    const trait = {
                        label,
                        description,
                    };

                    traits.push(trait);
                }

                // Don't know the purpose of this, coppied from previous code
                item.traits = traits.filter((p) => !!p);
            }

            if (isAction) {
                // Select appropiate image for the action, based on type of action
                const actionType = item.data.actionType.value || 'action'; // Default to action if not set

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
                            label:
                                CONFIG.PF2E.weaponTraits[item.data.traits.value[j]] ||
                                item.data.traits.value[j].charAt(0).toUpperCase() + item.data.traits.value[j].slice(1),
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
     * Prepare spells and spell entries
     * @param actorData Data of the actor to show in the sheet.
     */
    private _prepareSpellcasting(actorData: any) {
        const spellsList = [];
        const spellEntriesList = [];
        const spellbooks: any = [];

        spellbooks.unassigned = {};

        for (let i = 0; i < actorData.items.length; i++) {
            const item = actorData.items[i];
            if (item.type === 'spell') {
                spellsList.push(item);
            } else if (item.type === 'spellcastingEntry') {
                spellEntriesList.push(item._id);

                const isPrepared = (item.data.prepared || {}).value === 'prepared';
                const isRitual = (item.data.tradition || {}).value === 'ritual';

                item.data.prepared = isPrepared;
                item.data.tradition.ritual = isRitual;
                item.index = i;
            }
        }

        // Contains all updates to perform over items after processing
        const updateData = [];

        // Assign spells to spell entries
        for (const spell of spellsList) {
            const spellType = spell.data.time.value;

            // Assign icon based on spell type
            if (spellType === 'reaction') {
                spell.glyph = PF2EActor.getActionGraphics(spellType).actionGlyph;
            } else if (spellType === 'free') {
                spell.glyph = PF2EActor.getActionGraphics(spellType).actionGlyph;
            } else {
                const actionsCost = parseInt(spellType, 10);
                spell.glyph = PF2EActor.getActionGraphics('action', actionsCost).actionGlyph;
            }

            // Assign components
            spell.data.components.somatic = spell.data.components.value.includes('somatic');
            spell.data.components.verbal = spell.data.components.value.includes('verbal');
            spell.data.components.material = spell.data.components.value.includes('material');

            let location = spell.data.location.value;
            let spellbook;
            const hasVaidSpellcastingEntry = spellEntriesList.includes(location);

            if (hasVaidSpellcastingEntry) {
                spellbooks[location] = spellbooks[location] || {};
                spellbook = spellbooks[location];
            } else if (spellEntriesList.length === 1) {
                location = spellEntriesList[0];
                spellbooks[location] = spellbooks[location] || {};
                spellbook = spellbooks[location];

                // Assign the correct spellbook to the original item
                updateData.push({ _id: spell._id, 'data.location.value': location });
            } else {
                location = 'unassigned';
                spellbook = spellbooks.unassigned;
            }

            this._prepareSpell(actorData, spellbook, spell);
        }

        // Update all embedded entities that have an incorrect location.
        if (updateData.length) {
            console.log(
                'PF2e System | Prepare Actor Data | Updating location for the following embedded entities: ',
                updateData,
            );
            this.actor.updateEmbeddedEntity('OwnedItem', updateData);
            ui.notifications.info(
                'PF2e actor data migration for orphaned spells applied. Please close actor and open again for changes to take affect.',
            );
        }

        const hasOrphanedSpells = Object.keys(spellbooks.unassigned).length > 0;

        if (hasOrphanedSpells) {
            actorData.orphanedSpells = true;
            actorData.orphanedSpellbook = spellbooks.unassigned;
        } else {
            actorData.orphanedSpells = false;
        }

        const spellcastingEntries = [];

        for (const entryId of spellEntriesList) {
            const entry = actorData.items.find((i) => i._id === entryId);

            if (entry === null || entry === undefined) {
                console.error(`Failed to find spell casting entry with ID ${entryId}`);
                continue;
            }

            const spellbook = spellbooks[entry._id];
            const mustBePrepared = entry.data.prepared.preparedSpells && spellbook;

            if (mustBePrepared) {
                this._preparedSpellSlots(entry, spellbook);
            } else {
            }

            entry.spellbook = spellbook;

            spellcastingEntries.push(entry);
        }

        actorData.spellcastingEntries = spellcastingEntries;

        if (actorData.data.items) {
            const entriesUpdate = [];

            // Update values of the entry with values from the sheet
            // This is done here because we can't modify the entity from the sheet
            // so we store the values in data.items and update the original
            // item here.
            for (const entryId of Object.keys(actorData.data.items)) {
                const originalEntry = actorData.items.find((i) => i._id === entryId);
                const newEntry = actorData.data.items[entryId];

                if (originalEntry === null) continue;
                if (originalEntry === undefined) continue;
                if (originalEntry.type !== 'spellcastingEntry') continue;

                if (
                    originalEntry.data.spelldc.dc !== newEntry.data.spelldc.dc ||
                    originalEntry.data.spelldc.value !== newEntry.data.spelldc.value
                ) {
                    entriesUpdate.push({
                        _id: entryId,
                        'data.spelldc.dc': newEntry.data.spelldc.dc,
                        'data.spelldc.value': newEntry.data.spelldc.value,
                    });
                }
            }

            if (entriesUpdate.length > 0) {
                this.actor.updateEmbeddedEntity('OwnedItem', entriesUpdate);
            }
        }
    }

    /**
     * Prepares the equipment list of the actor.
     * @param sheetData Data of the sheet.
     */
    _getEquipment(sheetData): any {
        const equipment = {
            weapon: {
                label: game.i18n.localize('PF2E.InventoryWeaponsHeader'),
                type: 'weapon',
                items: [],
            },
            armor: {
                label: game.i18n.localize('PF2E.InventoryArmorHeader'),
                type: 'armor',
                items: [],
            },
            equipment: {
                label: game.i18n.localize('PF2E.InventoryEquipmentHeader'),
                type: 'equipment',
                items: [],
            },
            consumable: {
                label: game.i18n.localize('PF2E.InventoryConsumablesHeader'),
                type: 'consumable',
                items: [],
            },
            treasure: {
                label: game.i18n.localize('PF2E.InventoryTreasureHeader'),
                type: 'treasure',
                items: [],
            },
        };

        for (const i of sheetData.actor.items) {
            const item = i as PF2EItem;

            if (item === undefined || item === null) continue;

            if (!this._isEquipment(item)) continue;

            equipment[item.type].items.push(item);
        }

        return equipment;
    }

    /**
     * Checks if an item is an equipment or not.
     * @param item Item to check.
     */
    private _isEquipment(item: PF2EItem): boolean {
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

        customModifiers.all = (customModifiers.all ?? []).filter((m) => !['Weak', 'Elite'].includes(m.name));

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
        const isInverseToAdjustment = lastValue === modifier * -1;

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

        const spellDc = item.data.spelldc.dc;

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
        if (spellDamage) {
            if (spellLevel === 0 || spellName.includes('at will')) {
                spellDmgAdjustmentMod = 1;
            } else {
                spellDmgAdjustmentMod = 2;
            }

            const lastTwoChars = spellDamage.slice(-2);

            if (parseInt(lastTwoChars, 10) === modifier * spellDmgAdjustmentMod * -1) {
                item.data.damage.value = spellDamage.slice(0, -2);
            } else {
                item.data.damage.value = spellDamage + (adjustmentSign ? '+' : '') + modifier * spellDmgAdjustmentMod;
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
            return `DC ${parseInt(number, 10) + modifier}`;
        });

        // Assuming that all abilities with damage in the description are damage attacks that cant be done each turn and as increase twice as much.
        actionDescr = actionDescr.replace(/(\d+)?d(\d+)([+-]\d+)?(\s+[a-z]+[\s.,])?/g, (match, a, b, c, d) => {
            // match: '1d4+1 rounds.', a: 1, b: 4, c: '+1', d: ' rounds.'
            const bonus = parseInt(c, 10);
            if (d?.substring(1, 7) !== 'rounds') {
                if (Number.isNaN(bonus)) {
                    // c is empty in this case so dont need to add
                    c = (adjustmentSign ? '+' : '') + modifier * 2;
                } else if (bonus === modifier * 2 * -1) {
                    c = '';
                } else {
                    const newC = bonus + modifier * 2;
                    c = newC === 0 ? '' : `${newC > 0 ? '+' : ''}${newC}`;
                }
            } else if (c === undefined) {
                c = '';
            }
            return `${a || ''}d${b}${c}${d || ''}`;
        });

        item.data.description.value = actionDescr;
    }

    _isWeak() {
        const traits = getProperty(this.actor.data.data, 'traits.traits.value') || [];
        for (const trait of traits) {
            if (trait === 'weak') return true;
        }
        return false;
    }

    _isElite() {
        const traits = getProperty(this.actor.data.data, 'traits.traits.value') || [];
        for (const trait of traits) {
            if (trait === 'elite') return true;
        }
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
            bonus,
        };
        const speaker = ChatMessage.getSpeaker(this);

        DicePF2e.d20Roll({
            event,
            parts,
            data,
            title,
            speaker,
        });
    }

    rollNPCSkill(event, skillId) {
        const skill = this.actor.data.data.skills[skillId];

        if (skill === undefined) return;

        if (skill.roll) {
            const opts = this.actor.getRollOptions(['all', 'skill-check', SKILL_DICTIONARY[skillId] ?? skillId]);
            const extraOptions = $(event.currentTarget).attr('data-options');

            if (extraOptions) {
                const split = extraOptions
                    .split(',')
                    .map((o) => o.trim())
                    .filter((o) => !!o);
                opts.push(...split);
            }

            skill.roll(event, opts);
        } else {
            this.actor.rollSkill(event, skillId);
        }
    }

    rollSave(event, saveId) {
        this.actor.rollSave(event, saveId);
    }

    // ----

    // EVENTS

    _onTraitEditClicked(eventData) {
        eventData.preventDefault();

        const a = $(eventData.currentTarget);
        const options = {
            name: a.parents('div').attr('for'),
            title: a.parent().text().trim(),
            choices: CONFIG.PF2E[a.attr('data-options')],
            has_values: a.attr('data-has-values') === 'true',
            allow_empty_values: a.attr('data-allow-empty-values') === 'true',
            has_exceptions: a.attr('data-has-exceptions') === 'true',
        };
        new TraitSelector5e(this.actor, options).render(true);
    }

    _onRollableClicked(eventData: Event) {
        eventData.preventDefault();

        const attribute = $(eventData.currentTarget).parent().attr('data-attribute');
        const skill = $(eventData.currentTarget).parent().attr('data-skill');
        const save = $(eventData.currentTarget).parent().attr('data-save');
        const action = $(eventData.currentTarget).parent().parent().attr('data-action');
        const item = $(eventData.currentTarget).parent().parent().attr('data-item');
        const spell = $(eventData.currentTarget).parent().parent().attr('data-spell');

        if (attribute) {
            switch (attribute) {
                case 'perception':
                    this._onPerceptionLabelClicked(eventData);
                    break;
                case 'str':
                    this._onAbilityClicked(eventData, attribute);
                    break;
                case 'dex':
                    this._onAbilityClicked(eventData, attribute);
                    break;
                case 'con':
                    this._onAbilityClicked(eventData, attribute);
                    break;
                case 'int':
                    this._onAbilityClicked(eventData, attribute);
                    break;
                case 'wis':
                    this._onAbilityClicked(eventData, attribute);
                    break;
                case 'cha':
                    this._onAbilityClicked(eventData, attribute);
                    break;
                default:
                    break;
            }
        } else if (skill) {
            this.rollNPCSkill(eventData, skill);
        } else if (save) {
            this._onSaveClicked(eventData, save);
        } else if (action) {
            this._onActionClicked(eventData, action);
        } else if (item) {
            this._onItemClicked(eventData, item);
        } else if (spell) {
            this._onSpellClicked(eventData, spell);
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
        this._showControls(eventData);
    }

    _onAttackHoverEnds(eventData) {
        this._hideControls(eventData);
    }

    _onActionHovered(eventData) {
        this._showControls(eventData);
    }

    _onActionHoverEnds(eventData) {
        this._hideControls(eventData);
    }

    _onItemHovered(eventData) {
        this._showControls(eventData);
    }

    _onItemHoverEnds(eventData) {
        this._hideControls(eventData);
    }

    private _onSpellHoverEnds(eventData: any) {
        this._hideControls(eventData);
    }

    private _onSpellHovered(eventData: any) {
        this._showControls(eventData);
    }

    private _hideControls(eventData: any) {
        const controls = $(eventData.currentTarget).find('.controls');

        if (controls === undefined) return;

        controls.removeClass('expanded');
    }

    private _showControls(eventData: any) {
        const controls = $(eventData.currentTarget).find('.controls');

        if (controls === undefined) return;

        controls.addClass('expanded');
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
            has_values: htmlElement.attr('data-has-values') === 'true',
            allow_empty_values: true,
            has_exceptions: false,
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
            has_exceptions: false,
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

        const options = {};
        const skillsEditor = new NPCSkillsEditor(this.actor, options);

        skillsEditor.render(true);
    }

    _onSaveClicked(eventData, saveId) {
        this.rollSave(eventData, saveId);
    }

    _onSpeedEditClicked(eventData) {
        eventData.preventDefault();
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize('PF2.Speed'),
            choices: CONFIG.PF2E.speedTypes,
            has_values: 'true',
            allow_empty_values: false,
            has_exceptions: false,
        };

        new TraitSelector5e(this.actor, options).render(true);
    }

    _onWeaknessesEditClicked(eventData) {
        eventData.preventDefault();
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize('PF2E.WeaknessesLabel'),
            choices: CONFIG.PF2E.weaknessTypes,
            has_values: true,
            allow_empty_values: false,
            has_exceptions: false,
        };

        new TraitSelector5e(this.actor, options).render(true);
    }

    _onResistancesEditClicked(eventData) {
        eventData.preventDefault();
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize('PF2E.ResistancesLabel'),
            choices: CONFIG.PF2E.resistanceTypes,
            has_values: true,
            allow_empty_values: false,
            has_exceptions: false,
        };

        new TraitSelector5e(this.actor, options).render(true);
    }

    _onImmunitiesEditClicked(eventData) {
        eventData.preventDefault();
        const htmlElement = $(eventData.currentTarget);
        const options = {
            name: htmlElement.parents('div').attr('for'),
            title: game.i18n.localize('PF2E.ImmunitiesLabel'),
            choices: CONFIG.PF2E.immunityTypes,
            has_values: false,
            allow_empty_values: true,
            has_exceptions: false,
        };

        new TraitSelector5e(this.actor, options).render(true);
    }

    private _onAddActionClicked(eventData: Event) {}

    private _onAddTreasureClicked(eventData: Event) {
        const itemType = 'treasure';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    private _onAddConsumableClicked(eventData: Event) {
        const itemType = 'consumable';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    private _onAddEquipmentClicked(eventData: Event) {
        const itemType = 'equipment';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    private _onAddArmorClicked(eventData: Event) {
        const itemType = 'armor';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    private _onAddWeaponClicked(eventData: Event) {
        const itemType = 'weapon';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    _onActionClicked(eventData, actionId) {
        const actionDetails = $(eventData.currentTarget).parent().parent().find('.action-detail');

        const isExpanded = actionDetails.hasClass('expanded');

        if (isExpanded) {
            actionDetails.slideUp(200, () => {
                actionDetails.removeClass('expanded');
            });
        } else {
            actionDetails.addClass('expanded');
            actionDetails.slideDown(200);
        }
    }

    _onItemClicked(eventData, itemId) {
        const itemDetails = $(eventData.currentTarget).parent().parent().find('.item-detail');

        const isExpanded = itemDetails.hasClass('expanded');

        if (isExpanded) {
            itemDetails.slideUp(200, () => {
                itemDetails.removeClass('expanded');
            });
        } else {
            itemDetails.addClass('expanded');
            itemDetails.slideDown(200);
        }
    }

    private _onSpellClicked(eventData: any, spell: string) {
        const spellDetails = $(eventData.currentTarget).parent().parent().find('.spell-detail');

        const isExpanded = spellDetails.hasClass('expanded');

        if (isExpanded) {
            spellDetails.slideUp(200, () => {
                spellDetails.removeClass('expanded');
            });
        } else {
            spellDetails.addClass('expanded');
            spellDetails.slideDown(200);
        }
    }

    private _onSendToChatClicked(eventData: JQuery.ClickEvent) {
        eventData.preventDefault();

        const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
        const item = this.actor.getOwnedItem(itemId);

        if (item !== undefined) {
            if (item instanceof PF2EPhysicalItem && !item.isIdentified) {
                return;
            }

            item.roll(eventData);
        } else {
            console.error(`Clicked item with ID ${itemId}, but unable to find item with that ID.`);
        }
    }

    private _onWeakAdjustmentClicked(eventData: Event) {
        eventData.preventDefault();

        const container = $(eventData.currentTarget).parents('.adjustment-select');

        const eliteButton = container.find('.elite');
        const weakButton = container.find('.weak');

        const isCurrentlyElite = eliteButton.hasClass('active');
        const isAlreadyWeak = weakButton.hasClass('active');

        if (isCurrentlyElite) {
            eliteButton.removeClass('active');
        }

        if (isAlreadyWeak) {
            // Revert to normal
            weakButton.removeClass('active');

            this.npcAdjustment(true);
        } else {
            // Apply weak
            //weakButton.addClass('active');

            this.npcAdjustment(false);
        }
    }

    private _onEliteAdjustmentClicked(eventData: Event) {
        eventData.preventDefault();

        const container = $(eventData.currentTarget).parents('.adjustment-select');

        const eliteButton = container.find('.elite');
        const weakButton = container.find('.weak');

        const isCurrentlyWeak = weakButton.hasClass('active');
        const isAlreadyElite = eliteButton.hasClass('active');

        if (isCurrentlyWeak) {
            weakButton.removeClass('active');
        }

        if (isAlreadyElite) {
            // Revert to normal
            eliteButton.removeClass('active');

            this.npcAdjustment(false);
        } else {
            // Apply elite
            //eliteButton.addClass('active');

            this.npcAdjustment(true);
        }
    }

    /**
     * Increases the NPC via the Elite/Weak adjustment rules
     */
    npcAdjustment(increase) {
        let actorData = duplicate(this.actor.data);
        const tokenData = this.token !== null ? duplicate(this.token.data) : duplicate(this.actor.data.token);
        const traits = getProperty(actorData.data, 'traits.traits.value') || [];
        let traitsAdjusted = false;
        let tokenScale = 1;
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
                actorData.name = `Elite ${actorData.name}`;
                tokenData.name = `Elite ${tokenData.name}`;
                tokenScale = 1.2;
            } else {
                if (actorData.name.startsWith('Weak ')) actorData.name = actorData.name.slice(5);
                if (tokenData.name.startsWith('Weak ')) tokenData.name = tokenData.name.slice(5);
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
                actorData.name = `Weak ${actorData.name}`;
                tokenData.name = `Weak ${tokenData.name}`;
                tokenScale = 0.8;
            } else {
                if (actorData.name.startsWith('Elite ')) actorData.name = actorData.name.slice(6);
                if (tokenData.name.startsWith('Elite ')) tokenData.name = tokenData.name.slice(6);
                adjustBackToNormal = true;
            }
        }

        actorData.data.traits.traits.value = traits;
        actorData = this._applyAdjustmentToData(actorData, increase, adjustBackToNormal);

        if (this.token === null) {
            // Then we need to apply this to the token prototype
            this.actor.update({
                'token.name': tokenData.name,
                'token.scale': tokenScale,
            });
        } else {
            this.token.update({
                name: tokenData.name,
                scale: tokenScale,
            });
        }

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
        const { imageUrl, actionGlyph } = PF2EActor.getActionGraphics(
            (item as any).data?.actionType?.value || 'action',
            parseInt(((item as any).data?.actions || {}).value, 10) || 1,
        );

        item.glyph = actionGlyph;
        item.imageUrl = imageUrl;
    }
}
