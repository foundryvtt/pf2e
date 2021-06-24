import { calculateBulk, formatBulk, indexBulkItemsById, itemsFromActorData } from '@item/physical/bulk';
import { getContainerMap } from '@item/container/helpers';
import { ActorSheetPF2e } from '../sheet/base';
import { calculateWealth } from '@item/treasure/helpers';
import { VehiclePF2e } from '@actor/vehicle';
import { ItemDataPF2e } from '@item/data';

export class VehicleSheetPF2e extends ActorSheetPF2e<VehiclePF2e> {
    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['default', 'sheet', 'actor', 'vehicle'],
            width: 670,
            height: 480,
            tabs: [{ navSelector: '.sheet-navigation', contentSelector: '.sheet-content', initial: 'details' }],
        });
    }

    override get template() {
        return 'systems/pf2e/templates/actors/vehicle/vehicle-sheet.html';
    }

    override getData() {
        const sheetData: any = super.getData();

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
        sheetData.data.saves.fortitude.label = CONFIG.PF2E.saves['fortitude'];

        this.prepareItems(sheetData);

        // update currency based on items
        if (sheetData.actor.items !== undefined) {
            const treasure = calculateWealth(sheetData.actor.items);
            sheetData.totalTreasure = {};
            for (const denomination of ['cp', 'sp', 'gp', 'pp'] as const) {
                const value = treasure[denomination];
                sheetData.totalTreasure[denomination] = {
                    value,
                    label: CONFIG.PF2E.currencies[denomination],
                };
            }
        }

        return sheetData;
    }

    protected prepareItems(sheetData: any) {
        const actorData = sheetData.actor;
        // Inventory
        const inventory: Record<string, { label: string; items: ItemDataPF2e[] }> = {
            weapon: { label: game.i18n.localize('PF2E.InventoryWeaponsHeader'), items: [] },
            armor: { label: game.i18n.localize('PF2E.InventoryArmorHeader'), items: [] },
            equipment: { label: game.i18n.localize('PF2E.InventoryEquipmentHeader'), items: [] },
            consumable: { label: game.i18n.localize('PF2E.InventoryConsumablesHeader'), items: [] },
            treasure: { label: game.i18n.localize('PF2E.InventoryTreasureHeader'), items: [] },
            backpack: { label: game.i18n.localize('PF2E.InventoryBackpackHeader'), items: [] },
        };

        // Actions
        const actions: Record<string, { label: string; actions: any }> = {
            action: { label: game.i18n.localize('PF2E.ActionsActionsHeader'), actions: [] },
            reaction: { label: game.i18n.localize('PF2E.ActionsReactionsHeader'), actions: [] },
            free: { label: game.i18n.localize('PF2E.ActionsFreeActionsHeader'), actions: [] },
        };
        // Read-Only Actions
        const readonlyActions: Record<string, { label: string; actions: any }> = {
            interaction: { label: 'Interaction Actions', actions: [] },
            defensive: { label: 'Defensive Actions', actions: [] },
            offensive: { label: 'Offensive Actions', actions: [] },
        };

        // Iterate through items, allocating to containers
        const bulkConfig = {
            ignoreCoinBulk: game.settings.get('pf2e', 'ignoreCoinBulk'),
        };

        const bulkItems = itemsFromActorData(actorData);
        const bulkItemsById = indexBulkItemsById(bulkItems);
        const containers = getContainerMap({
            items: actorData.items.filter((itemData: ItemDataPF2e) => itemData.isPhysical),
            bulkItemsById,
            bulkConfig,
            actorSize: actorData.data.traits.size.value,
        });

        for (const itemData of actorData.items) {
            const physicalData: ItemDataPF2e = itemData;
            if (physicalData.isPhysical) {
                itemData.showEdit = sheetData.user.isGM || physicalData.isIdentified;
                itemData.img ||= CONST.DEFAULT_TOKEN;

                const containerData = containers.get(itemData._id)!;
                itemData.containerData = containerData;
                itemData.isInContainer = containerData.isInContainer;
                itemData.isInvestable = false;

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
                    }
                    inventory[itemData.type].items.push(itemData);
                }
            }

            // Actions
            if (itemData.type === 'action') {
                const actionType = ['free', 'reaction', 'passive'].includes(itemData.data.actionType.value)
                    ? itemData.data.actionType.value
                    : 'action';
                itemData.img = VehiclePF2e.getActionGraphics(
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

            for (const itemData of sheetData.items) {
                const physicalData: ItemDataPF2e = itemData;
                if (physicalData.isPhysical) {
                    itemData.showEdit = true;
                }
            }
        }

        actorData.inventory = inventory;
        // actorData.attacks = attacks;
        actorData.actions = actions;
        actorData.readonlyActions = readonlyActions;
        // actorData.readonlyEquipment = readonlyEquipment;
    }

    override activateListeners(html: JQuery) {
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
        html.find('.crb-trait-selector').on('click', (event) => this.onTraitSelector(event));
    }
}
