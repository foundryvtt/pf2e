import { CreatureSheetPF2e } from './creature';
import { TraitSelector5e } from '@system/trait-selector';
import { DicePF2e } from '@scripts/dice';
import { ActorPF2e, SKILL_DICTIONARY } from '../base';
import { NPCSkillsEditor } from '@system/npc-skills-editor';
import { NPCPF2e } from '@actor/npc';
import { identifyCreature, IdentifyCreatureData } from '@module/recall-knowledge';
import { PhysicalItemPF2e } from '@item/physical';
import {
    Abilities,
    AbilityString,
    CreatureTraitsData,
    LabeledString,
    NPCAttributes,
    NPCData,
    NPCSkillData,
    NPCStrike,
    RawNPCData,
    SaveString,
    SkillAbbreviation,
    ValuesList,
} from '@actor/data-definitions';
import {
    ActionData,
    ActionDetailsData,
    ArmorData,
    ConsumableData,
    EquipmentData,
    ItemDataPF2e,
    MeleeData,
    PhysicalItemData,
    SpellcastingEntryData,
    SpellcastingEntryDetailsData,
    SpellData,
    TreasureData,
    WeaponData,
} from '@item/data-definitions';
import { ErrorPF2e, objectHasKey } from '@module/utils';
import { ConfigPF2e } from '@scripts/config';

interface NPCSheetLabeledValue extends LabeledString {
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

interface SheetItemList<D extends PhysicalItemData> {
    label: string;
    type: D['type'];
    items: D[];
}
interface Inventory {
    weapon: SheetItemList<WeaponData>;
    armor: SheetItemList<ArmorData>;
    equipment: SheetItemList<EquipmentData>;
    consumable: SheetItemList<ConsumableData>;
    treasure: SheetItemList<TreasureData>;
}

interface NPCSystemSheetData extends RawNPCData {
    attributes: NPCAttributes & {
        shieldBroken?: boolean;
    };
    details: RawNPCData['details'] & {
        alignment: {
            localizedName?: string;
        };
    };
    sortedSkills: Record<string, NPCSkillData>;
    traits: CreatureTraitsData & {
        senses: NPCSheetLabeledValue[];
        size: {
            localizedName?: string;
        };
    };
}

/** Additional fields added in sheet data preparation */
interface NPCSheetData extends Omit<ActorSheetData<NPCData>, 'data'> {
    actions: ActionActions;
    attacks: Attacks;
    data: NPCSystemSheetData;
    items: ItemDataPF2e[] & SheetEnrichedItemData[];
    spellcastingEntries: SpellcastingSheetData[];
    orphanedSpells: boolean;
    orphanedSpellbook: any;
    identifyCreatureData?: IdentifyCreatureData;
    identifySkillDC?: number;
    identifySkillAdjustment?: string;
    identifySkillProgression?: string;
    identificationSkills?: string[];
    identificationSkillList?: string;
    specificLoreDC?: number;
    specificLoreAdjustment?: string;
    specificLoreProgression?: string;
    unspecificLoreDC?: number;
    unspecificLoreAdjustment?: string;
    unspecificLoreProgression?: string;
    isNotCommon?: boolean;
    actorSize?: string;
    actorAttitudes?: ConfigPF2e['PF2E']['attitude'];
    actorAttitude?: string;
    traits?: Record<string, string>;
    immunities?: Record<string, string>;
    languages?: Record<string, string>;
    isWeak?: boolean;
    isElite?: boolean;
    eliteState: 'active' | 'inactive';
    weakState: 'active' | 'inactive';
    notAdjusted: boolean;
    inventory: Inventory;
    hasShield?: boolean;
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

interface SpellcastingSheetData extends SpellcastingEntryData {
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
    protected prepareItems(sheetData: NPCSheetData) {
        this.prepareAbilities(sheetData.data.abilities);
        this.prepareSize(sheetData.data);
        this.prepareAlignment(sheetData.data);
        this.preparePerception(sheetData.data);
        this.prepareSkills(sheetData.data);
        this.prepareSpeeds(sheetData.data);
        this.prepareSaves(sheetData.data);
        this.prepareActions(sheetData);
        sheetData.attacks = this.prepareAttacks(sheetData.data);
        sheetData.spellcastingEntries = this.prepareSpellcasting(sheetData);
    }

    getData() {
        const sheetData: NPCSheetData = super.getData();

        // recall knowledge DCs
        const proficiencyWithoutLevel = game.settings.get('pf2e', 'proficiencyVariant') === 'ProficiencyWithoutLevel';
        const identifyCreatureData = identifyCreature(sheetData, { proficiencyWithoutLevel });
        sheetData.identifyCreatureData = identifyCreatureData;
        sheetData.identifySkillDC = identifyCreatureData.skill.dc;
        sheetData.identifySkillAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.skill.start];
        sheetData.identifySkillProgression = identifyCreatureData.skill.progression.join('/');
        sheetData.identificationSkills = Array.from(sheetData.identifyCreatureData.skills)
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
        sheetData.actorSize = CONFIG.PF2E.actorSizes[sheetData.data.traits.size.value];
        sheetData.actorAttitudes = CONFIG.PF2E.attitude;
        sheetData.actorAttitude = sheetData.actorAttitudes[sheetData.data.traits.attitude?.value ?? 'indifferent'];
        sheetData.traits = this.prepareOptions(CONFIG.PF2E.monsterTraits, sheetData.data.traits.traits);
        sheetData.immunities = this.prepareOptions(CONFIG.PF2E.immunityTypes, sheetData.data.traits.di);
        sheetData.languages = this.prepareOptions(CONFIG.PF2E.languages, sheetData.data.traits.languages);
        sheetData.inventory = this.prepareInventory(sheetData);

        // Shield
        const shield = this.actor.heldShield;
        const actorShieldData = sheetData.data.attributes.shield;
        if (shield) {
            sheetData.hasShield = true;
            sheetData.data.attributes.shieldBroken = shield.isBroken;
        } else if (actorShieldData.max > 0) {
            sheetData.hasShield = true;
            sheetData.data.attributes.shieldBroken = actorShieldData.value > actorShieldData.max / 2;
        }

        const isElite = this.isElite;
        const isWeak = this.isWeak;
        sheetData.isElite = isElite;
        sheetData.isWeak = isWeak;
        sheetData.notAdjusted = !isElite && !isWeak;

        if (isElite && isWeak) {
            throw ErrorPF2e('NPC is both, Elite and Weak at the same time.');
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
        const rollables = ['a.rollable', '.rollable a', '.item-icon.rollable'].join(', ');
        html.find(rollables).on('click', (event) => this.onClickRollable(event));
        html.find('button').on('click', (event) => this.onButtonClicked(event));
        html.find('a.chat, .spell-icon.rollable').on('click', (event) => this.onClickToChat(event));

        html.find('.attack')
            .on('mouseenter', (event) => this.showControls(event))
            .on('mouseleave', (event) => this.hideControls(event));
        html.find('.action')
            .on('mouseenter', (event) => this.showControls(event))
            .on('mouseleave', (event) => this.hideControls(event));
        html.find('.npc-item')
            .on('mouseenter', (event) => this.showControls(event))
            .on('mouseleave', (event) => this.hideControls(event));

        // Don't subscribe to edit buttons it the sheet is NOT editable
        if (!this.options.editable) return;

        html.find('.trait-edit').on('click', (event) => this.onClickChooseOptions(event));
        html.find('.skills-edit').on('click', (event) => this.onSkillsEditClicked(event));

        // Adjustments
        html.find('.npc-elite-adjustment').on('click', () => this.onClickMakeElite());
        html.find('.npc-weak-adjustment').on('click', () => this.onClickMakeWeak());

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
    private prepareOptions<T extends string>(
        options: Record<T, string>,
        selections: ValuesList<T>,
    ): Record<string, string> {
        const mainSelections = selections.value.map(
            (trait): Record<string, string> => ({ value: trait, label: options[trait] }),
        );
        const customSelections = selections.custom
            .split(/\s*[,;|]\s*/)
            .filter((trait) => trait)
            .map((trait): Record<string, string> => ({ value: trait, label: trait }));

        return mainSelections
            .concat(customSelections)
            .filter((selection) => selection.label)
            .reduce((selections, selection) => mergeObject(selections, { [selection.value]: selection.label }), {});
    }

    private prepareAbilities(abilities: Abilities) {
        Object.entries(abilities).forEach(([key, data]) => {
            const localizedCode = game.i18n.localize(`PF2E.AbilityId.${key}`);
            const nameKey = this.getAbilityNameKey(key as AbilityString);
            const localizedName = game.i18n.localize(nameKey);

            data.localizedCode = localizedCode;
            data.localizedName = localizedName;
        });
    }

    private prepareSize(actorData: NPCSystemSheetData) {
        const size = actorData.traits.size.value;
        const localizationKey = this.getSizeLocalizedKey(size);
        const localizedName = game.i18n.localize(localizationKey);

        actorData.traits.size.localizedName = localizedName;
    }

    private prepareAlignment(actorData: NPCSystemSheetData) {
        const alignmentCode = actorData.details.alignment.value;
        const localizedName = game.i18n.localize(`PF2E.Alignment${alignmentCode}`);

        actorData.details.alignment.localizedName = localizedName;
    }

    private preparePerception(actorData: NPCSystemSheetData) {
        const perception = actorData.attributes.perception;

        if (perception.base !== undefined && perception.base > 0) {
            perception.readableValue = `+${perception.base}`;
        } else {
            perception.readableValue = perception.base;
        }
    }

    protected prepareSenses(actorData: NPCSystemSheetData) {
        const configSenses = CONFIG.PF2E.senses;
        for (const sense of actorData.traits.senses as NPCSheetLabeledValue[]) {
            sense.localizedName = objectHasKey(configSenses, sense.type) ? configSenses[sense.type] : sense.type;
        }
    }

    private prepareSkills(actorData: NPCSystemSheetData) {
        // Prepare a list of skill IDs sorted by their localized name
        // This will help in displaying the skills in alphabetical order in the sheet
        const sortedSkillsIds = Object.keys(actorData.skills);

        const skills = actorData.skills;
        for (const skillId of sortedSkillsIds) {
            skills[skillId].label =
                skillId in CONFIG.PF2E.skillList
                    ? game.i18n.localize('PF2E.Skill' + skills[skillId].name)
                    : skills[skillId].name;
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

        actorData.sortedSkills = sortedSkills;
    }

    private prepareSpeeds(sheetData: NPCSystemSheetData) {
        const configSpeedTypes = CONFIG.PF2E.speedTypes;
        sheetData.attributes.speed.otherSpeeds.forEach((speed) => {
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
        if (typeof sheetData.attributes.speed.value === 'string') {
            sheetData.attributes.speed.value = sheetData.attributes.speed.value.replace('feet', '').trim();
        }
    }

    private prepareSaves(actorData: NPCSystemSheetData) {
        const fortitude = actorData.saves.fortitude;
        const reflex = actorData.saves.reflex;
        const will = actorData.saves.will;

        fortitude.labelShort = game.i18n.localize('PF2E.SavesFortitudeShort');
        reflex.labelShort = game.i18n.localize('PF2E.SavesReflexShort');
        will.labelShort = game.i18n.localize('PF2E.SavesWillShort');
    }

    /**
     * Prepares the actions list to be accessible from the sheet.
     * @param actorData Data of the actor to be shown in the sheet.
     */
    private prepareActions(actorData: NPCSheetData) {
        const actions: ActionActions = {
            passive: { label: game.i18n.localize('PF2E.ActionTypePassive'), actions: [] },
            free: { label: game.i18n.localize('PF2E.ActionTypeFree'), actions: [] },
            reaction: { label: game.i18n.localize('PF2E.ActionTypeReaction'), actions: [] },
            action: { label: game.i18n.localize('PF2E.ActionTypeAction'), actions: [] },
        };

        actorData.items
            .filter((item): item is ActionData => item.type === 'action')
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

    private prepareAttacks(sheetData: NPCSystemSheetData): Attacks {
        const traitDescriptions = CONFIG.PF2E.traitsDescriptions;

        return sheetData.actions.map((attack) => {
            const traits = attack.traits
                .map((strikeTrait) => {
                    const description = objectHasKey(traitDescriptions, strikeTrait.name)
                        ? traitDescriptions[strikeTrait.name]
                        : '';

                    const trait = {
                        label: strikeTrait.label,
                        description,
                    };
                    return trait;
                })
                .sort((a, b) => {
                    if (a.label < b.label) return -1;
                    if (a.label > b.label) return 1;
                    return 0;
                });
            return { attack, traits };
        });
    }

    /**
     * Prepare spells and spell entries
     * @param sheetData Data of the actor to show in the sheet.
     */
    private prepareSpellcasting(sheetData: NPCSheetData): SpellcastingSheetData[] {
        const spellsList: SpellData[] & SheetEnrichedItemData[] = [];
        const spellEntriesList: string[] = [];
        const spellbooks: any = [];

        spellbooks.unassigned = {};

        for (const item of sheetData.items) {
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
                    label: game.i18n.localize(CONFIG.PF2E.spellTraits[trait]),
                    description: game.i18n.localize(CONFIG.PF2E.traitsDescriptions[trait]),
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

            this.prepareSpell(sheetData.actor, spellbook, spell);
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
            sheetData.orphanedSpells = true;
            sheetData.orphanedSpellbook = spellbooks.unassigned;
        } else {
            sheetData.orphanedSpells = false;
        }

        const spellcastingEntries: SpellcastingSheetData[] = [];

        for (const entryId of spellEntriesList) {
            const entry = sheetData.items.find((i) => i._id === entryId) as SpellcastingSheetData;

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
                            const spellType = spell.data.time.value;
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
                                        label: game.i18n.localize(CONFIG.PF2E.spellTraits[trait]),
                                        description: game.i18n.localize(CONFIG.PF2E.traitsDescriptions[trait]),
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
        return spellcastingEntries;
    }

    /**
     * Prepares the equipment list of the actor.
     * @param sheetData Data of the sheet.
     */
    private prepareInventory(sheetData: NPCSheetData): Inventory {
        const itemsData = sheetData.items;
        return {
            weapon: {
                label: game.i18n.localize('PF2E.InventoryWeaponsHeader'),
                type: 'weapon',
                items: itemsData.filter((itemData): itemData is WeaponData => itemData.type === 'weapon'),
            },
            armor: {
                label: game.i18n.localize('PF2E.InventoryArmorHeader'),
                type: 'armor',
                items: itemsData.filter((itemData): itemData is ArmorData => itemData.type === 'armor'),
            },
            equipment: {
                label: game.i18n.localize('PF2E.InventoryEquipmentHeader'),
                type: 'equipment',
                items: itemsData.filter((itemData): itemData is EquipmentData => itemData.type === 'equipment'),
            },
            consumable: {
                label: game.i18n.localize('PF2E.InventoryConsumablesHeader'),
                type: 'consumable',
                items: itemsData.filter((itemData): itemData is ConsumableData => itemData.type === 'consumable'),
            },
            treasure: {
                label: game.i18n.localize('PF2E.InventoryTreasureHeader'),
                type: 'treasure',
                items: itemsData.filter((itemData): itemData is TreasureData => itemData.type === 'treasure'),
            },
        };
    }

    private get isWeak(): boolean {
        return this.actor.traits.has('weak');
    }

    private get isElite(): boolean {
        return this.actor.traits.has('elite');
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

    private onClickChooseOptions(event: JQuery.ClickEvent) {
        event.preventDefault();

        const $anchor = $(event.currentTarget);
        const config = CONFIG.PF2E;
        const traitType = $anchor.attr('data-options');
        const choices = typeof traitType === 'string' && objectHasKey(config, traitType) ? config[traitType] : {};
        const options = {
            name: $anchor.attr('data-attribute'),
            title: $anchor.attr('title'),
            choices,
            has_values: $anchor.attr('data-has-values') === 'true',
            allow_empty_values: $anchor.attr('data-allow-empty-values') === 'true',
            has_exceptions: $anchor.attr('data-has-exceptions') === 'true',
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

    private onSkillsEditClicked(event: JQuery.ClickEvent) {
        event.preventDefault();
        const options = {};
        const skillsEditor = new NPCSkillsEditor(this.actor, options);

        skillsEditor.render(true);
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

    private onClickToChat(event: JQuery.ClickEvent): void {
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

    private onClickMakeWeak() {
        if (this.actor.isWeak) {
            this.actor.applyAdjustment('normal');
        } else {
            this.actor.applyAdjustment('weak');
        }
    }

    private onClickMakeElite() {
        if (this.actor.isElite) {
            this.actor.applyAdjustment('normal');
        } else {
            this.actor.applyAdjustment('elite');
        }
    }

    private async onSpellcastingEntryValueChanged(event: JQuery.ChangeEvent) {
        event.preventDefault();

        const itemId = $(event.currentTarget).parents('.spellcasting-entry').attr('data-container-id');
        let value = Number(event.target.value);
        let key = '';

        if (event.currentTarget.classList.contains('dc-input')) {
            key = 'data.spelldc.dc';
        } else if (event.currentTarget.classList.contains('attack-input')) {
            key = 'data.spelldc.value';
        } else if (event.currentTarget.classList.contains('focus-points')) {
            key = 'data.focus.points';
        } else if (event.currentTarget.classList.contains('focus-pool')) {
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
    protected async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // update shield hp
        const shield = this.actor.heldShield;
        if (shield && Number.isInteger(formData['data.attributes.shield.value'])) {
            await shield.update({
                'data.hp.value': formData['data.attributes.shield.value'],
            });
        }
        await super._updateObject(event, formData);
    }
}
