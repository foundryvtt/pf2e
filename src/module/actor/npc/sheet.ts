import { CreatureSheetPF2e } from '../creature/sheet';
import { DicePF2e } from '@scripts/dice';
import { ABILITY_ABBREVIATIONS, SKILL_DICTIONARY } from '@actor/data/values';
import { NPCSkillsEditor } from '@system/npc-skills-editor';
import { ActorPF2e, NPCPF2e } from '@actor/index';
import { identifyCreature, IdentifyCreatureData } from '@module/recall-knowledge';
import { RecallKnowledgePopup } from '../sheet/popups/recall-knowledge-popup';
import { PhysicalItemPF2e } from '@item/physical';
import {
    ActionData,
    ArmorData,
    ConditionData,
    ConsumableData,
    EffectData,
    EquipmentData,
    ItemDataPF2e,
    MeleeData,
    SpellcastingEntryData,
    TreasureData,
    WeaponData,
} from '@item/data';
import { ErrorPF2e, objectHasKey } from '@module/utils';
import { ActorSheetDataPF2e, InventoryItem, SheetInventory } from '../sheet/data-types';
import { LabeledString, ValuesList, ZeroToEleven } from '@module/data';
import { NPCAttributes, NPCSkillData, NPCStrike, NPCSystemData } from './data';
import { Abilities, AbilityData, CreatureTraitsData, SkillAbbreviation } from '@actor/creature/data';
import { AbilityString } from '@actor/data/base';
import { SpellcastingEntryPF2e } from '@item';
import { SaveType } from '@actor/data';

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

interface NPCSystemSheetData extends NPCSystemData {
    attributes: NPCAttributes & {
        shieldBroken?: boolean;
    };
    details: NPCSystemData['details'] & {
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
interface NPCSheetData extends ActorSheetDataPF2e<NPCPF2e> {
    actions: ActionActions;
    attacks: Attacks;
    data: NPCSystemSheetData;
    items: SheetItemData[];
    effectItems: EffectData[];
    conditions: ConditionData[];
    spellcastingEntries: SpellcastingSheetData[];
    orphanedSpells: boolean;
    orphanedSpellbook: any;
    identifyCreatureData: IdentifyCreatureData;
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
    inventory: SheetInventory;
    hasShield?: boolean;
}

type SheetItemData<T extends ItemDataPF2e = ItemDataPF2e> = T & {
    glyph: string;
    imageUrl: string;
    traits: {
        label: string;
        description?: string;
    }[];
    chatData?: unknown;
    data: {
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
};

export interface SpellcastingSheetData
    extends SpellcastingEntryData,
        ReturnType<Embedded<SpellcastingEntryPF2e>['getSpellData']> {
    eid: number;
}

export class NPCSheetPF2e extends CreatureSheetPF2e<NPCPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;

        // Mix default options with new ones
        mergeObject(options, {
            classes: options.classes.concat('npc'),
            width: 650,
            height: 680,
            showUnpreparedSpells: true, // Not sure what it does in an NPC, copied from old code
            tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'main' }],
            scrollY: ['.tab.main', '.tab.inventory', '.tab.spells', '.tab.notes'],
        });
        return options;
    }

    /** Show either the actual NPC sheet or a briefened lootable version if the NPC is dead */
    override get template(): string {
        if (this.isLootSheet) {
            return 'systems/pf2e/templates/actors/npc/loot-sheet.html';
        }
        return 'systems/pf2e/templates/actors/npc/sheet.html';
    }

    /** Use the token name as the title if showing a lootable NPC sheet */
    override get title() {
        if (this.isLootSheet) {
            const actorName = this.token?.name ?? this.actor.name;
            return `${actorName} [${game.i18n.localize('PF2E.NPC.Dead')}]`; // `;
        }
        return super.title;
    }

    override get isLootSheet(): boolean {
        const npcsAreLootable = game.settings.get('pf2e', 'automation.lootableNPCs');
        return npcsAreLootable && !this.actor.isOwner && this.actor.isLootableBy(game.user);
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
        sheetData.inventory = this.prepareInventory(sheetData);
        sheetData.attacks = this.prepareAttacks(sheetData.data);
        sheetData.conditions = sheetData.items.filter(
            (data): data is SheetItemData<ConditionData> => data.type === 'condition',
        );
        sheetData.effectItems = sheetData.items.filter(
            (data): data is SheetItemData<EffectData> => data.type === 'effect',
        );
        this.prepareSpellcasting(sheetData);
    }

    override getData(): NPCSheetData {
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

        // Data for lootable token-actor sheets
        if (this.isLootSheet) {
            sheetData.actor.name = this.token?.name ?? this.actor.name;
        }

        // Return data for rendering
        return sheetData;
    }

    /**
     * Subscribe to events from the sheet.
     * @param html HTML content ready to render the sheet.
     */
    override activateListeners(html: JQuery<HTMLElement>) {
        super.activateListeners(html);

        // Set the inventory tab as active on a loot-sheet rendering.
        if (this.isLootSheet) {
            html.find('.tab.inventory').addClass('active');
        }

        // Subscribe to roll events
        const rollables = ['a.rollable', '.rollable a', '.item-icon.rollable'].join(', ');
        html.find(rollables).on('click', (event) => this.onClickRollable(event));
        html.find('a.chat, .spell-icon.rollable').on('click', (event) => this.onClickToChat(event));

        // Don't subscribe to edit buttons it the sheet is NOT editable
        if (!this.options.editable) return;

        html.find('.trait-edit').on('click', (event) => this.onTraitSelector(event));
        html.find('.skills-edit').on('click', (event) => this.onSkillsEditClicked(event));

        // Adjustments
        html.find('.npc-elite-adjustment').on('click', () => this.onClickMakeElite());
        html.find('.npc-weak-adjustment').on('click', () => this.onClickMakeWeak());

        // Handle spellcastingEntry attack and DC updates
        html.find('.spellcasting-entry')
            .find<HTMLInputElement | HTMLSelectElement>(
                '.attack-input, .dc-input, .focus-points, .focus-pool, .ability-score select',
            )
            .on('change', (event) => this.onChangeSpellcastingEntry(event));

        // Spontaneous Spell slot reset handler:
        html.find('.spell-slots-increment-reset').on('click', (event) => this.onSpellSlotIncrementReset(event));

        // Display base values on enter
        html.find('.modifier')
            .on('focusin', (event) => this.baseInputOnFocus(event))
            .on('focusout', (event) => this.baseInputOnFocusOut(event));

        html.find('.effects-list > .effect > .item-image').on('contextmenu', (event) => this.onClickDeleteItem(event));

        html.find('.recall-knowledge-breakdown').on('click', (event) => {
            event.preventDefault();
            const { identifyCreatureData } = this.getData();
            new RecallKnowledgePopup({}, identifyCreatureData!).render(true);
        });
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
            .map((trait): Record<string, string> => ({ value: trait.replace(/\.$/, ''), label: trait }));

        return mainSelections
            .concat(customSelections)
            .filter((selection) => selection.label)
            .reduce((selections, selection) => mergeObject(selections, { [selection.value]: selection.label }), {});
    }

    private prepareAbilities(abilities: Abilities) {
        for (const key of ABILITY_ABBREVIATIONS) {
            interface SheetAbilityData extends AbilityData {
                localizedCode?: string;
                localizedName?: string;
            }
            const data: SheetAbilityData = abilities[key];
            const localizedCode = game.i18n.localize(`PF2E.AbilityId.${key}`);
            const nameKey = this.getAbilityNameKey(key);
            const localizedName = game.i18n.localize(nameKey);

            data.localizedCode = localizedCode;
            data.localizedName = localizedName;
        }
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
        for (const sense of actorData.traits.senses) {
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
            .filter((item): item is SheetItemData<ActionData> => item.type === 'action')
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
                const systemData = item.data;
                const hasType = systemData.actionType && systemData.actionType.value;

                if (hasType) {
                    const actionTrait = systemData.actionType.value;
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
                (item as SheetItemData).traits = traits.filter((p) => !!p);

                // Select appropiate image for the action, based on type of action
                const actionType = systemData.actionType.value || 'action'; // Default to action if not set

                this.assignActionGraphics(item as ActionData & SheetItemData);

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
    private prepareSpellcasting(sheetData: NPCSheetData) {
        sheetData.spellcastingEntries = [];

        for (const item of sheetData.items) {
            if (item.type === 'spellcastingEntry') {
                const entry = this.actor.items.get(item._id);
                if (!(entry instanceof SpellcastingEntryPF2e)) {
                    continue;
                }

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

                sheetData.spellcastingEntries.push(
                    mergeObject(item, {
                        eid: sheetData.spellcastingEntries.length,
                        ...entry.getSpellData(),
                    }),
                );
            }
        }
    }

    /**
     * Prepares the equipment list of the actor.
     * @param sheetData Data of the sheet.
     */
    prepareInventory(sheetData: { items: ItemDataPF2e[] }): SheetInventory {
        const itemsData = sheetData.items;
        return {
            weapon: {
                label: game.i18n.localize('PF2E.InventoryWeaponsHeader'),
                type: 'weapon',
                items: itemsData.filter(
                    (itemData): itemData is InventoryItem<WeaponData> => itemData.type === 'weapon',
                ),
            },
            armor: {
                label: game.i18n.localize('PF2E.InventoryArmorHeader'),
                type: 'armor',
                items: itemsData.filter((itemData): itemData is InventoryItem<ArmorData> => itemData.type === 'armor'),
            },
            equipment: {
                label: game.i18n.localize('PF2E.InventoryEquipmentHeader'),
                type: 'equipment',
                items: itemsData.filter(
                    (itemData): itemData is InventoryItem<EquipmentData> => itemData.type === 'equipment',
                ),
            },
            consumable: {
                label: game.i18n.localize('PF2E.InventoryConsumablesHeader'),
                type: 'consumable',
                items: itemsData.filter(
                    (itemData): itemData is InventoryItem<ConsumableData> => itemData.type === 'consumable',
                ),
            },
            treasure: {
                label: game.i18n.localize('PF2E.InventoryTreasureHeader'),
                type: 'treasure',
                items: itemsData.filter(
                    (itemData): itemData is InventoryItem<TreasureData> => itemData.type === 'treasure',
                ),
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
        const data = { bonus };
        const speaker = ChatMessage.getSpeaker({ token: this.token?.object, actor: this.actor });

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

    rollSave(event: JQuery.ClickEvent, saveId: SaveType) {
        const save = this.actor.data.data.saves[saveId];

        if (save?.roll) {
            const options = this.actor.getRollOptions(['all', 'saving-throw', saveId]);
            save.roll({ event, options });
        } else {
            this.actor.rollSave(event, saveId);
        }
    }

    private onClickRollable(event: JQuery.ClickEvent) {
        event.preventDefault();
        const $label = $(event.currentTarget).closest('.rollable');

        const ability = $label.parent().attr('data-attribute') as 'perception' | AbilityString;
        const skill = $label.parent().attr('data-skill') as SkillAbbreviation;
        const save = $label.parent().attr('data-save') as SaveType;
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
        const item = this.actor.items.get(itemId);

        if (item) {
            if (item instanceof PhysicalItemPF2e && !item.isIdentified) {
                return;
            }

            item.toChat(event);
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

    private async onChangeSpellcastingEntry(event: JQuery.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        event.preventDefault();

        const $input: JQuery<HTMLInputElement | HTMLSelectElement> = $(event.currentTarget);
        const itemId = $input.closest('.spellcasting-entry').attr('data-container-id') ?? '';
        const key = $input.attr('data-base-property')?.replace(/data\.items\.\d+\./, '') ?? '';
        const value =
            $input.hasClass('focus-points') || $input.hasClass('focus-pool')
                ? Math.min(Number($input.val()), 3)
                : $input.is('select')
                ? String($input.val())
                : Number($input.val());
        await this.actor.updateEmbeddedDocuments('Item', [
            {
                _id: itemId,
                [key]: value,
            },
        ]);
    }

    private async onSpellSlotIncrementReset(event: JQuery.ClickEvent) {
        const target = $(event.currentTarget);
        const itemId = target.data().itemId;
        const itemLevel =
            typeof target.attr('data-level') === 'string'
                ? (Number(target.attr('data-level') || 0) as ZeroToEleven)
                : null;
        const actor = this.actor;
        const item = actor.items.get(itemId);

        if (item == null || itemLevel === null) {
            return;
        }
        if (item.data.type !== 'spellcastingEntry') {
            return;
        }

        const data = duplicate(item.data);

        if (data.data.slots == null) {
            return;
        }
        const slot = `slot${itemLevel}` as const;
        data.data.slots[slot].value = data.data.slots[slot].max;

        item.update(data);
    }

    // Helper functions

    private assignActionGraphics(item: (ActionData & SheetItemData) | (MeleeData & SheetItemData)): void {
        const { imageUrl, actionGlyph } = ActorPF2e.getActionGraphics(
            (item as ActionData).data.actionType?.value || 'action',
            parseInt(((item as ActionData).data?.actions || {}).value, 10) || 1,
        );

        item.glyph = actionGlyph;
        item.imageUrl = imageUrl;
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // do not update max health if the value has not actually changed
        if (this.isElite || this.isWeak) {
            const { max } = this.actor.data.data.attributes.hp;
            if (formData['data.attributes.hp.max'] === max) {
                delete formData['data.attributes.hp.max'];
            }
        }

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
