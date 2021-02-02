import { calculateBulk, formatBulk, indexBulkItemsById, itemsFromActorData } from '../../item/bulk';
import { getContainerMap } from '../../item/container';
import { ActorSheetPF2e } from './base';
import { calculateWealth } from '../../item/treasure';
import { PF2EVehicle } from '../actor';

/**
 * @category Actor
 */
export class ActorSheetPF2eVehicle extends ActorSheetPF2e<PF2EVehicle> {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['default', 'sheet', 'actor', 'vehicle'],
            width: 670,
            height: 480,
            tabs: [{ navSelector: '.sheet-navigation', contentSelector: '.sheet-content', initial: 'details' }],
        });
    }

    get template() {
        return 'systems/pf2e/templates/actors/vehicle/vehicle-sheet.html';
    }

    getData() {
        const sheetData = super.getData();

        // update properties
        sheetData.actorSizes = CONFIG.PF2E.actorSizes;
        sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];

        sheetData.actorRarities = CONFIG.PF2E.rarityTraits;
        sheetData.actorRarity = sheetData.actorRarities[sheetData.data.traits.rarity.value];
        sheetData.isNotCommon = sheetData.data.traits.rarity.value !== 'common';

        // Update broken threshold
        if (sheetData.data.attributes !== undefined) {
            sheetData.data.attributes.hp.brokenThreshold = Math.floor(sheetData.data.attributes.hp.max / 2);
        }

        // Update save labels
        if (sheetData.data.saves !== undefined) {
            for (const [s, save] of Object.entries(sheetData.data.saves as Record<any, any>)) {
                // save.icon = this._getProficiencyIcon(save.rank);
                // save.hover = CONFIG.PF2E.proficiencyLevels[save.rank];
                save.label = CONFIG.PF2E.saves[s];
            }
        }

        this._prepareItems(sheetData.actor);

        // update currency based on items
        if (sheetData.actor.items !== undefined) {
            const treasure = calculateWealth(sheetData.actor.items);
            sheetData.totalTreasure = {};
            for (const [denomination, value] of Object.entries(treasure)) {
                sheetData.totalTreasure[denomination] = {
                    value,
                    label: CONFIG.PF2E.currencies[denomination],
                };
            }
        }

        return sheetData;
    }

    _prepareItems(actorData) {
        // Inventory
        const inventory = {
            weapon: { label: game.i18n.localize('PF2E.InventoryWeaponsHeader'), items: [] },
            armor: { label: game.i18n.localize('PF2E.InventoryArmorHeader'), items: [] },
            equipment: { label: game.i18n.localize('PF2E.InventoryEquipmentHeader'), items: [] },
            consumable: { label: game.i18n.localize('PF2E.InventoryConsumablesHeader'), items: [] },
            treasure: { label: game.i18n.localize('PF2E.InventoryTreasureHeader'), items: [] },
            backpack: { label: game.i18n.localize('PF2E.InventoryBackpackHeader'), items: [] },
        };

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
            actorSize: actorData.data.traits.size.value,
        });

        for (const i of actorData.items) {
            i.img = i.img || CONST.DEFAULT_TOKEN;
            i.containerData = containers.get(i._id);
            i.isContainer = i.containerData.isContainer;
            i.isNotInContainer = i.containerData.isNotInContainer;
            i.canBeEquipped = i.isNotInContainer;
            i.isEquipped = i.data?.equipped?.value ?? false;
            i.isSellableTreasure = i.type === 'treasure' && i.data?.stackGroup?.value !== 'coins';
            i.hasInvestedTrait = i.data?.traits?.value?.includes('invested') ?? false;
            i.isInvested = i.data?.invested?.value ?? false;

            // Inventory
            if (Object.keys(inventory).includes(i.type)) {
                i.data.quantity.value = i.data.quantity.value || 0;
                i.data.weight.value = i.data.weight.value || 0;
                const bulkItem = bulkItemsById.get(i._id);
                const [approximatedBulk] = calculateBulk({
                    items: bulkItem === undefined ? [] : [bulkItem],
                    bulkConfig,
                    actorSize: actorData.data.traits.size.value,
                });
                i.totalWeight = formatBulk(approximatedBulk);
                i.hasCharges = i.type === 'consumable' && i.data.charges.max > 0;
                i.isTwoHanded =
                    i.type === 'weapon' && !!(i.data.traits.value || []).find((x) => x.startsWith('two-hand'));
                i.wieldedTwoHanded = i.type === 'weapon' && (i.data.hands || {}).value;
                inventory[i.type].items.push(i);
            }

            // Actions
            if (i.type === 'action') {
                const actionType = i.data.actionType.value || 'action';
                i.img = PF2EVehicle.getActionGraphics(
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
        }

        actorData.inventory = inventory;
        // actorData.attacks = attacks;
        actorData.actions = actions;
        actorData.readonlyActions = readonlyActions;
        // actorData.readonlyEquipment = readonlyEquipment;
    }

    // Events
    activateListeners(html) {
        super.activateListeners(html);
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

        // get buttons
        html.find('.crb-trait-selector').click((ev) => this._onCrbTraitSelector(ev));
    }
}
