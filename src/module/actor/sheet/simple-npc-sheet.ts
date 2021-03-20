import { CreatureSheetPF2e } from './creature';
import { TraitSelector5e } from '@system/trait-selector';
import { DicePF2e } from '@scripts/dice';
import { ActorPF2e, SKILL_DICTIONARY } from '../base';
import { ModifierPF2e, MODIFIER_TYPE } from '@module/modifiers';
import { NPCSkillsEditor } from '@system/npc-skills-editor';
import { NPCPF2e } from '@actor/npc';
import { identifyCreature } from '@module/recall-knowledge';
import { ItemPF2e } from '@item/base';
import { PhysicalItemPF2e } from '@item/physical';
import {
    Abilities,
    AbilityString,
    CreatureTraitsData,
    LabeledValue,
    NPCData,
    NPCSkillData,
    NPCStrike,
    RawNPCData,
    SaveString,
    SkillAbbreviation,
} from '@actor/data-definitions';
import {
    ActionData,
    ActionDetailsData,
    ItemDataPF2e,
    MeleeData,
    SpellcastingEntryData,
    SpellData,
    WeaponData,
} from '@item/data-definitions';
import { objectHasKey } from '@module/utils';

interface NPCSheetLabeledValue extends LabeledValue {
    localizedName?: string;
}

interface ActionsDetails {
    label: string;
    actions: ItemDataPF2e[];
}

interface ActionActions {
    passive: ActionsDetails;
    free: ActionsDetails;
    reaction: ActionsDetails;
    action: ActionsDetails;
}

interface Attack {
    attack: NPCStrike;
    traits: {
        label: string;
        description: string;
    }[];
}

type Attacks = Attack[];

/** Additional fields added in sheet data preparation */
interface SheetEnrichedNPCData extends NPCData {
    actions: ActionActions;
    attacks: Attacks;
    data: RawNPCData & {
        details: {
            alignment: {
                localizedName?: string;
            };
            rarity: string;
        };
        sortedSkills: Record<string, NPCSkillData>;
        traits: CreatureTraitsData & {
            senses: {
                value: NPCSheetLabeledValue | string;
            };
            size: {
                localizedName?: string;
            };
        };
    };
    items: ItemDataPF2e[] & SheetEnrichedItemData[];
    spellcastingEntries: SheetEnrichedSpellcastingEntryData[];
    orphanedSpells: boolean;
    orphanedSpellbook: any;
}

interface SheetEnrichedItemData {
    glyph: string;
    imageUrl: string;
    traits: {
        label: string;
        description: string;
    }[];
    data: {
        components: {
            somatic: boolean;
            verbal: boolean;
            material: boolean;
        };
        bonus: {
            value: number;
            total?: number;
        };
        isAgile?: boolean;
        prepared?: boolean;
        tradition?: {
            ritual: boolean;
        };
        weaponType?: string;
    };
}

interface SheetEnrichedSpellcastingEntryData extends SpellcastingEntryData {
    spellbook: any;
}

export class ActorSheetPF2eSimpleNPC extends CreatureSheetPF2e<NPCPF2e> {
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
    protected prepareItems(actorData: SheetEnrichedNPCData) {
        const monsterTraits = actorData.data.traits.traits;

        this.prepareAbilities(actorData.data.abilities);
        this.prepareMonsterTraits(monsterTraits);
        this.prepareSize(actorData);
        this.prepareAlignment(actorData);
        this.prepareRarity(actorData);
        this.preparePerception(actorData);
        //this.prepareSenses(actorData); Keep senses as strings until we have a better trait selector
        this.prepareLanguages(actorData.data.traits.languages);
        this.prepareSkills(actorData);
        this.prepareSpeeds(actorData);
        this.prepareImmunities(actorData);
        this.prepareSaves(actorData);
        this.prepareActions(actorData);
        this.prepareAttacks(actorData);
        this.prepareSpellcasting(actorData);
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
            .map((skillAcronym) => CONFIG.PF2E.skills[skillAcronym as SkillAbbreviation]);
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

        const equipment = this.getEquipment(sheetData);

        sheetData.actor.equipment = equipment;

        if (equipment.length > 0) {
            sheetData.hasEquipment = true;
        }

        const isElite = this.isElite();
        const isWeak = this.isWeak();

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
    activateListeners(html: JQuery<HTMLElement>) {
        super.activateListeners(html);

        // Subscribe to roll events
        html.find('.rollable').on('click', (event) => this.onRollableClicked(event));
        html.find('button').on('click', (event) => this.onButtonClicked(event));
        html.find('a.chat').on('click', (event) => this.onSendToChatClicked(event));

        html.find('.attack')
            .on('mouseenter', (event) => this.onAttackHovered(event))
            .on('mouseleave', (event) => this.onAttackHoverEnds(event));
        html.find('.action')
            .on('mouseenter', (event) => this.onActionHovered(event))
            .on('mouseleave', (event) => this.onActionHoverEnds(event));
        html.find('.npc-item')
            .on('mouseenter', (event) => this.onItemHovered(event))
            .on('mouseleave', (event) => this.onItemHoverEnds(event));
        html.find('.spell')
            .on('mouseenter', (event) => this.onSpellHovered(event))
            .on('mouseleave', (event) => this.onSpellHoverEnds(event));

        // Don't subscribe to edit buttons it the sheet is NOT editable
        if (!this.options.editable) return;

        html.find('.trait-edit').on('click', (event) => this.onTraitEditClicked(event));
        html.find('.languages-edit').on('click', (event) => this.onLanguagesClicked(event));
        html.find('.senses-edit').on('click', (event) => this.onSensesEditClicked(event));
        html.find('.skills-edit').on('click', (event) => this.onSkillsEditClicked(event));
        html.find('.speed-edit').on('click', (event) => this.onSpeedEditClicked(event));
        html.find('.weaknesses-edit').on('click', (event) => this.onWeaknessesEditClicked(event));
        html.find('.resistances-edit').on('click', (event) => this.onResistancesEditClicked(event));
        html.find('.immunities-edit').on('click', (event) => this.onImmunitiesEditClicked(event));
        html.find('.action-add').on('click', (event) => this.onAddActionClicked(event));
        html.find('.add-weapon').on('click', (event) => this.onAddWeaponClicked(event));
        html.find('.add-armor').on('click', (event) => this.onAddArmorClicked(event));
        html.find('.add-equipment').on('click', (event) => this.onAddEquipmentClicked(event));
        html.find('.add-consumable').on('click', (event) => this.onAddConsumableClicked(event));
        html.find('.add-treasure').on('click', (event) => this.onAddTreasureClicked(event));

        // Adjustments
        html.find('.npc-elite-adjustment').on('click', (event) => this.onEliteAdjustmentClicked(event));
        html.find('.npc-weak-adjustment').on('click', (event) => this.onWeakAdjustmentClicked(event));
    }

    // TRAITS MANAGEMENT

    protected prepareAbilities(abilities: Abilities) {
        Object.entries(abilities).forEach(([key, data]) => {
            const localizedCode = game.i18n.localize(`PF2E.AbilityId.${key}`);
            const nameKey = this.getAbilityNameKey(key as AbilityString);
            const localizedName = game.i18n.localize(nameKey);

            data.localizedCode = localizedCode;
            data.localizedName = localizedName;
        });
    }

    protected prepareMonsterTraits(traits: any) {
        traits.localizationMap = {};

        for (const trait of traits.value) {
            const localizationKey = this.getMonsterTraitLocalizationKey(trait);
            const localizedName = game.i18n.localize(localizationKey);

            traits.localizationMap[trait] = localizedName;
        }
    }

    protected prepareSize(actorData: SheetEnrichedNPCData) {
        const size = actorData.data.traits.size.value;
        const localizationKey = this.getSizeLocalizedKey(size);
        const localizedName = game.i18n.localize(localizationKey);

        actorData.data.traits.size.localizedName = localizedName;
    }

    protected prepareAlignment(actorData: SheetEnrichedNPCData) {
        const alignmentCode = actorData.data.details.alignment.value;
        const localizedName = game.i18n.localize(`PF2E.Alignment${alignmentCode}`);

        actorData.data.details.alignment.localizedName = localizedName;
    }

    protected prepareRarity(actorData: SheetEnrichedNPCData) {
        if (actorData.data.details.rarity === undefined) {
            actorData.data.details.rarity = 'normal';
        }
    }

    protected preparePerception(actorData: SheetEnrichedNPCData) {
        const perception = actorData.data.attributes.perception;

        if (perception.base !== undefined && perception.base > 0) {
            perception.readableValue = `+${perception.base}`;
        } else {
            perception.readableValue = perception.base;
        }
    }

    protected prepareSenses(actorData: SheetEnrichedNPCData) {
        // Try to convert old legacy senses to new, array-like senses
        if (typeof actorData.data.traits.senses.value === 'string') {
            const reformattedSenses = this.createSensesFromString(actorData.data.traits.senses.value);

            (actorData.data.traits.senses as NPCSheetLabeledValue[]) = reformattedSenses;
        }

        const configSenses = CONFIG.PF2E.senses;
        for (const sense of actorData.data.traits.senses as NPCSheetLabeledValue[]) {
            sense.localizedName = objectHasKey(configSenses, sense.type) ? configSenses[sense.type] : sense.type;
        }
    }

    protected createSensesFromString(sensesText: string): NPCSheetLabeledValue[] {
        const senses: NPCSheetLabeledValue[] = [];
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

            const sense: NPCSheetLabeledValue = {
                type: type.trim(),
                label: type.trim(),
                value: value.trim(),
            };

            if (sense.type && sense.label && sense.value) {
                senses.push(sense);
            }
        }

        return senses;
    }

    protected prepareLanguages(languages: any) {
        languages.localizedNames = {};
        const configLanguages = CONFIG.PF2E.languages;
        for (const language of Object.keys(languages.selected)) {
            if (objectHasKey(configLanguages, language)) {
                const localizedName = CONFIG.PF2E.languages[language];

                languages.localizedNames[language] = localizedName;
            }
        }
    }

    protected prepareSkills(actorData: SheetEnrichedNPCData) {
        // Prepare a list of skill IDs sorted by their localized name
        // This will help in displaying the skills in alphabetical order in the sheet
        const sortedSkillsIds = duplicate(Object.keys(actorData.data.skills));

        const skills = duplicate(actorData.data.skills);
        for (const skillId of sortedSkillsIds) {
            skills[skillId].label = game.i18n.localize('PF2E.Skill' + skills[skillId].name);
        }

        sortedSkillsIds.sort((a: string, b: string) => {
            const skillA = skills[a];
            const skillB = skills[b];

            if (skillA.label < skillB.label) return -1;
            if (skillA.label > skillB.label) return 1;

            return 0;
        });

        const sortedSkills: Record<string, NPCSkillData> = {};

        for (const skillId of sortedSkillsIds) {
            sortedSkills[skillId] = skills[skillId];
        }

        actorData.data.sortedSkills = sortedSkills;
    }

    protected prepareSpeeds(actorData: SheetEnrichedNPCData) {
        const configSpeedTypes = CONFIG.PF2E.speedTypes;
        actorData.data.attributes.speed.otherSpeeds.forEach((speed) => {
            // Try to convert it to a recognizable speed name
            // This is done to recognize speed types for NPCs from the compendium
            const speedName: string = speed.type.trim().toLowerCase().replace(/\s+/g, '-');
            let value = speed.value;
            if (typeof value === 'string' && value.includes('feet')) {
                value = value.replace('feet', '').trim(); // Remove `feet` at the end, wi will localize it later
            }
            speed.label = objectHasKey(configSpeedTypes, speedName) ? configSpeedTypes[speedName] : '';
        });
        // Make sure regular speed has no `feet` at the end, we will add it localized later on
        // This is usally the case for NPCs from the compendium
        if (typeof actorData.data.attributes.speed.value === 'string') {
            actorData.data.attributes.speed.value = actorData.data.attributes.speed.value.replace('feet', '').trim();
        }
    }

    protected prepareWeaknesses(actorData: SheetEnrichedNPCData) {
        const configWeaknessTypes = CONFIG.PF2E.weaknessTypes;
        actorData.data.traits.dv.forEach((weakness) => {
            weakness.label = objectHasKey(configWeaknessTypes, weakness.type) ? configWeaknessTypes[weakness.type] : '';
        });
    }

    protected prepareResistances(actorData: SheetEnrichedNPCData) {
        const configResistanceTypes = CONFIG.PF2E.resistanceTypes;
        actorData.data.traits.dr.forEach((resistance) => {
            resistance.label = objectHasKey(configResistanceTypes, resistance.type)
                ? configResistanceTypes[resistance.type]
                : '';
        });
    }

    protected prepareImmunities(actorData: SheetEnrichedNPCData) {
        // Try to localize values to show the correct text in the sheet
        // Immunities are store as a simple string array, so we use parallel array
        // for storing the label values, not like we do with resistances and weaknesses
        const configImmunityTypes = CONFIG.PF2E.immunityTypes;

        const labels = actorData.data.traits.di.value.map((immunity) => {
            const value = immunity.trim();
            const label = objectHasKey(configImmunityTypes, value) ? configImmunityTypes[value] : value;

            return label;
        });
        if (actorData.data.traits.di.custom) {
            labels.push(actorData.data.traits.di.custom);
        }

        (actorData as any).data.traits.di.labels = labels;
    }

    protected prepareSaves(actorData: SheetEnrichedNPCData) {
        if (actorData.data.saves === undefined) return;

        const fortitude = actorData.data.saves.fortitude;
        const reflex = actorData.data.saves.reflex;
        const will = actorData.data.saves.will;

        fortitude.labelShort = game.i18n.localize('PF2E.SavesFortitudeShort');
        reflex.labelShort = game.i18n.localize('PF2E.SavesReflexShort');
        will.labelShort = game.i18n.localize('PF2E.SavesWillShort');
    }

    /**
     * Prepares the actions list to be accessible from the sheet.
     * @param actorData Data of the actor to be shown in the sheet.
     */
    protected prepareActions(actorData: SheetEnrichedNPCData) {
        const actions: ActionActions = {
            passive: { label: game.i18n.localize('PF2E.ActionTypePassive'), actions: [] },
            free: { label: game.i18n.localize('PF2E.ActionTypeFree'), actions: [] },
            reaction: { label: game.i18n.localize('PF2E.ActionTypeReaction'), actions: [] },
            action: { label: game.i18n.localize('PF2E.ActionTypeAction'), actions: [] },
        };

        actorData?.items
            .filter((item) => item.type === 'action')
            .forEach((item) => {
                // Format action traits
                const configTraitDescriptions = CONFIG.PF2E.traitsDescriptions;
                const configWeaponTraits = CONFIG.PF2E.weaponTraits;

                const traits = item.data.traits.value.map((traitString) => {
                    const label = objectHasKey(configWeaponTraits, traitString)
                        ? CONFIG.PF2E.weaponTraits[traitString]
                        : traitString.charAt(0).toUpperCase() + traitString.slice(1);

                    const description = objectHasKey(configTraitDescriptions, traitString)
                        ? configTraitDescriptions[traitString]
                        : '';

                    const trait = {
                        label,
                        description,
                    };

                    return trait;
                });

                // Create trait with the type of action
                const itemData = item.data as ActionDetailsData;
                const hasType = itemData.actionType && itemData.actionType.value;

                if (hasType) {
                    const actionTrait = itemData.actionType.value;
                    const label = objectHasKey(configWeaponTraits, actionTrait)
                        ? configWeaponTraits[actionTrait]
                        : actionTrait.charAt(0).toUpperCase() + actionTrait.slice(1);
                    const description = objectHasKey(configTraitDescriptions, actionTrait)
                        ? configTraitDescriptions[actionTrait]
                        : '';

                    const trait = {
                        label,
                        description,
                    };

                    traits.splice(0, 0, trait);
                }

                // Don't know the purpose of this, coppied from previous code
                (item as ItemDataPF2e & SheetEnrichedItemData).traits = traits.filter((p) => !!p);

                // Select appropiate image for the action, based on type of action
                const actionType = itemData.actionType.value || 'action'; // Default to action if not set

                this.assignActionGraphics(item as ActionData & SheetEnrichedItemData);

                if (objectHasKey(actions, actionType)) {
                    actions[actionType].actions.push(item);
                }
            });

        actorData.actions = actions;
    }

    protected prepareAttacks(actorData: SheetEnrichedNPCData) {
        const attacks: Attacks = [];

        const configTraitDescriptions = CONFIG.PF2E.traitsDescriptions;

        actorData?.data?.actions.forEach((attack) => {
            let traits = attack.traits.map((strikeTrait) => {
                const description = objectHasKey(configTraitDescriptions, strikeTrait.name)
                    ? configTraitDescriptions[strikeTrait.name]
                    : '';

                const trait = {
                    label: strikeTrait.label,
                    description,
                };
                return trait;
            });

            traits = traits.sort((a, b) => {
                if (a.label < b.label) return -1;
                if (a.label > b.label) return 1;
                return 0;
            });
            attacks.push({ attack, traits });
        });

        actorData.attacks = attacks;
    }

    /**
     * Prepare spells and spell entries
     * @param actorData Data of the actor to show in the sheet.
     */
    protected prepareSpellcasting(actorData: SheetEnrichedNPCData) {
        const spellsList: SpellData[] & SheetEnrichedItemData[] = [];
        const spellEntriesList: string[] = [];
        const spellbooks: any = [];

        spellbooks.unassigned = {};

        for (const item of actorData.items) {
            if (item.type === 'spell') {
                spellsList.push(item);
            } else if (item.type === 'spellcastingEntry') {
                spellEntriesList.push(item._id);

                const isPrepared = (item.data.prepared || {}).value === 'prepared';
                const isRitual = (item.data.tradition || {}).value === 'ritual';

                (item.data.prepared as boolean) = isPrepared;
                item.data.tradition.ritual = isRitual;
            }
        }

        // Contains all updates to perform over items after processing
        const updateData = [];

        // Assign spells to spell entries
        for (const spell of spellsList) {
            const spellType = spell.data.time.value;

            // Assign icon based on spell type
            if (spellType === 'reaction') {
                spell.glyph = ActorPF2e.getActionGraphics(spellType).actionGlyph;
            } else if (spellType === 'free') {
                spell.glyph = ActorPF2e.getActionGraphics(spellType).actionGlyph;
            } else {
                const actionsCost = parseInt(spellType, 10);
                spell.glyph = ActorPF2e.getActionGraphics('action', actionsCost).actionGlyph;
            }

            // Assign components
            spell.data.components.somatic = spell.data.components.value.includes('somatic');
            spell.data.components.verbal = spell.data.components.value.includes('verbal');
            spell.data.components.material = spell.data.components.value.includes('material');

            let location = spell.data.location.value;
            let spellbook: any;
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

            this.prepareSpell(actorData, spellbook, spell);
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

        const spellcastingEntries: SheetEnrichedSpellcastingEntryData[] = [];

        for (const entryId of spellEntriesList) {
            const entry = actorData.items.find((i) => i._id === entryId) as SheetEnrichedSpellcastingEntryData;

            if (entry === null || entry === undefined) {
                console.error(`Failed to find spell casting entry with ID ${entryId}`);
                continue;
            }

            const spellbook = spellbooks[entry._id];
            entry.spellbook = spellbook;

            spellcastingEntries.push(entry);
        }

        actorData.spellcastingEntries = spellcastingEntries;

        const actorDataData = actorData.data as any;
        if (actorDataData.items) {
            const entriesUpdate = [];

            // Update values of the entry with values from the sheet
            // This is done here because we can't modify the entity from the sheet
            // so we store the values in data.items and update the original
            // item here.
            for (const entryId of Object.keys(actorDataData.items)) {
                const originalEntry = actorData.items.find((i: ItemDataPF2e) => i._id === entryId);
                const newEntry = actorDataData.items[entryId];

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
    protected getEquipment(sheetData: any): any {
        const equipment = {
            weapon: {
                label: game.i18n.localize('PF2E.InventoryWeaponsHeader'),
                type: 'weapon',
                items: [] as ItemPF2e[],
            },
            armor: {
                label: game.i18n.localize('PF2E.InventoryArmorHeader'),
                type: 'armor',
                items: [] as ItemPF2e[],
            },
            equipment: {
                label: game.i18n.localize('PF2E.InventoryEquipmentHeader'),
                type: 'equipment',
                items: [] as ItemPF2e[],
            },
            consumable: {
                label: game.i18n.localize('PF2E.InventoryConsumablesHeader'),
                type: 'consumable',
                items: [] as ItemPF2e[],
            },
            treasure: {
                label: game.i18n.localize('PF2E.InventoryTreasureHeader'),
                type: 'treasure',
                items: [] as ItemPF2e[],
            },
        };

        for (const i of sheetData.actor.items) {
            const item = i as ItemPF2e;

            if (item === undefined || item === null) continue;

            if (!this.isEquipment(item)) continue;

            if (objectHasKey(equipment, item.type)) {
                equipment[item.type].items.push(item);
            }
        }

        return equipment;
    }

    /**
     * Checks if an item is an equipment or not.
     * @param item Item to check.
     */
    protected isEquipment(item: ItemPF2e): boolean {
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
    protected applyAdjustments(
        actorData: SheetEnrichedNPCData,
        adjustmentSign: number,
        revertToNormal: boolean,
    ): SheetEnrichedNPCData {
        const isWeak = adjustmentSign < 0;
        const isElite = adjustmentSign > 0;

        const npcModifier = adjustmentSign * 2;

        // Use custom modifiers
        const customModifiers = actorData.data.customModifiers ?? {};

        customModifiers.all = (customModifiers.all ?? []).filter((m) => !['Weak', 'Elite'].includes(m.name));

        // Add a new custom modifier
        if (!revertToNormal && (isWeak || isElite)) {
            const customModifierName = isWeak ? 'Weak' : 'Elite';
            const customModifier = new ModifierPF2e(customModifierName, npcModifier, MODIFIER_TYPE.UNTYPED);

            customModifiers.all.push(customModifier);
        }

        // Adjust HP based on level
        const levelAdjustment = adjustmentSign * 1;
        const currentLevel = Number(actorData.data.details.level.value);
        const originalLevel = revertToNormal ? currentLevel + levelAdjustment : currentLevel;

        this.adjustHP(actorData, adjustmentSign, originalLevel);

        actorData.data.details.level.value = currentLevel + levelAdjustment;

        // Adjust actions and spells
        for (const item of actorData.items) {
            if (item.type === 'melee') {
                this.adjustNPCAttack(item, adjustmentSign);
            } else if (item.type === 'spellcastingEntry') {
                this.adjustSpellcastingEntry(item, adjustmentSign);
            } else if (item.type === 'spell') {
                this.adjustSpell(item, adjustmentSign);
            } else if (item.type === 'action') {
                this.adjustAction(item, adjustmentSign);
            }
        }

        return actorData;
    }

    protected adjustHP(actorData: SheetEnrichedNPCData, adjustmentSign: number, originalLevel: number) {
        const currentHp = Number(actorData.data.attributes.hp.max);
        let hpAdjustment: number;

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

    protected adjustNPCAttack(item: MeleeData & SheetEnrichedItemData, adjustmentSign: number) {
        const modifier = 2 * adjustmentSign;

        if (modifier === 0) return;

        if (item === undefined) return;
        if (item.data === undefined) return;
        if (item.data.bonus === undefined) return;

        const attack = Number(item.data.bonus.value);

        if (attack === undefined) return;

        item.data.bonus.value = attack + modifier;
        item.data.bonus.total = item.data.bonus.value;

        if (item.data.damageRolls === undefined) return;
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

    protected adjustSpellcastingEntry(item: SpellcastingEntryData, adjustmentSign: number) {
        const modifier = adjustmentSign * 2;

        if (item.data === undefined) return;
        if (item.data.spelldc === undefined) return;
        if (item.data.spelldc.dc === undefined) return;

        const spellDc = Number(item.data.spelldc.dc);

        if (spellDc === undefined) return;

        item.data.spelldc.dc = spellDc + modifier;

        const spellAttack = Number(item.data.spelldc.value);

        if (spellAttack === undefined) return;

        item.data.spelldc.value = spellAttack + modifier;
    }

    protected adjustSpell(item: SpellData, adjustmentSign: number) {
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

    protected adjustAction(item: ActionData, adjustmentSign: number) {
        const modifier = adjustmentSign * 2;

        if (modifier === 0) return;

        if (item.data.description === undefined) return;

        let actionDescr = item.data.description.value;

        if (actionDescr === undefined) return;

        actionDescr = actionDescr.replace(/DC (\d+)+/g, (_match, number: string) => {
            return `DC ${parseInt(number, 10) + modifier}`;
        });

        // Assuming that all abilities with damage in the description are damage attacks that cant be done each turn and as increase twice as much.
        actionDescr = actionDescr.replace(
            /(\d+)?d(\d+)([+-]\d+)?(\s+[a-z]+[\s.,])?/g,
            (_match, a: string, b: string, c: string, d: string) => {
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
            },
        );

        item.data.description.value = actionDescr;
    }

    protected isWeak(): boolean {
        const traits: string[] = getProperty(this.actor.data.data, 'traits.traits.value') || [];
        return traits.some((trait) => trait === 'weak');
    }

    protected isElite(): boolean {
        const traits: string[] = getProperty(this.actor.data.data, 'traits.traits.value') || [];
        return traits.some((trait) => trait === 'elite');
    }

    protected getMonsterTraitLocalizationKey(trait: string): string {
        const monsterTraits = CONFIG.PF2E.monsterTraits;
        return objectHasKey(monsterTraits, trait) ? monsterTraits[trait] : '';
    }

    protected getSizeLocalizedKey(size: string): string {
        const actorSizes = CONFIG.PF2E.actorSizes;
        return objectHasKey(actorSizes, size) ? actorSizes[size] : '';
    }

    protected getAbilityNameKey(abilityCode: AbilityString): string {
        return CONFIG.PF2E.abilities[abilityCode];
    }

    // ROLLS

    rollPerception(event: JQuery.ClickEvent) {
        const options = this.actor.getRollOptions(['all', 'perception-check']);
        const perception = this.actor.data.data.attributes.perception;
        if (perception?.roll) {
            perception.roll({ event, options });
        }
    }

    rollAbility(event: JQuery.ClickEvent, abilityId: AbilityString) {
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

    rollNPCSkill(event: JQuery.ClickEvent, skillId: SkillAbbreviation) {
        const skill = this.actor.data.data.skills[skillId];

        if (skill === undefined) return;

        if (skill.roll) {
            const opts = this.actor.getRollOptions([
                'all',
                'skill-check',
                SKILL_DICTIONARY[skillId as SkillAbbreviation] ?? skillId,
            ]);
            const extraOptions = $(event.currentTarget).attr('data-options');

            if (extraOptions) {
                const split = extraOptions
                    .split(',')
                    .map((o) => o.trim())
                    .filter((o) => !!o);
                opts.push(...split);
            }

            skill.roll({ event, options: opts });
        } else {
            this.actor.rollSkill(event, skillId);
        }
    }

    rollSave(event: JQuery.ClickEvent, saveId: SaveString) {
        const save = this.actor.data.data.saves[saveId];

        if (save?.roll) {
            const options = this.actor.getRollOptions(['all', 'saving-throw', saveId]);
            save.roll({ event, options });
        } else {
            this.actor.rollSave(event, saveId);
        }
    }

    // ----

    // EVENTS

    protected onTraitEditClicked(eventData: JQuery.ClickEvent) {
        eventData.preventDefault();

        const a = $(eventData.currentTarget);
        const config = CONFIG.PF2E;
        const traitType = a.parents('div').attr('data-attribute') ?? ''; //a.attr('data-options') ?? '';
        const choices: string[] = objectHasKey(config, traitType) ? (config[traitType] as string[]) : [];
        const options = {
            name: a.parents('div').attr('for'),
            title: a.parent().text().trim(),
            choices,
            has_values: a.attr('data-has-values') === 'true',
            allow_empty_values: a.attr('data-allow-empty-values') === 'true',
            has_exceptions: a.attr('data-has-exceptions') === 'true',
        };
        new TraitSelector5e(this.actor, options).render(true);
    }

    protected onRollableClicked(eventData: JQuery.ClickEvent) {
        eventData.preventDefault();

        const attribute = $(eventData.currentTarget).parent().attr('data-attribute');
        const skill = $(eventData.currentTarget).parent().attr('data-skill') as SkillAbbreviation;
        const save = $(eventData.currentTarget).parent().attr('data-save') as SaveString;
        const action = $(eventData.currentTarget).parent().parent().attr('data-action');
        const item = $(eventData.currentTarget).parent().parent().attr('data-item');
        const spell = $(eventData.currentTarget).parent().parent().attr('data-spell');

        if (attribute) {
            switch (attribute) {
                case 'perception':
                    this.onPerceptionLabelClicked(eventData);
                    break;
                case 'str':
                    this.onAbilityClicked(eventData, attribute);
                    break;
                case 'dex':
                    this.onAbilityClicked(eventData, attribute);
                    break;
                case 'con':
                    this.onAbilityClicked(eventData, attribute);
                    break;
                case 'int':
                    this.onAbilityClicked(eventData, attribute);
                    break;
                case 'wis':
                    this.onAbilityClicked(eventData, attribute);
                    break;
                case 'cha':
                    this.onAbilityClicked(eventData, attribute);
                    break;
                default:
                    break;
            }
        } else if (skill) {
            this.rollNPCSkill(eventData, skill);
        } else if (save) {
            this.onSaveClicked(eventData, save);
        } else if (action) {
            this.onActionClicked(eventData, action);
        } else if (item) {
            this.onItemClicked(eventData, item);
        } else if (spell) {
            this.onSpellClicked(eventData, spell);
        }
    }

    protected onButtonClicked(eventData: JQuery.ClickEvent) {
        eventData.preventDefault();
        eventData.stopPropagation();

        switch (eventData.target.dataset.action) {
            case 'npcAttack':
                this.onNPCAttackClicked(eventData);
                break;
            case 'damage':
                this.onNPCDamageClicked(eventData);
                break;
            case 'critical':
                this.onNPCCriticalClicked(eventData);
                break;
        }
    }

    protected onNPCAttackClicked(eventData: JQuery.ClickEvent) {
        const actionId = Number($(eventData.currentTarget).parents('.item').attr('data-action-id') ?? 0);
        const action = this.actor.data.data.actions[actionId];

        if (action) {
            const variant = Number($(eventData.currentTarget).attr('data-variant-index') ?? 0);
            const options = this.actor.getRollOptions(['all', 'attack-roll']);
            action.variants[variant].roll({ event: eventData, options });
        }
    }

    protected onNPCDamageClicked(eventData: JQuery.ClickEvent) {
        const actionId = Number($(eventData.currentTarget).parents('.item').attr('data-action-id') ?? 0);
        const action = this.actor.data.data.actions[actionId];

        if (action && action.damage !== undefined) {
            const options = this.actor.getRollOptions(['all', 'damage-roll']);
            action.damage({ event: eventData, options });
        }
    }

    protected onNPCCriticalClicked(eventData: JQuery.ClickEvent) {
        const actionId = Number($(eventData.currentTarget).parents('.item').attr('data-action-id') ?? 0);
        const action = this.actor.data.data.actions[actionId];

        if (action && action.critical !== undefined) {
            const options = this.actor.getRollOptions(['all', 'damage-roll']);
            action.critical({ event: eventData, options });
        }
    }

    protected onAttackHovered(eventData: JQuery.MouseEnterEvent) {
        this.showControls(eventData);
    }

    protected onAttackHoverEnds(eventData: JQuery.MouseLeaveEvent) {
        this.hideControls(eventData);
    }

    protected onActionHovered(eventData: JQuery.MouseEnterEvent) {
        this.showControls(eventData);
    }

    protected onActionHoverEnds(eventData: JQuery.MouseLeaveEvent) {
        this.hideControls(eventData);
    }

    protected onItemHovered(eventData: JQuery.MouseEnterEvent) {
        this.showControls(eventData);
    }

    protected onItemHoverEnds(eventData: JQuery.MouseLeaveEvent) {
        this.hideControls(eventData);
    }

    protected onSpellHovered(eventData: JQuery.MouseEnterEvent) {
        this.showControls(eventData);
    }

    protected onSpellHoverEnds(eventData: JQuery.MouseLeaveEvent) {
        this.hideControls(eventData);
    }

    protected hideControls(eventData: JQuery.MouseLeaveEvent) {
        const controls = $(eventData.currentTarget).find('.controls');

        if (controls === undefined) return;

        controls.removeClass('expanded');
    }

    protected showControls(eventData: JQuery.MouseEnterEvent) {
        const controls = $(eventData.currentTarget).find('.controls');

        if (controls === undefined) return;

        controls.addClass('expanded');
    }

    protected onPerceptionLabelClicked(eventData: JQuery.ClickEvent) {
        this.rollPerception(eventData);
    }

    protected onAbilityClicked(eventData: JQuery.ClickEvent, abilityId: AbilityString) {
        this.rollAbility(eventData, abilityId);
    }

    protected onLanguagesClicked(eventData: JQuery.ClickEvent) {
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

    protected onSensesEditClicked(eventData: JQuery.ClickEvent) {
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

    protected onSkillsEditClicked(eventData: JQuery.ClickEvent) {
        eventData.preventDefault();
        const options = {};
        const skillsEditor = new NPCSkillsEditor(this.actor, options);

        skillsEditor.render(true);
    }

    protected onSaveClicked(eventData: JQuery.ClickEvent, saveId: SaveString) {
        this.rollSave(eventData, saveId);
    }

    protected onSpeedEditClicked(eventData: JQuery.ClickEvent) {
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

    protected onWeaknessesEditClicked(eventData: JQuery.ClickEvent) {
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

    protected onResistancesEditClicked(eventData: JQuery.ClickEvent) {
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

    protected onImmunitiesEditClicked(eventData: JQuery.ClickEvent) {
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

    protected onAddActionClicked(_eventData: JQuery.ClickEvent) {}

    protected onAddTreasureClicked(_eventData: JQuery.ClickEvent) {
        const itemType = 'treasure';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    protected onAddConsumableClicked(_eventData: JQuery.ClickEvent) {
        const itemType = 'consumable';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    protected onAddEquipmentClicked(_eventData: JQuery.ClickEvent) {
        const itemType = 'equipment';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    protected onAddArmorClicked(_eventData: JQuery.ClickEvent) {
        const itemType = 'armor';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    protected onAddWeaponClicked(_eventData: JQuery.ClickEvent) {
        const itemType = 'weapon';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    protected onActionClicked(eventData: JQuery.ClickEvent, _actionId: string) {
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

    protected onItemClicked(eventData: JQuery.ClickEvent, _itemId: string) {
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

    protected onSpellClicked(eventData: JQuery.ClickEvent, _spell: string) {
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

    protected onSendToChatClicked(eventData: JQuery.ClickEvent) {
        eventData.preventDefault();

        const itemId = $(eventData.currentTarget).parents('.item').attr('data-item-id') ?? '';
        const item = this.actor.getOwnedItem(itemId);

        if (item) {
            if (item instanceof PhysicalItemPF2e && !item.isIdentified) {
                return;
            }

            item.roll(eventData);
        } else {
            console.error(`Clicked item with ID ${itemId}, but unable to find item with that ID.`);
        }
    }

    protected onWeakAdjustmentClicked(eventData: JQuery.ClickEvent) {
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

    protected onEliteAdjustmentClicked(eventData: JQuery.ClickEvent) {
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
        actorData = this.applyAdjustmentToData(actorData, increase, adjustBackToNormal);

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
    protected applyAdjustmentToData(actorData: NPCData, increase: boolean, adjustBackToNormal: boolean) {
        const positive = increase ? 1 : -1;
        const mod = 2 * positive;

        // adjustment by using custom modifiers
        const customModifiers = actorData.data.customModifiers ?? {};
        customModifiers.all = (customModifiers.all ?? []).filter((m) => !['Weak', 'Elite'].includes(m.name)); // remove existing elite/weak modifier
        if (!adjustBackToNormal) {
            const modifier = new ModifierPF2e(increase ? 'Elite' : 'Weak', mod, MODIFIER_TYPE.UNTYPED);
            customModifiers.all.push(modifier);
        }

        const lvl = Number(actorData.data.details.level.value);
        const originalLvl = adjustBackToNormal ? lvl + positive : lvl;
        const hp = Number(actorData.data.attributes.hp.max);
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
                    (item as any).data.bonus.total = item.data.bonus.value;
                    const firstKey = Object.keys(item.data.damageRolls)[0];
                    const dmg = item.data.damageRolls[firstKey]?.damage;
                    if (dmg !== undefined) {
                        const lastTwoChars = dmg.slice(-2);
                        if (parseInt(lastTwoChars, 10) === mod * -1) {
                            item.data.damageRolls[firstKey].damage = dmg.slice(0, -2);
                        } else {
                            item.data.damageRolls[firstKey].damage = dmg + (increase ? '+' : '') + mod;
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
                    actionDescr = actionDescr.replace(/DC (\d+)+/g, (_match: string, number: string) => {
                        return `DC ${parseInt(number, 10) + mod}`;
                    });
                    // Assuming that all abilities with damage in the description are damage attacks that cant be done each turn and as increase twice as much.
                    actionDescr = actionDescr.replace(
                        /(\d+)?d(\d+)([+-]\d+)?(\s+[a-z]+[\s.,])?/g,
                        (_match: string, a: string, b: string, c: string, d: string) => {
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

    protected isAgileWeapon(item: WeaponData | MeleeData): boolean {
        const isAgile = (item.data.traits.value || []).includes('agile');

        return isAgile;
    }

    protected getWeaponType(item: WeaponData | MeleeData) {
        const weaponType = ((item as WeaponData).data.weaponType || {}).value || 'melee';

        return weaponType;
    }

    protected assignActionGraphics(item: (ActionData & SheetEnrichedItemData) | (MeleeData & SheetEnrichedItemData)) {
        const { imageUrl, actionGlyph } = ActorPF2e.getActionGraphics(
            (item as ActionData).data?.actionType?.value || 'action',
            parseInt(((item as ActionData).data?.actions || {}).value, 10) || 1,
        );

        item.glyph = actionGlyph;
        item.imageUrl = imageUrl;
    }
}
