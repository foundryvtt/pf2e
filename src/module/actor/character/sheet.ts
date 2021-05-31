import { ItemPF2e } from '@item/base';
import { calculateBulk, formatBulk, indexBulkItemsById, itemsFromActorData } from '@item/bulk';
import { getContainerMap } from '@item/container/helpers';
import { ClassData, FeatData, ItemDataPF2e, ItemSourcePF2e, LoreData, SpellData, WeaponData } from '@item/data';
import { calculateEncumbrance } from '@item/encumbrance';
import { FeatSource } from '@item/feat/data';
import { SpellPF2e } from '@item/spell';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import { MagicTradition, PreparationType } from '@item/spellcasting-entry/data';
import { ConditionManager } from '@module/conditions';
import { ProficiencyModifier } from '@module/modifiers';
import { ZeroToThree } from '@module/data';
import { CharacterPF2e } from '.';
import { CreatureSheetPF2e } from '../creature/sheet';
import { ManageCombatProficiencies } from '../sheet/popups/manage-combat-proficiencies';

export class CharacterSheetPF2e extends CreatureSheetPF2e<CharacterPF2e> {
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['default', 'sheet', 'actor', 'pc'],
            width: 700,
            height: 800,
            tabs: [{ navSelector: '.sheet-navigation', contentSelector: '.sheet-content', initial: 'character' }],
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

    /** @override */
    protected async _updateObject(event: Event, formData: any): Promise<void> {
        // update shield hp
        const heldShield = this.actor.heldShield;
        if (heldShield) {
            await heldShield.update({
                'data.hp.value': formData['data.attributes.shield.hp.value'],
            });
        }
        const previousLevel = this.actor.level;
        await super._updateObject(event, formData);

        const updatedLevel = this.actor.data.data.details.level.value;
        const actorClasses = this.actor.itemTypes.class;
        if (updatedLevel != previousLevel && actorClasses.length > 0) {
            for await (const actorClass of actorClasses) {
                await actorClass.ensureClassFeaturesForLevel(this.actor);
            }
        }
    }

    /** @override */
    getData() {
        const sheetData = super.getData();

        sheetData.ancestryItemId = sheetData.items.find((x: ItemDataPF2e) => x.type === 'ancestry')?._id ?? '';
        sheetData.backgroundItemId = sheetData.items.find((x: ItemDataPF2e) => x.type === 'background')?._id ?? '';
        sheetData.classItemId = sheetData.items.find((x: ItemDataPF2e) => x.type === 'class')?._id ?? '';

        // Update hero points label
        sheetData.data.attributes.heroPoints.icon = this.getHeroPointsIcon(sheetData.data.attributes.heroPoints.rank);
        sheetData.data.attributes.heroPoints.hover =
            CONFIG.PF2E.heroPointLevels[sheetData.data.attributes.heroPoints.rank];

        // Update class dc label
        sheetData.data.attributes.classDC.icon = this.getProficiencyIcon(sheetData.data.attributes.classDC.rank);
        sheetData.data.attributes.classDC.hover = CONFIG.PF2E.proficiencyLevels[sheetData.data.attributes.classDC.rank];

        // Spell Details
        sheetData.magicTraditions = CONFIG.PF2E.magicTraditions;
        sheetData.preparationType = CONFIG.PF2E.preparationType;
        sheetData.showUnpreparedSpells = sheetData.options.showUnpreparedSpells;

        // Update dying icon and container width
        sheetData.data.attributes.dying.icon = this.getDyingIcon(sheetData.data.attributes.dying.value);

        // Update wounded, maximum wounded, and doomed.
        sheetData.data.attributes.wounded.icon = this.getWoundedIcon(sheetData.data.attributes.wounded.value);
        sheetData.data.attributes.wounded.max = sheetData.data.attributes.dying.max - 1;
        sheetData.data.attributes.doomed.icon = this.getDoomedIcon(sheetData.data.attributes.doomed.value);
        sheetData.data.attributes.doomed.max = sheetData.data.attributes.dying.max - 1;

        sheetData.uid = this.id;

        // preparing the name of the rank, as this is displayed on the sheet
        sheetData.data.attributes.perception.rankName = game.i18n.format(
            `PF2E.ProficiencyLevel${sheetData.data.attributes.perception.rank}`,
        );
        for (const save of Object.values(sheetData.data.saves as Record<any, any>)) {
            save.rankName = game.i18n.format(`PF2E.ProficiencyLevel${save.rank}`);
        }
        sheetData.data.attributes.classDC.rankName = game.i18n.format(
            `PF2E.ProficiencyLevel${sheetData.data.attributes.classDC.rank}`,
        );

        // limiting the amount of characters for the save labels
        for (const save of Object.values(sheetData.data.saves as Record<any, any>)) {
            save.short = game.i18n.format(`PF2E.Saves${save.label}Short`);
        }

        // Is the character's key ability score overridden by an Active Effect?
        sheetData.data.details.keyability.aeOverride = this.actor.effects.contents.some((effect) => {
            return (
                !effect.data.disabled &&
                effect.data.changes.some((change) => change.key === 'data.details.keyability.value')
            );
        });

        sheetData.data.effects = {};

        sheetData.data.effects.conditions = ConditionManager.getFlattenedConditions(
            sheetData.actor.items.filter((i: any) => i.flags.pf2e?.condition && i.type === 'condition'),
        );
        // Show the PFS tab only if the setting for it is enabled.
        sheetData.showPFSTab = game.settings.get('pf2e', 'pfsSheetTab');
        // Is the stamina variant rule enabled?
        sheetData.hasStamina = game.settings.get('pf2e', 'staminaVariant') > 0;

        // Return data for rendering
        return sheetData;
    }

    /* -------------------------------------------- */

    /**
     * Organize and classify Items for Character sheets
     */
    protected prepareItems(sheetData: any) {
        const actorData: any = sheetData.actor;
        // Inventory
        const inventory: Record<string, { label: string; items: ItemDataPF2e[]; investedItemCount?: number }> = {
            weapon: { label: game.i18n.localize('PF2E.InventoryWeaponsHeader'), items: [] },
            armor: { label: game.i18n.localize('PF2E.InventoryArmorHeader'), items: [] },
            equipment: { label: game.i18n.localize('PF2E.InventoryEquipmentHeader'), items: [], investedItemCount: 0 },
            consumable: { label: game.i18n.localize('PF2E.InventoryConsumablesHeader'), items: [] },
            treasure: { label: game.i18n.localize('PF2E.InventoryTreasureHeader'), items: [] },
            backpack: { label: game.i18n.localize('PF2E.InventoryBackpackHeader'), items: [] },
        };

        // Spellbook
        // const spellbook = {};
        const tempSpellbook: SpellData[] = [];
        const spellcastingEntriesList: string[] = [];
        const spellbooks: any = [];
        spellbooks.unassigned = {};

        // Spellcasting Entries
        const spellcastingEntries: any[] = [];

        let backgroundItemId = undefined;

        // Feats
        interface FeatSlot {
            label: string;
            feats: { id: string; level: string; feat?: FeatData }[];
            bonusFeats: FeatData[];
        }
        const tempFeats: FeatData[] = [];
        const featSlots: Record<string, FeatSlot> = {
            ancestryfeature: { label: 'PF2E.FeaturesAncestryHeader', feats: [], bonusFeats: [] },
            classfeature: { label: 'PF2E.FeaturesClassHeader', feats: [], bonusFeats: [] },
            ancestry: { label: 'PF2E.FeatAncestryHeader', feats: [], bonusFeats: [] },
            class: { label: 'PF2E.FeatClassHeader', feats: [], bonusFeats: [] },
            archetype: { label: 'PF2E.FeatArchetypeHeader', feats: [], bonusFeats: [] },
            skill: { label: 'PF2E.FeatSkillHeader', feats: [], bonusFeats: [] },
            general: { label: 'PF2E.FeatGeneralHeader', feats: [], bonusFeats: [] },
            bonus: { label: 'PF2E.FeatBonusHeader', feats: [], bonusFeats: [] },
        };
        if (game.settings.get('pf2e', 'freeArchetypeVariant')) {
            for (let level = 2; level <= actorData.data.details.level.value; level += 2) {
                featSlots.archetype.feats.push({ id: `archetype-${level}`, level: `${level}` });
            }
        } else {
            // Use delete so it is in the right place on the sheet
            delete featSlots.archetype;
        }
        const pfsBoons: FeatData[] = [];
        const deityBoonsCurses: FeatData[] = [];

        // Actions
        const actions: Record<string, { label: string; actions: any[] }> = {
            action: { label: game.i18n.localize('PF2E.ActionsActionsHeader'), actions: [] },
            reaction: { label: game.i18n.localize('PF2E.ActionsReactionsHeader'), actions: [] },
            free: { label: game.i18n.localize('PF2E.ActionsFreeActionsHeader'), actions: [] },
        };

        // Read-Only Actions
        const readonlyActions: Record<string, { label: string; actions: any[] }> = {
            interaction: { label: 'Interaction Actions', actions: [] },
            defensive: { label: 'Defensive Actions', actions: [] },
            offensive: { label: 'Offensive Actions', actions: [] },
        };

        const readonlyEquipment: unknown[] = [];

        const attacks: { weapon: { label: string; items: WeaponData[]; type: 'weapon' } } = {
            weapon: { label: 'Compendium Weapon', items: [], type: 'weapon' },
        };

        // Skills
        const lores: LoreData[] = [];

        // Iterate through items, allocating to containers
        const bulkConfig = {
            ignoreCoinBulk: game.settings.get('pf2e', 'ignoreCoinBulk'),
            ignoreContainerOverflow: game.settings.get('pf2e', 'ignoreContainerOverflow'),
        };

        const bulkItems = itemsFromActorData(actorData);
        const bulkItemsById = indexBulkItemsById(bulkItems);
        const containers = getContainerMap({
            items: actorData.items,
            bulkItemsById,
            bulkConfig,
        });

        let investedCount = 0; // Tracking invested items

        for (const itemData of sheetData.items) {
            const physicalData: ItemDataPF2e = itemData;
            if (physicalData.isPhysical) {
                itemData.showEdit = sheetData.user.isGM || physicalData.isIdentified;
                itemData.img ||= CONST.DEFAULT_TOKEN;

                const containerData = containers.get(itemData._id)!;
                itemData.containerData = containerData;
                itemData.isInContainer = containerData.isInContainer;
                itemData.isInvestable =
                    physicalData.isEquipped && physicalData.isIdentified && physicalData.isInvested !== null;

                // Read-Only Equipment
                if (
                    physicalData.type === 'armor' ||
                    physicalData.type === 'equipment' ||
                    physicalData.type === 'consumable' ||
                    physicalData.type === 'backpack'
                ) {
                    readonlyEquipment.push(itemData);
                    actorData.hasEquipment = true;
                }

                itemData.canBeEquipped = !containerData.isInContainer;
                itemData.isSellableTreasure =
                    itemData.showEdit &&
                    physicalData.type === 'treasure' &&
                    physicalData.data.stackGroup.value !== 'coins';
                if (physicalData.isInvested) {
                    investedCount += 1;
                }

                // Inventory
                if (Object.keys(inventory).includes(itemData.type)) {
                    itemData.data.quantity.value = physicalData.data.quantity.value || 0;
                    itemData.data.weight.value = physicalData.data.weight.value || 0;
                    const bulkItem = bulkItemsById.get(physicalData._id);
                    const [approximatedBulk] = calculateBulk({
                        items: bulkItem === undefined ? [] : [bulkItem],
                        bulkConfig: bulkConfig,
                        actorSize: this.actor.data.data.traits.size.value,
                    });
                    itemData.totalWeight = formatBulk(approximatedBulk);
                    itemData.hasCharges = physicalData.type === 'consumable' && physicalData.data.charges.max > 0;
                    if (physicalData.type === 'weapon') {
                        itemData.isTwoHanded = physicalData.data.traits.value.some((trait: string) =>
                            trait.startsWith('two-hand'),
                        );
                        itemData.wieldedTwoHanded = physicalData.data.hands.value;
                        attacks.weapon.items.push(itemData);
                    }
                    inventory[itemData.type].items.push(itemData);
                }
            } else if (itemData.type === 'spell') {
                // Spells
                const item = this.actor.items.get(itemData._id);
                itemData.spellInfo = item?.getChatData() ?? {};
                tempSpellbook.push(itemData);
            } else if (itemData.type === 'spellcastingEntry') {
                // Spellcasting Entries
                // collect list of entries to use later to match spells against.
                spellcastingEntriesList.push(itemData._id);

                // TODO: remove below when trick magic item has been converted to use the custom modifiers version
                const spellRank = itemData.data.proficiency?.value || 0;
                const spellProficiency = ProficiencyModifier.fromLevelAndRank(
                    actorData.data.details.level.value,
                    spellRank,
                ).modifier;
                const spellAbl = itemData.data.ability.value || 'int';
                const spellAttack = actorData.data.abilities[spellAbl].mod + spellProficiency;
                if (itemData.data.spelldc.value !== spellAttack) {
                    const updatedItem = {
                        _id: itemData._id,
                        data: {
                            spelldc: {
                                value: spellAttack,
                                dc: spellAttack + 10,
                                mod: actorData.data.abilities[spellAbl].mod,
                            },
                        },
                    };
                    this.actor.updateEmbeddedDocuments('Item', [updatedItem]);
                }
                itemData.data.spelldc.mod = actorData.data.abilities[spellAbl].mod;
                itemData.data.spelldc.breakdown = `10 + ${spellAbl} modifier(${actorData.data.abilities[spellAbl].mod}) + proficiency(${spellProficiency})`;
                // TODO: remove above when trick magic item has been converted to use the custom modifiers version

                itemData.data.spelldc.icon = this.getProficiencyIcon(itemData.data.proficiency.value);
                itemData.data.spelldc.hover = game.i18n.localize(
                    CONFIG.PF2E.proficiencyLevels[itemData.data.proficiency.value],
                );
                itemData.data.tradition.title = game.i18n.localize(
                    CONFIG.PF2E.magicTraditions[itemData.data.tradition.value as MagicTradition],
                );
                itemData.data.prepared.title = game.i18n.localize(
                    CONFIG.PF2E.preparationType[itemData.data.prepared.value as PreparationType],
                );
                // Check if prepared spellcasting type and set Boolean
                if ((itemData.data.prepared || {}).value === 'prepared') itemData.data.prepared.preparedSpells = true;
                else itemData.data.prepared.preparedSpells = false;
                // Check if Ritual spellcasting tradition and set Boolean
                if ((itemData.data.tradition || {}).value === 'ritual') itemData.data.tradition.ritual = true;
                else itemData.data.tradition.ritual = false;
                if ((itemData.data.tradition || {}).value === 'focus') {
                    itemData.data.tradition.focus = true;
                    if (itemData.data.focus === undefined) itemData.data.focus = { points: 1, pool: 1 };
                    itemData.data.focus.icon = this.getFocusIcon(itemData.data.focus);
                } else itemData.data.tradition.focus = false;

                spellcastingEntries.push(itemData);
            }

            // Feats
            else if (itemData.type === 'feat') {
                const actionType = itemData.data.actionType.value || 'passive';

                tempFeats.push(itemData);

                if (Object.keys(actions).includes(actionType)) {
                    itemData.feat = true;
                    itemData.img = CharacterPF2e.getActionGraphics(
                        actionType,
                        parseInt((itemData.data.actions || {}).value, 10) || 1,
                    ).imageUrl;
                    actions[actionType].actions.push(itemData);

                    // Read-Only Actions
                    if (itemData.data.actionCategory && itemData.data.actionCategory.value) {
                        switch (itemData.data.actionCategory.value) {
                            case 'interaction':
                                readonlyActions.interaction.actions.push(itemData);
                                actorData.hasInteractionActions = true;
                                break;
                            case 'defensive':
                                readonlyActions.defensive.actions.push(itemData);
                                actorData.hasDefensiveActions = true;
                                break;
                            // Should be offensive but throw anything else in there too
                            default:
                                readonlyActions.offensive.actions.push(itemData);
                                actorData.hasOffensiveActions = true;
                        }
                    } else {
                        readonlyActions.offensive.actions.push(itemData);
                        actorData.hasOffensiveActions = true;
                    }
                }
            }

            // Lore Skills
            else if (itemData.type === 'lore') {
                itemData.data.icon = this.getProficiencyIcon((itemData.data.proficient || {}).value);
                itemData.data.hover = CONFIG.PF2E.proficiencyLevels[(itemData.data.proficient || {}).value];

                const rank = itemData.data.proficient?.value || 0;
                const proficiency = ProficiencyModifier.fromLevelAndRank(
                    actorData.data.details.level.value,
                    rank,
                ).modifier;
                const modifier = actorData.data.abilities.int.mod;
                const itemBonus = Number((itemData.data.item || {}).value || 0);
                itemData.data.itemBonus = itemBonus;
                itemData.data.value = modifier + proficiency + itemBonus;
                itemData.data.breakdown = `int modifier(${modifier}) + proficiency(${proficiency}) + item bonus(${itemBonus})`;

                lores.push(itemData);
            }

            // Actions
            else if (itemData.type === 'action') {
                const actionType = ['free', 'reaction', 'passive'].includes(itemData.data.actionType.value)
                    ? itemData.data.actionType.value
                    : 'action';
                itemData.img = CharacterPF2e.getActionGraphics(
                    actionType,
                    parseInt((itemData.data.actions || {}).value, 10) || 1,
                ).imageUrl;
                if (actionType === 'passive') actions.free.actions.push(itemData);
                else actions[actionType].actions.push(itemData);

                // Read-Only Actions
                if (itemData.data.actionCategory && itemData.data.actionCategory.value) {
                    switch (itemData.data.actionCategory.value) {
                        case 'interaction':
                            readonlyActions.interaction.actions.push(itemData);
                            actorData.hasInteractionActions = true;
                            break;
                        case 'defensive':
                            readonlyActions.defensive.actions.push(itemData);
                            actorData.hasDefensiveActions = true;
                            break;
                        case 'offensive':
                            readonlyActions.offensive.actions.push(itemData);
                            actorData.hasOffensiveActions = true;
                            break;
                        // Should be offensive but throw anything else in there too
                        default:
                            readonlyActions.offensive.actions.push(itemData);
                            actorData.hasOffensiveActions = true;
                    }
                } else {
                    readonlyActions.offensive.actions.push(itemData);
                    actorData.hasOffensiveActions = true;
                }
            }

            // background
            else if (itemData.type === 'background') {
                backgroundItemId = itemData._id;
            }

            // class
            else if (itemData.type === 'class') {
                const classItem = itemData as ClassData;
                const mapFeatLevels = (featLevels: number[], prefix: string) => {
                    if (!featLevels) {
                        return [];
                    }
                    return featLevels
                        .filter((featSlotLevel: number) => actorData.data.details.level.value >= featSlotLevel)
                        .map((level) => ({ id: `${prefix}-${level}`, level: `${level}` }));
                };

                featSlots.ancestry.feats = mapFeatLevels(classItem.data.ancestryFeatLevels?.value, 'ancestry');
                featSlots.class.feats = mapFeatLevels(classItem.data.classFeatLevels?.value, 'class');
                featSlots.skill.feats = mapFeatLevels(classItem.data.skillFeatLevels?.value, 'skill');
                featSlots.general.feats = mapFeatLevels(classItem.data.generalFeatLevels?.value, 'general');
            }
        }

        if (game.settings.get('pf2e', 'ancestryParagonVariant')) {
            featSlots.ancestry.feats.unshift({
                id: 'ancestry-bonus',
                level: '1',
            });
            for (let level = 3; level <= actorData.data.details.level.value; level += 4) {
                const index = (level + 1) / 2;
                featSlots.ancestry.feats.splice(index, 0, { id: `ancestry-${level}`, level: `${level}` });
            }
        }

        if (backgroundItemId !== undefined) {
            featSlots.skill.feats.unshift({
                id: backgroundItemId,
                level: game.i18n.localize('PF2E.FeatBackgroundShort'),
            });
        }

        inventory.equipment.investedItemCount = investedCount; // Tracking invested items

        const updateData: EmbeddedDocumentUpdateData<ItemPF2e>[] = [];
        // Iterate through all spells in the temp spellbook and check that they are assigned to a valid spellcasting entry. If not place in unassigned.
        for (const spellData of tempSpellbook) {
            // check if the spell has a valid spellcasting entry assigned to the location value.
            if (spellcastingEntriesList.includes(spellData.data.location.value)) {
                const location = spellData.data.location.value;
                spellbooks[location] = spellbooks[location] || {};
                this.prepareSpell(actorData, spellbooks[location], spellData);
            } else if (spellcastingEntriesList.length === 1) {
                // if not BUT their is only one spellcasting entry then assign the spell to this entry.
                const location = spellcastingEntriesList[0];
                spellbooks[location] = spellbooks[location] || {};

                // Update spell to perminantly have the correct ID now
                updateData.push({ _id: spellData._id, 'data.location.value': spellcastingEntriesList[0] });

                this.prepareSpell(actorData, spellbooks[location], spellData);
            } else {
                // else throw it in the orphaned list.
                this.prepareSpell(actorData, spellbooks.unassigned, spellData);
            }
        }

        // Update all embedded entities that have an incorrect location.
        if (updateData.length > 0) {
            console.log(
                'PF2e System | Prepare Actor Data | Updating location for the following embedded entities: ',
                updateData,
            );
            this.actor.updateEmbeddedDocuments('Item', updateData);
        }

        // put the feats in their feat slots
        const allFeatSlots = Object.values(featSlots).flatMap((x) => x.feats);
        for (const feat of tempFeats) {
            let slotIndex = allFeatSlots.findIndex((x) => x.id === feat.data.location);
            if (slotIndex !== -1 && allFeatSlots[slotIndex].feat !== undefined) {
                console.error(`Foundry VTT | Duplicate feats in same index! ${feat.name}`);
                slotIndex = -1;
            }

            if (slotIndex !== -1) {
                allFeatSlots[slotIndex].feat = feat;
            } else {
                let featType = feat.data.featType.value || 'bonus';

                if (featType === 'heritage') {
                    featType = 'ancestryfeature';
                }
                if (featType === 'pfsboon') {
                    pfsBoons.push(feat);
                } else if (['deityboon', 'curse'].includes(featType)) {
                    deityBoonsCurses.push(feat);
                } else {
                    if (!['ancestryfeature', 'classfeature'].includes(featType)) {
                        featType = 'bonus';
                    }

                    if (featType in featSlots) {
                        const slots: FeatSlot = featSlots[featType];
                        slots.bonusFeats.push(feat);
                    }
                }
            }
        }

        // assign mode to actions
        Object.values(actions)
            .flatMap((section) => section.actions)
            .forEach((action: any) => {
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

        actorData.featSlots = featSlots;
        actorData.pfsBoons = pfsBoons;
        actorData.deityBoonsCurses = deityBoonsCurses;
        actorData.attacks = attacks;
        actorData.actions = actions;
        actorData.readonlyActions = readonlyActions;
        actorData.readonlyEquipment = readonlyEquipment;
        actorData.lores = lores;

        for (const entry of spellcastingEntries) {
            // TODO: this if statement's codepath does not appear to ever be used. Consider removing after verifying more thoroughly
            if (entry.data.prepared.preparedSpells && spellbooks[entry._id]) {
                this.preparedSpellSlots(entry, spellbooks[entry._id]);
            }
            entry.spellbook = spellbooks[entry._id];
        }

        actorData.spellcastingEntries = spellcastingEntries;

        // shield
        const equippedShield = this.actor.heldShield?.data;
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
            };
            actorData.data.attributes.shieldBroken = false;
        } else {
            actorData.data.attributes.shield = duplicate(equippedShield.data);
            actorData.data.attributes.shieldBroken =
                equippedShield.data.hp.value <= equippedShield.data.brokenThreshold.value;
        }

        // Inventory encumbrance
        // FIXME: this is hard coded for now
        const featSlugs = new Set(
            actorData.items
                .filter((item: ItemDataPF2e) => item.type === 'feat')
                .map((item: ItemDataPF2e) => item.data.slug),
        );

        let bonusEncumbranceBulk = actorData.data.attributes.bonusEncumbranceBulk ?? 0;
        let bonusLimitBulk = actorData.data.attributes.bonusLimitBulk ?? 0;
        if (featSlugs.has('hefty-hauler')) {
            bonusEncumbranceBulk += 2;
            bonusLimitBulk += 2;
        }
        const equippedLiftingBelt = actorData.items.some(
            (item: ItemDataPF2e) =>
                item.type === 'equipment' &&
                item.data.slug === 'lifting-belt' &&
                item.data.equipped.value &&
                item.data.invested.value,
        );
        if (equippedLiftingBelt) {
            bonusEncumbranceBulk += 1;
            bonusLimitBulk += 1;
        }
        const [bulk] = calculateBulk({
            items: bulkItems,
            bulkConfig: bulkConfig,
            actorSize: this.actor.data.data.traits.size.value,
        });
        actorData.data.attributes.encumbrance = calculateEncumbrance(
            actorData.data.abilities.str.mod,
            bonusEncumbranceBulk,
            bonusLimitBulk,
            bulk,
            actorData.data?.traits?.size?.value ?? 'med',
        );
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    /**
     * Activate event listeners using the prepared sheet HTML
     * @param html The prepared HTML object ready to be rendered into the DOM
     */
    activateListeners(html: JQuery) {
        super.activateListeners(html);

        // ACTIONS
        html.find('[name="ammo-used"]').on('change', (event) => {
            event.stopPropagation();

            const actionIndex = $(event.currentTarget).parents('.item').attr('data-action-index');
            const action = this.actor.data.data.actions[Number(actionIndex)];
            const weapon = this.actor.items.get(action.item);
            const ammo = this.actor.items.get($(event.currentTarget).val() as string);

            if (weapon) weapon.update({ data: { selectedAmmoId: ammo?.id ?? null } });
        });

        {
            // ensure correct tab name is displayed after actor update
            const title = $('.sheet-navigation .active').data('tabTitle');
            if (title) {
                html.find('.navigation-title').text(title);
            }
        }

        html.find('.sheet-navigation').on('mouseover', '.item', (event) => {
            const title = event.currentTarget.dataset.tabTitle;
            if (title) {
                $(event.currentTarget).parents('.sheet-navigation').find('.navigation-title').text(title);
            }
        });

        html.find('.sheet-navigation').on('mouseout', '.item', (event) => {
            const parent = $(event.currentTarget).parents('.sheet-navigation');
            const title = parent.find('.item.active').data('tabTitle');
            if (title) {
                parent.find('.navigation-title').text(title);
            }
        });

        // open ancestry, background, or class compendium
        html.find('.open-compendium').on('click', (event) => {
            if (event.currentTarget.dataset.compendium) {
                const compendium = game.packs.get(event.currentTarget.dataset.compendium);
                if (compendium) {
                    compendium.render(true);
                }
            }
        });

        // filter strikes
        html.find('.toggle-unready-strikes').on('click', () => {
            this.actor.setFlag(
                game.system.id,
                'showUnreadyStrikes',
                !this.actor.getFlag(game.system.id, 'showUnreadyStrikes'),
            );
        });

        // handle sub-tab navigation on the actions tab
        html.find('.actions-nav').on('click', '.tab:not(.tab-active)', (event) => {
            const target = $(event.currentTarget);
            const nav = target.parents('.actions-nav');
            // deselect current tab and panel
            nav.children('.tab-active').removeClass('tab-active');
            nav.siblings('.actions-panels').children('.actions-panel.active').removeClass('active');
            // select new tab and panel
            target.addClass('tab-active');
            nav.siblings('.actions-panels')
                .children(`#${target.data('panel')}`)
                .addClass('active');
        });

        html.find('.crb-trait-selector').on('click', (event) => this.onTraitSelector(event));

        html.find('.actions-list').on('click', '[data-roll-option]:not([data-roll-option=""])', (event) => {
            this.actor.toggleRollOption(event.currentTarget.dataset.rollName, event.currentTarget.dataset.rollOption);
        });

        html.find('.add-modifier').on('click', '.fas.fa-plus-circle', (event) => this.onIncrementModifierValue(event));
        html.find('.add-modifier').on('click', '.fas.fa-minus-circle', (event) => this.onDecrementModifierValue(event));
        html.find('.add-modifier').on('click', '.add-modifier-submit', (event) => this.onAddCustomModifier(event));
        html.find('.modifier-list').on('click', '.remove-modifier', (event) => this.onRemoveCustomModifier(event));
        html.find('.modifier-list').on('click', '.toggle-automation', (event) => this.onToggleAutomation(event));

        // Toggle invested state
        html.find('.item-toggle-invest').on('click', (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id') ?? '';
            this.actor.toggleInvested(itemId);
        });

        {
            // Add and remove combat proficiencies
            const $tab = html.find('.tab.skills');
            const $header = $tab.find('ol.inventory-header.combat-proficiencies');
            $header.find('a.add').on('click', (event) => {
                ManageCombatProficiencies.add(this.actor, event);
            });
            const $list = $tab.find('ol.combat-list');
            $list.find('li.skill.custom a.delete').on('click', (event) => {
                ManageCombatProficiencies.remove(this.actor, event);
            });
        }

        html.find('.hover').tooltipster({
            animation: 'fade',
            delay: 200,
            trigger: 'click',
            arrow: false,
            contentAsHTML: true,
            debug: BUILD_MODE === 'development',
            interactive: true,
            side: ['right', 'bottom'],
            theme: 'crb-hover',
            minWidth: 120,
        });

        // Toggle Dying, Wounded, or Doomed
        html.find('aside > .sidebar > .hitpoints')
            .find('.dots.dying, .dots.wounded, .dots.doomed')
            .on('click contextmenu', (event) => {
                type ConditionName = 'dying' | 'wounded' | 'doomed';
                const condition = Array.from(event.delegateTarget.classList).find(
                    (className): className is ConditionName => ['dying', 'wounded', 'doomed'].includes(className),
                );
                if (condition) {
                    this.onClickDyingWoundedDoomed(condition, event);
                }
            });

        // Spontaneous Spell slot increment handler:
        html.find('.spell-slots-increment-down').on('click', (event) => {
            const target = $(event.currentTarget);
            const itemId = target.data().itemId;
            const itemLevel = target.data().level;
            const actor = this.actor;
            const item = actor.items.get(itemId);

            if (item == null || item.data.type !== 'spellcastingEntry') {
                return;
            }
            const data = duplicate(item.data);

            const shouldSpendFocusPoint = data.data.tradition.value === 'focus' && itemLevel > 0;

            if (shouldSpendFocusPoint) {
                if (data.data.focus.points > 0) {
                    data.data.focus.points -= 1;
                } else {
                    ui.notifications.warn(game.i18n.localize('PF2E.Focus.NotEnoughFocusPointsError'));
                }
            } else {
                if (item.data.data.slots === null) {
                    return;
                }

                data.data.slots['slot' + itemLevel].value -= 1;
                if (data.data.slots['slot' + itemLevel].value < 0) {
                    data.data.slots['slot' + itemLevel].value = 0;
                }
            }

            item.update(data);
        });

        // Spontaneous Spell slot reset handler:
        html.find('.spell-slots-increment-reset').on('click', (event) => {
            const target = $(event.currentTarget);
            const itemId = target.data().itemId;
            const itemLevel = target.data().level;
            const actor = this.actor;
            const item = actor.items.get(itemId);

            if (item == null) {
                return;
            }
            if (item.data.type !== 'spellcastingEntry') {
                return;
            }

            const data = duplicate(item.data);

            if (data.data.slots == null) {
                return;
            }
            data.data.slots['slot' + itemLevel].value = data.data.slots['slot' + itemLevel].max;

            item.update(data);
        });

        html.find('.toggle-signature-spell').on('click', (event) => {
            this.onToggleSignatureSpell(event);
        });
    }

    /**
     * Get the font-awesome icon used to display a certain level of focus points
     * expection focus = { points: 1, pool: 1}
     */
    private getFocusIcon(focus: { points: number; pool: number }) {
        const icons = {};
        const usedPoint = '<i class="fas fa-dot-circle"></i>';
        const unUsedPoint = '<i class="far fa-circle"></i>';

        for (let i = 0; i <= focus.pool; i++) {
            // creates focus.pool amount of icon options to be selected in the icons object
            let iconHtml = '';
            for (let iconColumn = 1; iconColumn <= focus.pool; iconColumn++) {
                // creating focus.pool amount of icons
                iconHtml += iconColumn <= i ? usedPoint : unUsedPoint;
            }
            icons[i] = iconHtml;
        }

        return icons[focus.points];
    }

    private onIncrementModifierValue(event: JQuery.ClickEvent) {
        const parent = $(event.currentTarget).parents('.add-modifier');
        (parent.find('.add-modifier-value input[type=number]')[0] as HTMLInputElement).stepUp();
    }

    private onDecrementModifierValue(event: JQuery.ClickEvent) {
        const parent = $(event.currentTarget).parents('.add-modifier');
        (parent.find('.add-modifier-value input[type=number]')[0] as HTMLInputElement).stepDown();
    }

    private onAddCustomModifier(event: JQuery.ClickEvent) {
        const parent = $(event.currentTarget).parents('.add-modifier');
        const stat = $(event.currentTarget).attr('data-stat') ?? '';
        const modifier = Number(parent.find('.add-modifier-value input[type=number]').val()) || 1;
        const name = `${parent.find('.add-modifier-name').val()}`;
        const type = `${parent.find('.add-modifier-type').val()}`;
        const errors: string[] = [];
        if (!stat || !stat.trim()) {
            errors.push('Statistic is required.');
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

    private onRemoveCustomModifier(event: JQuery.ClickEvent) {
        const stat = $(event.currentTarget).attr('data-stat') ?? '';
        const name = $(event.currentTarget).attr('data-name') ?? '';
        const errors: string[] = [];
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

    private onToggleAutomation(event: JQuery.ClickEvent) {
        const $checkbox = $(event.target);
        const toggleOff = !$checkbox.hasClass('disabled');
        const effects = this.actor.effects.contents.filter((effect) =>
            effect.data.changes.some((change) => change.key === $checkbox.data('automation-key')),
        );
        const effectUpdates = effects.map((effect) => ({ _id: effect.id, disabled: toggleOff }));
        this.actor.updateEmbeddedDocuments('ActiveEffect', effectUpdates);
    }

    protected async _onDropItemCreate(itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        if (['ancestry', 'background', 'class'].includes(itemData.type)) {
            const items = await this.actor.createEmbeddedDocuments('Item', [itemData]);
            if (items.length > 0) return items;
        }

        return super._onDropItemCreate(itemData);
    }

    private isFeatValidInFeatSlot(_slotId: string, featSlotType: string, feat: FeatSource) {
        let featType = feat.data?.featType?.value;
        if (featType === 'archetype') {
            if (feat.data.traits.value.includes('skill')) {
                featType = 'skill';
            } else {
                featType = 'class';
            }
        }

        if (featSlotType === 'archetype') {
            // Archetype feat slots are class feat slots
            featSlotType = 'class';
        }

        if (featSlotType === 'ancestryfeature') {
            return ['ancestryfeature', 'heritage'].includes(featType);
        }

        if (featSlotType === 'general') {
            return ['general', 'skill'].includes(featType);
        }

        return featSlotType === featType;
    }

    /** Handle cycling of dying, wounded, or doomed */
    private onClickDyingWoundedDoomed(condition: 'dying' | 'wounded' | 'doomed', event: JQuery.TriggeredEvent) {
        if (event.type === 'click') {
            this.actor.increaseCondition(condition, { max: this.actor.data.data.attributes[condition].max });
        } else if (event.type === 'contextmenu') {
            this.actor.decreaseCondition(condition);
        }
    }

    private getNearestSlotId(event: ElementDragEvent) {
        const data = $(event.target).closest('.item').data();
        if (!data) {
            return { slotId: undefined, featType: undefined };
        }
        return data;
    }

    private onToggleSignatureSpell(event: JQuery.ClickEvent): void {
        const { containerId } = event.target.closest('.item-container').dataset;
        const { itemId } = event.target.closest('.item').dataset;

        if (!containerId || !itemId) {
            return;
        }

        const spellcastingEntry = this.actor.items.get(containerId);
        const spell = this.actor.items.get(itemId);

        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e) || !(spell instanceof SpellPF2e)) {
            return;
        }

        const signatureSpells = spellcastingEntry.data.data.signatureSpells?.value ?? [];

        if (!signatureSpells.includes(spell.id)) {
            if (spell.isCantrip || spell.isFocusSpell || spell.isRitual) {
                return;
            }

            const updatedSignatureSpells = signatureSpells.concat([spell.id]);
            spellcastingEntry.update({ 'data.signatureSpells.value': updatedSignatureSpells });
        } else {
            const updatedSignatureSpells = signatureSpells.filter((id) => id !== spell.id);
            spellcastingEntry.update({ 'data.signatureSpells.value': updatedSignatureSpells });
        }
    }

    /** @override */
    protected async _onDropItem(event: ElementDragEvent, data: DropCanvasData): Promise<unknown> {
        const actor = this.actor;
        const isSameActor = data.actorId === actor.id || (actor.isToken && data.tokenId === actor.token?.id);
        if (isSameActor) {
            return super._onDropItem(event, data);
        }

        event.preventDefault();

        const item = await ItemPF2e.fromDropData(data);
        const itemData = item?.toObject();

        const { slotId, featType }: { slotId?: string; featType?: string } = this.getNearestSlotId(event);

        if (itemData?.type === 'feat') {
            if (slotId && featType && this.isFeatValidInFeatSlot(slotId, featType, itemData)) {
                itemData.data.location = slotId;
                const items = await Promise.all([
                    this.actor.createEmbeddedDocuments('Item', [itemData]),
                    this.actor.updateEmbeddedDocuments(
                        'Item',
                        this.actor.items
                            .filter((x) => x.data.type === 'feat' && x.data.data.location === slotId)
                            .map((x) => ({ _id: x.id, 'data.location': '' })),
                    ),
                ]);
                return items.flatMap((item) => item);
            }
        }

        return super._onDropItem(event, data);
    }

    /**
     * Handle a drop event for an existing Owned Item to sort that item
     * @param event
     * @param itemData
     */
    protected async _onSortItem(event: ElementDragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        if (itemData.type === 'feat') {
            const { slotId, featType } = this.getNearestSlotId(event);

            if (this.isFeatValidInFeatSlot(slotId, featType, itemData)) {
                return this.actor.updateEmbeddedDocuments('Item', [
                    {
                        _id: itemData._id,
                        'data.location': slotId,
                    },
                    ...this.actor.items
                        .filter((x) => x.data.type === 'feat' && x.data.data.location === slotId)
                        .map((x) => ({ _id: x.id, 'data.location': '' })),
                ]);
            } else {
                // if they're dragging it away from a slot
                if (itemData.data.location) {
                    return this.actor.updateEmbeddedDocuments('Item', [
                        {
                            _id: itemData._id,
                            'data.location': '',
                        },
                    ]);
                }
            }
        }

        return super._onSortItem(event, itemData);
    }

    /** @override */
    protected _onSubmit(event: any): Promise<Record<string, unknown>> {
        // Limit SP value to data.attributes.sp.max value
        if (event?.currentTarget?.name === 'data.attributes.sp.value') {
            event.currentTarget.value = Math.clamped(
                Number(event.currentTarget.value),
                0,
                Number(this.actor.data.data.attributes.sp?.max ?? 0),
            );
        }

        return super._onSubmit(event);
    }

    /**
     * Get the font-awesome icon used to display a certain level of dying
     */
    private getDyingIcon(level: number) {
        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const doomed = this.object.data.data.attributes.doomed.value || 0;
        const circle = '<i class="far fa-circle"></i>';
        const cross = '<i class="fas fa-times-circle"></i>';
        const skull = '<i class="fas fa-skull"></i>';
        const redOpen = '<span>';
        const redClose = '</span>';
        const icons: Record<number, string> = {};

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
     */
    private getWoundedIcon(level: number) {
        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const icons: Record<number, string> = {};
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
     */
    private getDoomedIcon(level: number) {
        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const icons: Record<number, string> = {};
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

    /**
     * Get the font-awesome icon used to display hero points
     */
    private getHeroPointsIcon(level: ZeroToThree) {
        const icons = {
            0: '<i class="far fa-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
            1: '<i class="fas fa-hospital-symbol"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
            2: '<i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i><i class="far fa-circle"></i>',
            3: '<i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i>',
        };
        return icons[level];
    }
}
