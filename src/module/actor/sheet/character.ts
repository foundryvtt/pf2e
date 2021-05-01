import { CreatureSheetPF2e } from './creature';
import { calculateBulk, itemsFromActorData, formatBulk, indexBulkItemsById } from '@item/bulk';
import { calculateEncumbrance } from '@item/encumbrance';
import { getContainerMap } from '@item/container';
import { ProficiencyModifier } from '@module/modifiers';
import { ConditionManager } from '@module/conditions';
import { CharacterPF2e } from '../character';
import { SpellData, ItemDataPF2e, FeatData, ClassData, isPhysicalItem } from '@item/data-definitions';
import { ItemPF2e } from '@item/base';
import { SpellPF2e } from '@item/spell';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import { ZeroToThree } from '@actor/data-definitions';
import { ManageCombatProficiencies } from './popups/manage-combat-proficiencies';

/**
 * @category Other
 */
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

        // Temporary HP
        const { hp } = sheetData.data.attributes;
        if (hp.temp === 0) delete hp.temp;

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
        sheetData.data.attributes.dying.containerWidth = `width: ${sheetData.data.attributes.dying.max * 13}px;`;
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
        sheetData.data.details.keyability.aeOverride = this.actor.data.effects.some((effect) => {
            return !effect.disabled && effect.changes.some((change) => change.key === 'data.details.keyability.value');
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
        const inventory = {
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
        const spellcastingEntries = [];

        let backgroundItemId = undefined;

        // Feats
        interface FeatSlot {
            label: string;
            feats: { id: string; level: string; feat?: FeatData }[];
            bonusFeats: FeatData[];
        }
        const tempFeats: FeatData[] = [];
        const featSlots: { [key: string]: FeatSlot } = {
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
        const actions = {
            action: { label: game.i18n.localize('PF2E.ActionsActionsHeader'), actions: [] },
            reaction: { label: game.i18n.localize('PF2E.ActionsReactionsHeader'), actions: [] },
            free: { label: game.i18n.localize('PF2E.ActionsFreeActionsHeader'), actions: [] },
        };

        // Read-Only Actions
        const readonlyActions = {
            interaction: { label: 'Interaction Actions', actions: [] },
            defensive: { label: 'Defensive Actions', actions: [] },
            offensive: { label: 'Offensive Actions', actions: [] },
        };

        const readonlyEquipment: unknown[] = [];

        const attacks = {
            weapon: { label: 'Compendium Weapon', items: [], type: 'weapon' },
        };

        // Skills
        const lores = [];

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
            const i: any = itemData;
            if (isPhysicalItem(itemData)) {
                i.showEdit = sheetData.user.isGM || i.isIdentified;

                i.img ||= CONST.DEFAULT_TOKEN;

                const containerData = containers.get(i._id)!;
                i.containerData = containerData;
                i.isInContainer = containerData.isInContainer;

                // Read-Only Equipment
                if (i.type === 'armor' || i.type === 'equipment' || i.type === 'consumable' || i.type === 'backpack') {
                    readonlyEquipment.push(i);
                    actorData.hasEquipment = true;
                }

                i.canBeEquipped = !containerData.isInContainer;
                i.isSellableTreasure = i.showEdit && i.type === 'treasure' && i.data?.stackGroup?.value !== 'coins';
                i.hasInvestedTrait = itemData.data.traits.value.includes('invested');
                i.isInvested = 'invested' in itemData.data && itemData.data.invested.value;
                if (i.isInvested) {
                    investedCount += 1;
                }

                // Inventory
                if (Object.keys(inventory).includes(i.type)) {
                    i.data.quantity.value = i.data.quantity.value || 0;
                    i.data.weight.value = i.data.weight.value || 0;
                    const bulkItem = bulkItemsById.get(i._id);
                    const [approximatedBulk] = calculateBulk({
                        items: bulkItem === undefined ? [] : [bulkItem],
                        bulkConfig: bulkConfig,
                        actorSize: this.actor.data.data.traits.size.value,
                    });
                    i.totalWeight = formatBulk(approximatedBulk);
                    i.hasCharges = i.type === 'consumable' && i.data.charges.max > 0;
                    if (i.type === 'weapon') {
                        i.isTwoHanded = i.data.traits.value.some((trait: string) => trait.startsWith('two-hand'));
                        i.wieldedTwoHanded = i.data.hands.value;
                        attacks.weapon.items.push(i);
                    }
                    inventory[i.type].items.push(i);
                }
            } else if (itemData.type === 'spell') {
                // Spells
                const item = this.actor.items.get(itemData._id);
                i.spellInfo = item?.getChatData() ?? {};
                tempSpellbook.push(itemData);
            } else if (itemData.type === 'spellcastingEntry') {
                // Spellcasting Entries
                // collect list of entries to use later to match spells against.
                spellcastingEntriesList.push(i._id);

                // TODO: remove below when trick magic item has been converted to use the custom modifiers version
                const spellRank = i.data.proficiency?.value || 0;
                const spellProficiency = ProficiencyModifier.fromLevelAndRank(
                    actorData.data.details.level.value,
                    spellRank,
                ).modifier;
                const spellAbl = itemData.data.ability.value || 'int';
                const spellAttack = actorData.data.abilities[spellAbl].mod + spellProficiency;
                if (itemData.data.spelldc.value !== spellAttack) {
                    const updatedItem = {
                        _id: i._id,
                        data: {
                            spelldc: {
                                value: spellAttack,
                                dc: spellAttack + 10,
                                mod: actorData.data.abilities[spellAbl].mod,
                            },
                        },
                    };
                    this.actor.updateEmbeddedEntity('OwnedItem', updatedItem);
                }
                i.data.spelldc.mod = actorData.data.abilities[spellAbl].mod;
                i.data.spelldc.breakdown = `10 + ${spellAbl} modifier(${actorData.data.abilities[spellAbl].mod}) + proficiency(${spellProficiency})`;
                // TODO: remove above when trick magic item has been converted to use the custom modifiers version

                i.data.spelldc.icon = this.getProficiencyIcon(i.data.proficiency.value);
                i.data.spelldc.hover = game.i18n.localize(CONFIG.PF2E.proficiencyLevels[i.data.proficiency.value]);
                i.data.tradition.title = game.i18n.localize(CONFIG.PF2E.magicTraditions[i.data.tradition.value]);
                i.data.prepared.title = game.i18n.localize(CONFIG.PF2E.preparationType[i.data.prepared.value]);
                // Check if prepared spellcasting type and set Boolean
                if ((i.data.prepared || {}).value === 'prepared') i.data.prepared.preparedSpells = true;
                else i.data.prepared.preparedSpells = false;
                // Check if Ritual spellcasting tradition and set Boolean
                if ((i.data.tradition || {}).value === 'ritual') i.data.tradition.ritual = true;
                else i.data.tradition.ritual = false;
                if ((i.data.tradition || {}).value === 'focus') {
                    i.data.tradition.focus = true;
                    if (i.data.focus === undefined) i.data.focus = { points: 1, pool: 1 };
                    i.data.focus.icon = this.getFocusIcon(i.data.focus);
                } else i.data.tradition.focus = false;

                spellcastingEntries.push(i);
            }

            // Feats
            else if (i.type === 'feat') {
                const actionType = i.data.actionType.value || 'passive';

                tempFeats.push(i);

                if (Object.keys(actions).includes(actionType)) {
                    i.feat = true;
                    i.img = CharacterPF2e.getActionGraphics(
                        actionType,
                        parseInt((i.data.actions || {}).value, 10) || 1,
                    ).imageUrl;
                    actions[actionType].actions.push(i);

                    // Read-Only Actions
                    if (i.data.actionCategory && i.data.actionCategory.value) {
                        switch (i.data.actionCategory.value) {
                            case 'interaction':
                                readonlyActions.interaction.actions.push(i);
                                actorData.hasInteractionActions = true;
                                break;
                            case 'defensive':
                                readonlyActions.defensive.actions.push(i);
                                actorData.hasDefensiveActions = true;
                                break;
                            // Should be offensive but throw anything else in there too
                            default:
                                readonlyActions.offensive.actions.push(i);
                                actorData.hasOffensiveActions = true;
                        }
                    } else {
                        readonlyActions.offensive.actions.push(i);
                        actorData.hasOffensiveActions = true;
                    }
                }
            }

            // Lore Skills
            else if (i.type === 'lore') {
                i.data.icon = this.getProficiencyIcon((i.data.proficient || {}).value);
                i.data.hover = CONFIG.PF2E.proficiencyLevels[(i.data.proficient || {}).value];

                const rank = i.data.proficient?.value || 0;
                const proficiency = ProficiencyModifier.fromLevelAndRank(actorData.data.details.level.value, rank)
                    .modifier;
                const modifier = actorData.data.abilities.int.mod;
                const itemBonus = Number((i.data.item || {}).value || 0);
                i.data.itemBonus = itemBonus;
                i.data.value = modifier + proficiency + itemBonus;
                i.data.breakdown = `int modifier(${modifier}) + proficiency(${proficiency}) + item bonus(${itemBonus})`;

                lores.push(i);
            }

            // Actions
            else if (i.type === 'action') {
                const actionType = ['free', 'reaction', 'passive'].includes(i.data.actionType.value)
                    ? i.data.actionType.value
                    : 'action';
                i.img = CharacterPF2e.getActionGraphics(
                    actionType,
                    parseInt((i.data.actions || {}).value, 10) || 1,
                ).imageUrl;
                if (actionType === 'passive') actions.free.actions.push(i);
                else actions[actionType].actions.push(i);

                // Read-Only Actions
                if (i.data.actionCategory && i.data.actionCategory.value) {
                    switch (i.data.actionCategory.value) {
                        case 'interaction':
                            readonlyActions.interaction.actions.push(i);
                            actorData.hasInteractionActions = true;
                            break;
                        case 'defensive':
                            readonlyActions.defensive.actions.push(i);
                            actorData.hasDefensiveActions = true;
                            break;
                        case 'offensive':
                            readonlyActions.offensive.actions.push(i);
                            actorData.hasOffensiveActions = true;
                            break;
                        // Should be offensive but throw anything else in there too
                        default:
                            readonlyActions.offensive.actions.push(i);
                            actorData.hasOffensiveActions = true;
                    }
                } else {
                    readonlyActions.offensive.actions.push(i);
                    actorData.hasOffensiveActions = true;
                }
            }

            // background
            else if (i.type === 'background') {
                backgroundItemId = i._id;
            }

            // class
            else if (i.type === 'class') {
                const classItem = i as ClassData;
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

        const embeddedEntityUpdate = [];
        // Iterate through all spells in the temp spellbook and check that they are assigned to a valid spellcasting entry. If not place in unassigned.
        for (const i of tempSpellbook) {
            // check if the spell has a valid spellcasting entry assigned to the location value.
            if (spellcastingEntriesList.includes(i.data.location.value)) {
                const location = i.data.location.value;
                spellbooks[location] = spellbooks[location] || {};
                this.prepareSpell(actorData, spellbooks[location], i);
            } else if (spellcastingEntriesList.length === 1) {
                // if not BUT their is only one spellcasting entry then assign the spell to this entry.
                const location = spellcastingEntriesList[0];
                spellbooks[location] = spellbooks[location] || {};

                // Update spell to perminantly have the correct ID now
                // console.log(`PF2e System | Prepare Actor Data | Updating location for ${i.name}`);
                // this.actor.updateEmbeddedEntity("OwnedItem", { "_id": i._id, "data.location.value": spellcastingEntriesList[0]});
                embeddedEntityUpdate.push({ _id: i._id, 'data.location.value': spellcastingEntriesList[0] });

                this.prepareSpell(actorData, spellbooks[location], i);
            } else {
                // else throw it in the orphaned list.
                this.prepareSpell(actorData, spellbooks.unassigned, i);
            }
        }

        // Update all embedded entities that have an incorrect location.
        if (embeddedEntityUpdate.length) {
            console.log(
                'PF2e System | Prepare Actor Data | Updating location for the following embedded entities: ',
                embeddedEntityUpdate,
            );
            this.actor.updateEmbeddedEntity('OwnedItem', embeddedEntityUpdate);
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
            const weapon = this.actor.getOwnedItem(action.item);
            const ammo = this.actor.getOwnedItem($(event.currentTarget).val() as string);

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

        // Toggle Dying Wounded
        html.find('.dying-click').on('click contextmenu', this.onClickDying.bind(this));

        // Spontaneous Spell slot increment handler:
        html.find('.spell-slots-increment-down').on('click', (event) => {
            const target = $(event.currentTarget);
            const itemId = target.data().itemId;
            const itemLevel = target.data().level;
            const actor = this.actor;
            const item = actor.getOwnedItem(itemId);

            if (item == null || item.data.type !== 'spellcastingEntry') {
                return;
            }
            const data = duplicate(item.data);

            if (data.data.tradition.value === 'focus') {
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
            const item = actor.getOwnedItem(itemId);

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
        const stat = $(event.currentTarget).attr('data-stat');
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
        const stat = $(event.currentTarget).attr('data-stat');
        const name = $(event.currentTarget).attr('data-name');
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
        const effects = this.actor.effects.entries.filter((effect) =>
            effect.data.changes.some((change) => change.key === $checkbox.data('automation-key')),
        );
        const effectUpdates = effects.map((effect) => ({ _id: effect.id, disabled: toggleOff }));
        this.actor.updateEmbeddedEntity('ActiveEffect', effectUpdates);
    }

    protected async _onDropItemCreate(itemData: ItemDataPF2e): Promise<ItemDataPF2e | null> {
        if (['ancestry', 'background', 'class'].includes(itemData.type)) {
            return await this.actor.createEmbeddedEntity('OwnedItem', itemData);
        }

        return super._onDropItemCreate(itemData);
    }

    private isFeatValidInFeatSlot(_slotId: string, featSlotType: string, feat: FeatData) {
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

    /**
     * Handle cycling of dying
     */
    private onClickDying(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        const field = $(event.currentTarget).siblings('input[type="hidden"]');
        const maxDying = this.object.data.data.attributes.dying.max;
        const wounded = 0; // Don't automate wounded when clicking on dying until dying is also automated on damage from chat and Recovery rolls
        const doomed = this.object.data.data.attributes.doomed.value;

        // Get the current level and the array of levels
        const level = parseFloat(`${field.val()}`);
        let newLevel = level;

        // Toggle next level - forward on click, backwards on right
        if (event.type === 'click') {
            newLevel = Math.clamped(level + 1 + wounded, 0, maxDying);
            if (newLevel + doomed >= maxDying) newLevel = maxDying;
        } else {
            newLevel = Math.clamped(level - 1, 0, maxDying);
            if (newLevel + doomed >= maxDying) newLevel -= doomed;
        }

        // Update the field value and save the form
        field.val(newLevel);
        this._onSubmit(event.originalEvent!);
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

        const spellcastingEntry = this.actor.getOwnedItem(containerId);
        const spell = this.actor.getOwnedItem(itemId);

        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e) || !(spell instanceof SpellPF2e)) {
            return;
        }

        const signatureSpells = spellcastingEntry.data.data.signatureSpells?.value ?? [];

        if (!signatureSpells.includes(spell.id)) {
            if (spell.isCantrip || spell.isFocusSpell || spell.isRitual) {
                return;
            }

            const updatedSignatureSpells = signatureSpells.concat([spell.id]);

            this.actor.updateOwnedItem({
                _id: spellcastingEntry.id,
                'data.signatureSpells.value': updatedSignatureSpells,
            });
        } else {
            const updatedSignatureSpells = signatureSpells.filter((id) => id !== spell.id);

            this.actor.updateOwnedItem({
                _id: spellcastingEntry.id,
                'data.signatureSpells.value': updatedSignatureSpells,
            });
        }
    }

    /** @override */
    protected async _onDropItem(
        event: ElementDragEvent,
        data: DropCanvasData,
    ): Promise<(ItemDataPF2e | null)[] | ItemDataPF2e | null> {
        const actor = this.actor;
        const isSameActor = data.actorId === actor._id || (actor.isToken && data.tokenId === actor.token?.id);
        if (isSameActor) {
            return super._onDropItem(event, data);
        }

        event.preventDefault();

        const item = await ItemPF2e.fromDropData(data);
        const itemData = duplicate(item.data);

        const { slotId, featType } = this.getNearestSlotId(event);

        if (itemData.type === 'feat') {
            if (slotId !== undefined && this.isFeatValidInFeatSlot(slotId, featType, itemData)) {
                itemData.data.location = slotId;
                const items = await Promise.all([
                    this.actor.createEmbeddedEntity('OwnedItem', itemData),
                    this.actor.updateEmbeddedEntity(
                        'OwnedItem',
                        this.actor.items
                            .filter((x) => x.data.type === 'feat' && x.data.data.location === slotId)
                            .map((x) => ({ _id: x._id, 'data.location': '' })),
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
    protected async _onSortItem(
        event: ElementDragEvent,
        itemData: ItemDataPF2e,
    ): Promise<(ItemDataPF2e | null)[] | ItemDataPF2e | null> {
        if (itemData.type === 'feat') {
            const { slotId, featType } = this.getNearestSlotId(event);

            if (this.isFeatValidInFeatSlot(slotId, featType, itemData)) {
                this.actor.updateEmbeddedEntity('OwnedItem', [
                    {
                        _id: itemData._id,
                        'data.location': slotId,
                    },
                    ...this.actor.items
                        .filter((x) => x.data.type === 'feat' && x.data.data.location === slotId)
                        .map((x) => ({ _id: x._id, 'data.location': '' })),
                ]);
                return itemData;
            } else {
                // if they're dragging it away from a slot
                if (itemData.data.location) {
                    return this.actor.updateEmbeddedEntity('OwnedItem', {
                        _id: itemData._id,
                        'data.location': '',
                    });
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
                Number(this.actor.data.data.attributes?.sp?.min ?? 0),
                Number(this.actor.data.data.attributes?.sp?.max ?? 0),
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
