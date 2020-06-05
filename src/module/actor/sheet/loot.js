import { AddCoinsPopup } from './AddCoinsPopup.js';
import { inventoryBrowser } from "../../packs/spell-browser.js";
import ActorSheetPF2e from './base.js';
import { calculateBulk, itemsFromActorData, stacks, formatBulk, indexBulkItemsById } from '../../item/bulk.js';
import { getContainerMap } from '../../item/container.js';

class ActorSheetPF2eLoot extends ActorSheetPF2e {
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat(['pf2e', 'actor', 'loot']),
            width: 650,
            height: 680,
        });
        return options;
    }
    
    get template() {
        const editableSheetPath = 'systems/pf2e/templates/actors/loot-sheet.html';
        const nonEditableSheetPath = 'systems/pf2e/templates/actors/loot-sheet-no-edit.html';
        
        const isEditable = this.actor.getFlag('pf2e', 'editLoot.value');
        
        if (isEditable) return editableSheetPath;
        
        return nonEditableSheetPath;
    }
    
    getData() {
        const sheetData = super.getData();
        
        // Process default values
        sheetData.flags = sheetData.actor.flags;
        if (sheetData.flags.editLoot === undefined) sheetData.flags.editLoot = { value: false };
        
        // Precalculate some data to adapt sheet more easily
        sheetData.isShop = sheetData.data.isShop;
        
        this._prepareItems(sheetData.actor);
        
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
            
            actorData.inventory = inventory;
        }
    }
    
    // Events
    
    activateListeners(html) {
        super.activateListeners(html);
        
        const shouldListenToEvents = this.options.editable;
        
        if (shouldListenToEvents) {
            html.find('.isLootEditable').change((ev) => {
                this.actor.setFlag('pf2e', 'editLoot', { value: ev.target.checked });
            });
            /*
            html.find('.add-coins-popup button').click(event => this._onAddCoinsPopup(event));
            html.find('.item-increase-quantity').click(event => this._onIncreaseItemQuantity(event));
            html.find('.item-decrease-quantity').click(event => this._onDecreaseItemQuantity(event));
            html.find('.item-delete').click(event => this._onDeleteItem(event));
            html.find('.item-create').click(event => this._onCreateItem(event));
            html.find('.inventory-browse').click(event => this._onBrowseItems(event));
            html.find('.item-edit').click(event => this._onEditItem(event));
            */
        }
    }
    
    _onAddCoinsPopup(event) {
        event.preventDefault();
        new AddCoinsPopup(this.actor, {}).render(true);
    }
    
    _onIncreaseItemQuantity(event) {
        const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
        const item = this.actor.getOwnedItem(itemId).data;
        this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.quantity.value': Number(item.data.quantity.value) + 1 });
    }
    
    _onDecreaseItemQuantity(event) {
        const li = $(event.currentTarget).parents('.item');
        const itemId = li.attr('data-item-id');
        const item = this.actor.getOwnedItem(itemId).data;
        if (Number(item.data.quantity.value) > 0) {
            this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.quantity.value': Number(item.data.quantity.value) - 1 });
        }
    }
    
    _onDeleteItem(event) {
        const li = $(event.currentTarget).parents('.item');
        const itemId = li.attr('data-item-id');
        const item = new Item(this.actor.getOwnedItem(itemId).data, { actor: this.actor });
        
        renderTemplate('systems/pf2e/templates/actors/delete-item-dialog.html', {name: item.name}).then((html) => {
            new Dialog({
                title: 'Delete Confirmation',
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: () => {
                            this.actor.deleteOwnedItem(itemId);
                            li.slideUp(200, () => this.render(false));
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        });
    }
    
    _onCreateItem(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const data = duplicate(header.dataset);
        data.name = `New ${data.type.capitalize()}`;
        this.actor.createEmbeddedEntity('OwnedItem', data);
    }
    
    _onEditItem(event) {
        const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
        const Item = CONFIG.Item.entityClass;
        const item = new Item(this.actor.getOwnedItem(itemId).data, { actor: this.actor });
        
        item.sheet.render(true);
    }
    
    _onBrowseItems(event) {
        inventoryBrowser.render(true)
    }
}

export default ActorSheetPF2eLoot;