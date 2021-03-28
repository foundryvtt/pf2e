import { CreatureSheetPF2e } from './creature';
import { TraitSelector5e } from '@system/trait-selector';
import { DicePF2e } from '@scripts/dice';
import { ActorPF2e, SKILL_DICTIONARY } from '../base';
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
    SpellcastingEntryDetailsData,
    SpellData,
} from '@item/data-definitions';
import { objectHasKey } from '@module/utils';
import { ConfigPF2e } from '@scripts/config';

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
            focus: boolean;
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
            scrollY: ['.tab.main', '.tab.inventory', '.tab.spells', '.tab.notes'],
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
    protected prepareItems(sheetData: any) {
        const actorData: SheetEnrichedNPCData = sheetData.actor;
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

        // Shield
        const shield = this.actor.getFirstEquippedShield();
        if (shield) {
            sheetData.hasShield = true;
            sheetData.data.attributes.shieldBroken = shield.data.hp.value <= shield.data.brokenThreshold.value;
        } else if (this.actor.data.data.attributes.shield.max > 0) {
            const shieldData = this.actor.data.data.attributes.shield;
            sheetData.hasShield = true;
            sheetData.data.attributes.shieldBroken = shieldData.value <= shieldData.brokenThreshold;
        }

        const isElite = this.isElite;
        const isWeak = this.isWeak;

        sheetData.isElite = isElite;
        sheetData.isWeak = isWeak;
        sheetData.notAdjusted = !isElite && !isWeak;

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
        const rollables = ['a.rollable', '.rollable a', '.spell-icon.rollable', '.item-icon.rollable'].join(', ');
        html.find(rollables).on('click', (event) => this.onClickRollable(event));
        html.find('button').on('click', (event) => this.onButtonClicked(event));
        html.find('a.chat').on('click', (event) => this.onSendToChatClicked(event));

        html.find('.attack')
            .on('mouseenter', (event) => this.showControls(event))
            .on('mouseleave', (event) => this.hideControls(event));
        html.find('.action')
            .on('mouseenter', (event) => this.showControls(event))
            .on('mouseleave', (event) => this.hideControls(event));
        html.find('.npc-item')
            .on('mouseenter', (event) => this.showControls(event))
            .on('mouseleave', (event) => this.hideControls(event));
        html.find('.spell')
            .on('mouseenter', (event) => this.showControls(event))
            .on('mouseleave', (event) => this.hideControls(event));

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
        html.find('.action-add').on('click', () => this.onAddActionClicked());
        html.find('.add-weapon').on('click', () => this.onAddWeaponClicked());
        html.find('.add-armor').on('click', () => this.onAddArmorClicked());
        html.find('.add-equipment').on('click', () => this.onAddEquipmentClicked());
        html.find('.add-consumable').on('click', () => this.onAddConsumableClicked());
        html.find('.add-treasure').on('click', () => this.onAddTreasureClicked());

        // Adjustments
        html.find('.npc-elite-adjustment').on('click', (event) => this.onEliteAdjustmentClicked(event));
        html.find('.npc-weak-adjustment').on('click', (event) => this.onWeakAdjustmentClicked(event));

        // Handle spellcastingEntry attack and DC updates
        html.find('.attack-input, .dc-input, .focus-points, .focus-pool').on('change', (event) =>
            this.onSpellcastingEntryValueChanged(event),
        );

        // Spontaneous Spell slot reset handler:
        html.find('.spell-slots-increment-reset').on('click', (event) => this.onSpellSlotIncrementReset(event));

        // Display base values on enter
        html.find('.modifier')
            .on('focusin', (event) => this.baseInputOnFocus(event))
            .on('focusout', (event) => this.baseInputOnFocusOut(event));
    }

    // TRAITS MANAGEMENT

    private prepareAbilities(abilities: Abilities) {
        Object.entries(abilities).forEach(([key, data]) => {
            const localizedCode = game.i18n.localize(`PF2E.AbilityId.${key}`);
            const nameKey = this.getAbilityNameKey(key as AbilityString);
            const localizedName = game.i18n.localize(nameKey);

            data.localizedCode = localizedCode;
            data.localizedName = localizedName;
        });
    }

    private prepareMonsterTraits(traits: any) {
        traits.localizationMap = {};

        for (const trait of traits.value) {
            const localizationKey = this.getMonsterTraitLocalizationKey(trait);
            const localizedName = game.i18n.localize(localizationKey);

            traits.localizationMap[trait] = localizedName;
        }
    }

    private prepareSize(actorData: SheetEnrichedNPCData) {
        const size = actorData.data.traits.size.value;
        const localizationKey = this.getSizeLocalizedKey(size);
        const localizedName = game.i18n.localize(localizationKey);

        actorData.data.traits.size.localizedName = localizedName;
    }

    private prepareAlignment(actorData: SheetEnrichedNPCData) {
        const alignmentCode = actorData.data.details.alignment.value;
        const localizedName = game.i18n.localize(`PF2E.Alignment${alignmentCode}`);

        actorData.data.details.alignment.localizedName = localizedName;
    }

    private prepareRarity(actorData: SheetEnrichedNPCData) {
        if (actorData.data.details.rarity === undefined) {
            actorData.data.details.rarity = 'normal';
        }
    }

    private preparePerception(actorData: SheetEnrichedNPCData) {
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

    private createSensesFromString(sensesText: string): NPCSheetLabeledValue[] {
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

    private prepareLanguages(languages: any) {
        languages.localizedNames = {};
        const configLanguages = CONFIG.PF2E.languages;
        for (const language of Object.keys(languages.selected)) {
            if (objectHasKey(configLanguages, language)) {
                const localizedName = CONFIG.PF2E.languages[language];

                languages.localizedNames[language] = localizedName;
            }
        }
    }

    private prepareSkills(actorData: SheetEnrichedNPCData) {
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

    private prepareSpeeds(actorData: SheetEnrichedNPCData) {
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

    private prepareImmunities(actorData: SheetEnrichedNPCData) {
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

    private prepareSaves(actorData: SheetEnrichedNPCData) {
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
    private prepareActions(actorData: SheetEnrichedNPCData) {
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

    private prepareAttacks(actorData: SheetEnrichedNPCData) {
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
    private prepareSpellcasting(actorData: SheetEnrichedNPCData) {
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
                const isFocus = (item.data.tradition || {}).value === 'focus';

                // There are still some bestiary entries where these values are strings.
                item.data.spelldc.dc = Number(item.data.spelldc.dc);
                item.data.spelldc.value = Number(item.data.spelldc.value);

                if (this.isElite) {
                    item.data.spelldc.dc += 2;
                    item.data.spelldc.value += 2;
                } else if (this.isWeak) {
                    item.data.spelldc.dc -= 2;
                    item.data.spelldc.value -= 2;
                }

                (item.data.prepared as boolean) = isPrepared;
                item.data.tradition.ritual = isRitual;
                item.data.tradition.focus = isFocus;
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

            spell.traits = spell.data.traits.value.map((trait) => {
                return {
                    label: game.i18n.localize(
                        CONFIG.PF2E.spellTraits[trait as keyof ConfigPF2e['PF2E']['spellTraits']],
                    ),
                    description: game.i18n.localize(
                        CONFIG.PF2E.traitsDescriptions[trait as keyof ConfigPF2e['PF2E']['traitsDescriptions']],
                    ),
                };
            });

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

            // Add prepared spells to spellcastinEntry
            if (entry.data.prepared && spellbooks[entry._id]) {
                const preparedSpellBook = spellbooks[entry._id];
                this.preparedSpellSlots(entry, preparedSpellBook);
                // Enrich prepared spells
                Object.values(preparedSpellBook as Record<string, any>).forEach((section) => {
                    const prepared = section?.prepared as (SpellData & SheetEnrichedItemData)[];
                    if (prepared.length > 0) {
                        Object.values(prepared).forEach((spell) => {
                            const spellType = spell?.data?.time?.value;
                            if (spellType) {
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

                                spell.traits = spell.data.traits.value.map((trait) => {
                                    return {
                                        label: game.i18n.localize(
                                            CONFIG.PF2E.spellTraits[trait as keyof ConfigPF2e['PF2E']['spellTraits']],
                                        ),
                                        description: game.i18n.localize(
                                            CONFIG.PF2E.traitsDescriptions[
                                                trait as keyof ConfigPF2e['PF2E']['traitsDescriptions']
                                            ],
                                        ),
                                    };
                                });
                            }
                        });
                    }
                });
            }
            entry.spellbook = spellbooks[entry._id];
            spellcastingEntries.push(entry);
        }
        actorData.spellcastingEntries = spellcastingEntries;
    }

    /**
     * Prepares the equipment list of the actor.
     * @param sheetData Data of the sheet.
     */
    private getEquipment(sheetData: any): any {
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
    private isEquipment(item: ItemPF2e): boolean {
        if (item.type === 'weapon') return true;
        if (item.type === 'armor') return true;
        if (item.type === 'equipment') return true;
        if (item.type === 'consumable') return true;
        if (item.type === 'treasure') return true;

        return false;
    }

    private get isWeak(): boolean {
        const traits: string[] = getProperty(this.actor.data.data, 'traits.traits.value') || [];
        return traits.some((trait) => trait === 'weak');
    }

    private get isElite(): boolean {
        const traits: string[] = getProperty(this.actor.data.data, 'traits.traits.value') || [];
        return traits.some((trait) => trait === 'elite');
    }

    private getMonsterTraitLocalizationKey(trait: string): string {
        const monsterTraits = CONFIG.PF2E.monsterTraits;
        return objectHasKey(monsterTraits, trait) ? monsterTraits[trait] : '';
    }

    private getSizeLocalizedKey(size: string): string {
        const actorSizes = CONFIG.PF2E.actorSizes;
        return objectHasKey(actorSizes, size) ? actorSizes[size] : '';
    }

    private getAbilityNameKey(abilityCode: AbilityString): string {
        return CONFIG.PF2E.abilities[abilityCode];
    }

    // ROLLS

    private rollPerception(event: JQuery.ClickEvent) {
        const options = this.actor.getRollOptions(['all', 'perception-check']);
        const perception = this.actor.data.data.attributes.perception;
        if (perception?.roll) {
            perception.roll({ event, options });
        }
    }

    private rollAbility(event: JQuery.ClickEvent, abilityId: AbilityString) {
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

    private onTraitEditClicked(event: JQuery.ClickEvent) {
        event.preventDefault();

        const a = $(event.currentTarget);
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

    private onClickRollable(event: JQuery.ClickEvent) {
        event.preventDefault();
        const $label = $(event.currentTarget).closest('.rollable');

        const ability = $label.parent().attr('data-attribute') as 'perception' | AbilityString;
        const skill = $label.parent().attr('data-skill') as SkillAbbreviation;
        const save = $label.parent().attr('data-save') as SaveString;
        const action = $label.parent().parent().attr('data-action');
        const item = $label.parent().parent().attr('data-item');
        const spell = $label.parent().parent().attr('data-spell');

        if (ability) {
            switch (ability) {
                case 'perception':
                    this.rollPerception(event);
                    break;
                default:
                    this.rollAbility(event, ability);
            }
        } else if (skill) {
            this.rollNPCSkill(event, skill);
        } else if (save) {
            this.rollSave(event, save);
        } else if (action || item || spell) {
            this.onClickExpandable(event);
        }
    }

    private onButtonClicked(event: JQuery.ClickEvent) {
        event.preventDefault();
        event.stopPropagation();

        switch (event.target.dataset.action) {
            case 'npcAttack':
                this.onNPCAttackClicked(event);
                break;
            case 'damage':
                this.onNPCDamageClicked(event);
                break;
            case 'critical':
                this.onNPCCriticalClicked(event);
                break;
        }
    }

    private onNPCAttackClicked(event: JQuery.ClickEvent) {
        const actionId = Number($(event.currentTarget).parents('.item').attr('data-action-id') ?? 0);
        const action = this.actor.data.data.actions[actionId];

        if (action) {
            const variant = Number($(event.currentTarget).attr('data-variant-index') ?? 0);
            const options = this.actor.getRollOptions(['all', 'attack-roll']);
            action.variants[variant].roll({ event: event, options });
        }
    }

    private onNPCDamageClicked(event: JQuery.ClickEvent) {
        const actionId = Number($(event.currentTarget).parents('.item').attr('data-action-id') ?? 0);
        const action = this.actor.data.data.actions[actionId];

        if (action && action.damage !== undefined) {
            const options = this.actor.getRollOptions(['all', 'damage-roll']);
            action.damage({ event: event, options });
        }
    }

    private onNPCCriticalClicked(event: JQuery.ClickEvent) {
        const actionId = Number($(event.currentTarget).parents('.item').attr('data-action-id') ?? 0);
        const action = this.actor.data.data.actions[actionId];

        if (action && action.critical !== undefined) {
            const options = this.actor.getRollOptions(['all', 'damage-roll']);
            action.critical({ event: event, options });
        }
    }

    private hideControls(event: JQuery.MouseLeaveEvent) {
        const controls = $(event.currentTarget).find('.controls');
        if (controls === undefined) return;
        controls.removeClass('expanded');
    }

    private showControls(event: JQuery.MouseEnterEvent) {
        const controls = $(event.currentTarget).find('.controls');
        if (controls === undefined) return;
        controls.addClass('expanded');
    }

    private baseInputOnFocus(event: JQuery.FocusInEvent) {
        const input = $(event.currentTarget);
        const baseProperty = input.attr('data-base-property') ?? '';
        const baseValue = getProperty(this.actor.data, baseProperty);
        if (baseProperty && baseValue) {
            input.attr('name', baseProperty);
            input.val(baseValue);
            input.removeClass('positive-modifier');
            input.removeClass('negative-modifier');
        }
    }

    private baseInputOnFocusOut(event: JQuery.FocusOutEvent) {
        const input = $(event.currentTarget);
        const displayValue = input.attr('data-display-value');
        const baseProperty = input.attr('data-base-property') ?? '';
        const baseValue = getProperty(this.actor.data, baseProperty);
        if (displayValue) {
            const totalModifier = Number(displayValue);
            if (totalModifier > baseValue) {
                input.addClass('positive-modifier');
            } else if (totalModifier < baseValue) {
                input.addClass('negative-modifier');
            }
            input.removeAttr('name');
            input.val(displayValue);
        }
    }

    private onLanguagesClicked(event: JQuery.ClickEvent) {
        event.preventDefault();

        const htmlElement = $(event.currentTarget);
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

    private onSensesEditClicked(event: JQuery.ClickEvent) {
        event.preventDefault();

        const htmlElement = $(event.currentTarget);
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

    private onSkillsEditClicked(event: JQuery.ClickEvent) {
        event.preventDefault();
        const options = {};
        const skillsEditor = new NPCSkillsEditor(this.actor, options);

        skillsEditor.render(true);
    }

    private onSpeedEditClicked(event: JQuery.ClickEvent) {
        event.preventDefault();
        const htmlElement = $(event.currentTarget);
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

    private onWeaknessesEditClicked(event: JQuery.ClickEvent) {
        event.preventDefault();
        const htmlElement = $(event.currentTarget);
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

    private onResistancesEditClicked(event: JQuery.ClickEvent) {
        event.preventDefault();
        const htmlElement = $(event.currentTarget);
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

    private onImmunitiesEditClicked(event: JQuery.ClickEvent) {
        event.preventDefault();
        const htmlElement = $(event.currentTarget);
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

    private onAddActionClicked() {}

    private onAddTreasureClicked() {
        const itemType = 'treasure';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    private onAddConsumableClicked(): void {
        const itemType = 'consumable';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    private onAddEquipmentClicked(): void {
        const itemType = 'equipment';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    private onAddArmorClicked(): void {
        const itemType = 'armor';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    private onAddWeaponClicked() {
        const itemType = 'weapon';

        const data: any = {
            name: game.i18n.localize('ITEM.Type' + itemType.titleCase()),
            type: itemType,
        };

        this.actor.createOwnedItem(data);
    }

    private onClickExpandable(event: JQuery.ClickEvent): void {
        const $details = $(event.currentTarget).closest('li.item').find('.sub-section.expandable');

        const isExpanded = $details.hasClass('expanded');
        if (isExpanded) {
            $details.slideUp(200, () => {
                $details.removeClass('expanded');
            });
        } else {
            $details.slideDown(200, () => {
                $details.addClass('expanded');
            });
        }
    }

    private onSendToChatClicked(event: JQuery.ClickEvent): void {
        event.preventDefault();

        const itemId = $(event.currentTarget).parents('.item').attr('data-item-id') ?? '';
        const item = this.actor.getOwnedItem(itemId);

        if (item) {
            if (item instanceof PhysicalItemPF2e && !item.isIdentified) {
                return;
            }

            item.roll(event);
        } else {
            console.error(`Clicked item with ID ${itemId}, but unable to find item with that ID.`);
        }
    }

    private onWeakAdjustmentClicked(event: JQuery.ClickEvent): void {
        event.preventDefault();

        const container = $(event.currentTarget).parents('.adjustment-select');

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

    private onEliteAdjustmentClicked(event: JQuery.ClickEvent) {
        event.preventDefault();

        const container = $(event.currentTarget).parents('.adjustment-select');

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

    private async onSpellcastingEntryValueChanged(event: JQuery.ChangeEvent) {
        event.preventDefault();

        const itemId = $(event.currentTarget).parents('.spellcasting-entry').attr('data-container-id');
        let value = Number(event.target.value);
        let key = '';

        if (event.currentTarget.className === 'dc-input') {
            key = 'data.spelldc.dc';
        } else if (event.currentTarget.className === 'attack-input') {
            key = 'data.spelldc.value';
        } else if (event.currentTarget.className === 'focus-points') {
            key = 'data.focus.points';
        } else if (event.currentTarget.className === 'focus-pool') {
            if (value > 3) value = 3;
            key = 'data.focus.pool';
        }
        const options: any = { _id: itemId };
        options[key] = value;

        await this.actor.updateEmbeddedEntity('OwnedItem', options);
    }

    private async onSpellSlotIncrementReset(event: JQuery.ClickEvent) {
        const target = $(event.currentTarget);
        const itemId = target.data().itemId;
        const itemLevel: string = target.data().level ?? '';
        const actor = this.actor;
        const item = actor.getOwnedItem(itemId);

        if (item == null || itemLevel === '') {
            return;
        }
        if (item.data.type !== 'spellcastingEntry') {
            return;
        }

        const data = duplicate(item.data);

        if (data.data.slots == null) {
            return;
        }
        const slot = `slot${itemLevel}` as keyof SpellcastingEntryDetailsData['slots'];
        data.data.slots[slot].value = data.data.slots[slot].max;

        item.update(data);
    }

    /**
     * Increases the NPC via the Elite/Weak adjustment rules
     */
    private npcAdjustment(increase: boolean): void {
        let traits = duplicate(this.actor.data.data.traits.traits.value) ?? [];
        const isElite = traits.some((trait) => trait === 'elite');
        const isWeak = traits.some((trait) => trait === 'weak');

        if (increase) {
            if (isWeak) {
                console.log(`PF2e System | Adjusting NPC to become less powerful`);
                traits = traits.filter((trait) => trait !== 'weak');
            } else if (!isWeak && !isElite) {
                console.log(`PF2e System | Adjusting NPC to become more powerful`);
                traits.push('elite');
            }
        } else {
            if (isElite) {
                console.log(`PF2e System | Adjusting NPC to become less powerful`);
                traits = traits.filter((trait) => trait !== 'elite');
            } else if (!isElite && !isWeak) {
                console.log(`PF2e System | Adjusting NPC to become less powerful`);
                traits.push('weak');
            }
        }
        this.actor.update({ ['data.traits.traits.value']: traits });
    }

    // Helper functions

    private assignActionGraphics(
        item: (ActionData & SheetEnrichedItemData) | (MeleeData & SheetEnrichedItemData),
    ): void {
        const { imageUrl, actionGlyph } = ActorPF2e.getActionGraphics(
            (item as ActionData).data?.actionType?.value || 'action',
            parseInt(((item as ActionData).data?.actions || {}).value, 10) || 1,
        );

        item.glyph = actionGlyph;
        item.imageUrl = imageUrl;
    }

    /** @override */
    protected async _updateObject(event: Event, formData: any): Promise<void> {
        // update shield hp
        const equippedShieldId = this.actor.getFirstEquippedShield()?._id;
        if (equippedShieldId !== undefined) {
            const shieldEntity = this.actor.getOwnedItem(equippedShieldId);
            if (shieldEntity) {
                await shieldEntity.update(
                    {
                        'data.hp.value': formData['data.attributes.shield.value'],
                    },
                    { diff: true },
                );
            }
        }
        await super._updateObject(event, formData);
    }
}
