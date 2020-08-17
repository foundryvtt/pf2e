/* global CONST */
import {calculateWealth} from '../../item/treasure';
import ActorSheetPF2e from './base';
import { calculateBulk, itemsFromActorData, stacks, formatBulk, indexBulkItemsById } from '../../item/bulk';
import { getContainerMap } from '../../item/container';

class ActorSheetPF2eLoot extends ActorSheetPF2e {
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat(['pf2e', 'actor', 'loot']),
            width: 650,
            height: 680,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "inventory" }],
        });
        return options;
    }

    get template() {
        const editableSheetPath = 'systems/pf2e/templates/actors/loot-sheet.html';
        const nonEditableSheetPath = 'systems/pf2e/templates/actors/loot-sheet-no-edit.html';

        const isEditable = this.actor.getFlag('pf2e', 'editLoot.value');

        if (isEditable && game.user.isGM) return editableSheetPath;

        return nonEditableSheetPath;
    }

    getData() {
        const sheetData = super.getData();

        // update currency based on items
        if (sheetData.actor.items !== undefined)
        {
            const treasure = calculateWealth(sheetData.actor.items);
            sheetData.totalTreasure = {};
            for (const [denomination, value] of Object.entries(treasure)) {
                sheetData.totalTreasure[denomination] = {
                    value,
                    label: CONFIG.PF2E.currencies[denomination],
                };
            }
        }

        // Process default values
        const isEditable = this.actor.getFlag('pf2e', 'editLoot.value')
        if (isEditable === undefined) {
            this.actor.setFlag('pf2e', 'editLoot', { value: false });
        }

        // Precalculate some data to adapt sheet more easily
        sheetData.isLoot = sheetData.data.lootSheetType === "Loot";
        sheetData.isShop = ! sheetData.isLoot;

        this._prepareItems(sheetData.actor);

        // TEMP: Name edit is only available for the GM
        sheetData.isGM = game.user.isGM;

        return sheetData;
    }

    _prepareItems(actorData) {
        const inventory = {
            weapon: { label: game.i18n.localize("PF2E.InventoryWeaponsHeader"), items: [] },
            armor: { label: game.i18n.localize("PF2E.InventoryArmorHeader"), items: [] },
            equipment: { label: game.i18n.localize("PF2E.InventoryEquipmentHeader"), items: [] },
            consumable: { label: game.i18n.localize("PF2E.InventoryConsumablesHeader"), items: [] },
            treasure: { label: game.i18n.localize("PF2E.InventoryTreasureHeader"), items: [] },
            backpack: { label: game.i18n.localize("PF2E.InventoryBackpackHeader"), items: [] },
        };

        // Iterate through items, allocating to containers
        const bulkConfig = {
            ignoreCoinBulk: game.settings.get('pf2e', 'ignoreCoinBulk'),
            ignoreContainerOverflow: game.settings.get('pf2e', 'ignoreContainerOverflow'),
        };

        const bulkItems = itemsFromActorData(actorData);
        const indexedBulkItems = indexBulkItemsById(bulkItems);
        const containers = getContainerMap(actorData.items, indexedBulkItems, stacks, bulkConfig);

        for (const i of actorData.items) {
            i.img = i.img || CONST.DEFAULT_TOKEN;
            i.containerData = containers.get(i._id);
            i.isContainer = i.containerData.isContainer;
            i.isNotInContainer = i.containerData.isNotInContainer;
            i.canBeEquipped = i.isNotInContainer;
            i.isEquipped = i?.data?.equipped?.value ?? false;
            i.isSellableTreasure = i.type === 'treasure' && i.data?.stackGroup?.value !== 'coins';

            // Inventory
            if (Object.keys(inventory).includes(i.type)) {
                i.data.quantity.value = i.data.quantity.value || 0;
                i.data.weight.value = i.data.weight.value || 0;
                const [approximatedBulk] = calculateBulk([indexedBulkItems.get(i._id)], stacks, false, bulkConfig);
                i.totalWeight = formatBulk(approximatedBulk);
                i.hasCharges = (i.type === 'consumable') && i.data.charges.max > 0;
                i.isTwoHanded = (i.type === 'weapon') && !!((i.data.traits.value || []).find((x) => x.startsWith('two-hand')));
                i.wieldedTwoHanded = (i.type === 'weapon') && (i.data.hands || {}).value;
                inventory[i.type].items.push(i);
            }
        }

        actorData.inventory = inventory;
    }

    // Events

    activateListeners(html) {
        super.activateListeners(html);

        const shouldListenToEvents = this.options.editable;

        if (shouldListenToEvents) {
            html.find('.isLootEditable').change((ev) => {
                this.actor.setFlag('pf2e', 'editLoot', { value: ev.target.checked });
            });
        }
    }
}

export default ActorSheetPF2eLoot;
