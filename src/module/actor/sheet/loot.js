import {calculateWealth} from '../../item/treasure.js';
import { AddCoinsPopup } from './AddCoinsPopup.js';

class ActorSheetPF2eLoot extends ActorSheet {
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
        
        // Update currency
        const treasure = calculateWealth(sheetData.actor.items);
        sheetData.totalTreasure = {};
        for (const [denomination, value] of Object.entries(treasure)) {
            sheetData.totalTreasure[denomination] = {
                value,
                label: CONFIG.PF2E.currencies[denomination],
            };
        }
        
        this._prepareItems(sheetData.actor);
        
        console.log(`Loot data: ${JSON.stringify(sheetData.data)}`);
        console.log(`Treasure: ${JSON.stringify(sheetData.totalTreasure)}`);
        
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
        
        for (const item of actorData.items) {
            var type = item.type || "equipment";
            
            item.data.quantity.value = item.data.quantity.value || 0;
            item.img = item.img || CONST.DEFAULT_TOKEN;
            item.isNotInContainer = true;
            
            item.hasCharges = (item.type === 'consumable') && item.data.charges.max > 0;
            item.isTwoHanded = (item.type === 'weapon') && !!((item.data.traits.value || []).find((x) => x.startsWith('two-hand')));
            item.wieldedTwoHanded = (item.type === 'weapon') && (item.data.hands || {}).value;
            
            inventory[type].items.push(item);
            
            console.log(`Assigning item ${item.name} to ${type}`);
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
        
        // Add coins button
        html.find('.add-coins-popup button').click(ev => this._onAddCoinsPopup(ev));
        
        // Increase Item Quantity
        html.find('.item-increase-quantity').click((event) => this._onIncreaseItemQuantity(event));
        
        // Decrease Item Quantity
        html.find('.item-decrease-quantity').click((event) => this._onDecreaseItemQuantity(event));
        
        // Delete Inventory Item
        html.find('.item-delete').click(ev => this._onDeleteItem(ev));
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
}

export default ActorSheetPF2eLoot;