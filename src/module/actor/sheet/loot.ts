/* global CONST, ui */
import { Mutex, withTimeout } from 'async-mutex';
import { addCoinsSimple, calculateWealth} from '../../item/treasure';
import ActorSheetPF2e from './base';
import ActorPF2E from '../actor';
import { calculateBulk, itemsFromActorData, stacks, formatBulk, indexBulkItemsById } from '../../item/bulk';
import { MoveLootPopup } from './loot/MoveLootPopup';
import { getContainerMap } from '../../item/container';
import { getPhysicalItemData } from '../../item/dataDefinitions';

class ActorSheetPF2eLoot extends ActorSheetPF2e {
    static SOCKET = 'system.pf2e';
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
            i.isEquipped = i.data?.equipped?.value ?? false;
            i.isSellableTreasure = i.type === 'treasure' && i.data?.stackGroup?.value !== 'coins';
            i.hasInvestedTrait = i.data?.traits?.value?.includes("invested") ?? false;
            i.isInvested = i.data?.invested?.value ?? false;
            i.itemPrice = i.type === 'treasure' ? `${i.data.value.value} ${i.data.denomination.value}` : i.data.price.value;

            // Inventory
            if (Object.keys(inventory).includes(i.type)) {
                i.data.quantity.value = i.data.quantity.value || 0;
                i.data.weight.value = i.data.weight.value || 0;
                const [approximatedBulk] = calculateBulk([indexedBulkItems.get(i._id)], stacks, false, bulkConfig);
                i.totalWeight = formatBulk(approximatedBulk);
                i.hasCharges = (i.type === 'consumable') && i.data.charges.max > 0;
                i.isTwoHanded = (i.type === 'weapon') && !!((i.data.traits.value || []).find((x) => x.startsWith('two-hand')));
                i.wieldedTwoHanded = (i.type === 'weapon') && (i.data.hands || {}).value;
                if (actorData.data.lootSheetType === 'Merchant') {
                    i.buyable = true;
                }
                else if (actorData.data.lootSheetType === 'Loot'){
                    i.lootable = true;
                }
                inventory[i.type].items.push(i);
            }
        }

        actorData.inventory = inventory;
    }

    _getTransactionProcessor() {
        // See if a user is available who can manipulate this sheet
        let processorId = null;

        game.users.forEach((user) => {
            if (user.isGM) {
                processorId = user.id;
            }
        });
        return processorId;
    }

    _lootBuyItem(event, mode) {
        event.preventDefault();
        console.log("Loot Sheet | Loot Item clicked");

        const processorId = this._getTransactionProcessor();

        if (! processorId) {
            ui.notifications.error(`No active GM, they must be online to ${mode} an item.`);
            return;
        }

        if (game.user.character) {
            const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
            // If more than one item can be moved, show a popup to ask how many to move
            const sourceItem = this.actor.getOwnedItem(itemId);
            const physicalItem = getPhysicalItemData(sourceItem.data);
            if (physicalItem.data.quantity.value > 1)
            {
              const popup = new MoveLootPopup(this.actor, {}, (quantity) => {
                 console.log(`Accepted moving ${quantity} items`);
                 const packet = {
                    type: "LootSheet",
                    mode,
                    buyerId: game.user.character._id,
                    tokenId: this.actor.token?.id,
                    actorId: this.actor._id,
                    processorId,
                    itemId,
                    quantity,
                };
                console.log("LootSheet", `Sending loot request to ${processorId}`, packet);
                game.socket.emit(ActorSheetPF2eLoot.SOCKET, packet);
              });

              popup.render(true);
            }
            else
            {
                 const packet = {
                    type: "LootSheet",
                    mode,
                    buyerId: game.user.character._id,
                    tokenId: this.actor.token?.id,
                    actorId: this.actor._id,
                    processorId,
                    itemId,
                    quantity: 1,
                };
                console.log("LootSheet", `Sending loot request to ${processorId}`, packet);
                game.socket.emit(ActorSheetPF2eLoot.SOCKET, packet);
            }
        }
        else {
            console.log('Loot Sheet | No active character for user');
            ui.notifications.error('No active character for user.');
        }
    }

    static async _removeCurrency(actor, itemCost, currency, currencyValue) {
        let itemCostRemaining = itemCost;
        let currencyUnits = Math.floor(itemCost / currencyValue);
        if (currencyUnits) {
            if (currency.data.data.quantity.value <= currencyUnits) {
                itemCostRemaining -= currency.data.data.quantity.value * currencyValue;
                currencyUnits -= currency.data.data.quantity.value;
                await currency.update({ '_id': currency._id, "data.quantity.value": 0 });
            }
            else {
                await currency.update({ '_id': currency._id, "data.quantity.value": currency.data.data.quantity.value - currencyUnits });
                itemCostRemaining -= currencyUnits * currencyValue;
                currencyUnits = 0;
            }
            if (! currency.data.data.quantity.value) {
                actor.deleteOwnedItem(currency.id);
            }
        }
        return itemCostRemaining;
    }

    static async _removeCurrencyWithChange(actor, itemCost, currency, currencyValue) {
        if (currency.data.data.quantity.value) {
           await actor.updateOwnedItem({ '_id': currency._id, 'data.quantity.value': currency.data.data.quantity.value - 1 });
           const change = currencyValue - itemCost;
           addCoinsSimple(actor, { coins: { pp: 0, gp: Math.floor(change / 100), sp: Math.floor(change / 10), cp: change % 10 }});
           return 0;
        }
        return itemCost;
    }

    static async _transaction(seller, buyer, sellItem, quantity) {
        // If the buyer attempts to buy more then what's in stock, buy all the stock.
        if (sellItem.data.quantity < quantity) {
            quantity = sellItem.data.quantity;
        }

        const currencies = [ 'pp', 'gp', 'sp', 'cp' ];
        const conversionRate = { "pp": 1000, "gp": 100, "sp": 10, "cp": 1 };


        let itemCost = 0;
        const price = sellItem.purchasePrice()
        for (const denomination of Object.keys(price)) {
            itemCost += price[denomination] * conversionRate[denomination];
        }
        itemCost *= quantity;

        // Horrible hack alert.  Will revisit this after next errata/decisions regarding
        // handling coins in inventory.
        const buyerFunds = buyer.sheet.getData().actor.inventory.treasure.items;

        let buyerFundsAsCopper = 0;
        const buyerFundsByType = { "pp": [], "gp": [], "sp": [], "cp": [] };

        for (const currency of buyerFunds) {
            if (currency.data?.stackGroup?.value === 'coins') {
                buyerFundsByType[currency.data.denomination.value].push(buyer.getOwnedItem(currency._id));
                buyerFundsAsCopper += currency.data.value.value * currency.data.quantity.value * conversionRate[currency.data.denomination.value];
            }
        }

        if (itemCost > buyerFundsAsCopper) {
            console.log(buyer, `Not enough funds to purchase item.`);
            return;
        }

        // Start by removing as many coins as possible without making change.
        for (const currencyType of currencies) {
            for (const currency of buyerFundsByType[currencyType]) {
                if (itemCost) {
                    // This is inherently sequential, as the item cost remaining changes over the course of the loop.
                    // eslint-disable-next-line no-await-in-loop
                    itemCost = await this._removeCurrency(buyer, itemCost, currency, conversionRate[currencyType]);
                }
            };
        }

        // We still have funds left to remove, but have run out of exact currencies and have to spend one of a higher coin and receive change.
        if (itemCost) {
            for (const currencyType of currencies.slice().reverse()) {
                const currencyValue = conversionRate[currencyType]
                if (itemCost < currencyValue) {
                    for (const currency of buyerFundsByType[currencyType]) {
                        if (itemCost) {
                            // This is inherently sequential, as the item cost remaining changes over the course of the loop.
                            // eslint-disable-next-line no-await-in-loop
                            itemCost = await this._removeCurrencyWithChange(buyer, itemCost, currency, currencyValue);
                        }
                    }
                }
            }
        }

        ActorPF2E.transferItemToActor(seller, buyer, sellItem, quantity, null);

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

        // Buy Item
        html.find('.item-buy').click(ev => this._lootBuyItem(ev, 'Buy'));

        // Loot Item
        html.find('.item-loot').click(ev => this._lootBuyItem(ev, 'Loot'));
    }
}

Hooks.once("init", () => {
    // Serialize transaction processing with a 5 second timeout
    const transactionMutex = withTimeout(new Mutex(), 5000, new Error('Timeout occurred while acquiring lock.'));

    game.socket.on(ActorSheetPF2eLoot.SOCKET, data => {
        if (data.type === "LootSheet") {
            if (game.user.isGM && data.processorId === game.user.id) {
                console.log("Loot Sheet | Socket Message: ", data);
                const seller = data.tokenId ? game.actors.tokens[data.tokenId] : game.actors.get(data.actorId);
                const buyer = game.actors.get(data.buyerId);
                const item = seller.getOwnedItem(data.itemId);
                if (buyer && seller) {
                    transactionMutex.runExclusive(function _processLoot() {
                        if (data.mode === 'Buy') {
                            ActorSheetPF2eLoot._transaction(seller, buyer, item, parseInt(data.quantity, 10));
                        }
                        else if (data.mode === 'Loot') {
                            ActorPF2E.transferItemToActor(seller, buyer, item, parseInt(data.quantity, 10), null);
                        }
                    }).catch(function _processLootError(err) {
                        if (err instanceof Error) {
                            if (err.message === 'Timeout occurred while acquiring lock.') {
                                ui.notifications.error(`Failed to acquire lock to process ${data.mode} request.`);
                                console.error(err);
                            }
                        }
                        else {
                            ui.notifications.error(`Error processing ${data.mode} transaction.`);
                            console.error(err);
                        }
                    });
                }
                else {
                    ui.notifications.error("Failed to find buyer and seller.");
                }
            }
        }
    });
});

export default ActorSheetPF2eLoot;
