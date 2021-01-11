/* global game, CONFIG */
import { calculateWealth } from '../../item/treasure';
import { ActorSheetPF2e } from './base';
import { PF2ELoot } from '../loot';
import { calculateBulk, itemsFromActorData, stacks, formatBulk, indexBulkItemsById } from '../../item/bulk';
import { getContainerMap } from '../../item/container';
import { DistributeCoinsPopup } from './DistributeCoinsPopup';
import { PF2EItem } from '../../item/item';
import { PF2EPhysicalItem } from '../../item/physical';
import { isPhysicalItem } from '../../item/dataDefinitions';
import { LootNPCsPopup } from './loot/LootNPCsPopup';

/**
 * @category Actor
 */
export class ActorSheetPF2eLoot extends ActorSheetPF2e {
    /** @override */
    constructor(actor: PF2ELoot, options: { editable: boolean }) {
        options.editable = true;
        super(actor, options);
    }

    /** @override */
    static get defaultOptions() {
        const options = super.defaultOptions;
        return mergeObject(options, {
            classes: options.classes.concat(['pf2e', 'actor', 'loot']),
            width: 650,
            height: 680,
            tabs: [{ navSelector: '.sheet-navigation', contentSelector: '.sheet-content', initial: 'inventory' }],
        });
    }

    /** @override */
    get template() {
        const editableSheetPath = 'systems/pf2e/templates/actors/loot-sheet.html';
        const nonEditableSheetPath = 'systems/pf2e/templates/actors/loot-sheet-no-edit.html';

        const isEditable = this.actor.getFlag('pf2e', 'editLoot.value');

        if (isEditable && game.user.isGM) return editableSheetPath;

        return nonEditableSheetPath;
    }

    /** @override */
    getData() {
        const sheetData = super.getData();

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

        // Process default values
        const isEditable = this.actor.getFlag('pf2e', 'editLoot.value');
        if (isEditable === undefined) {
            this.actor.setFlag('pf2e', 'editLoot', { value: false });
        }

        // Precalculate some data to adapt sheet more easily
        sheetData.isLoot = sheetData.data.lootSheetType === 'Loot';
        sheetData.isShop = !sheetData.isLoot;

        this._prepareItems(sheetData.actor);

        // TEMP: Name edit is only available for the GM
        sheetData.isGM = game.user.isGM;

        return sheetData;
    }

    _prepareItems(actorData) {
        const inventory = {
            weapon: { label: game.i18n.localize('PF2E.InventoryWeaponsHeader'), items: [] },
            armor: { label: game.i18n.localize('PF2E.InventoryArmorHeader'), items: [] },
            equipment: { label: game.i18n.localize('PF2E.InventoryEquipmentHeader'), items: [] },
            consumable: { label: game.i18n.localize('PF2E.InventoryConsumablesHeader'), items: [] },
            treasure: { label: game.i18n.localize('PF2E.InventoryTreasureHeader'), items: [] },
            backpack: { label: game.i18n.localize('PF2E.InventoryBackpackHeader'), items: [] },
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
            // item identification
            i.identified = !isPhysicalItem(i) || PF2EPhysicalItem.isIdentified(i);
            i.showGMInfo = game.user.isGM;
            i.showEdit = i.showGMInfo || i.identified;

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
                const [approximatedBulk] = calculateBulk([indexedBulkItems.get(i._id)], stacks, false, bulkConfig);
                i.totalWeight = formatBulk(approximatedBulk);
                i.hasCharges = i.type === 'consumable' && i.data.charges.max > 0;
                i.isTwoHanded =
                    i.type === 'weapon' && !!(i.data.traits.value || []).find((x) => x.startsWith('two-hand'));
                i.wieldedTwoHanded = i.type === 'weapon' && (i.data.hands || {}).value;
                inventory[i.type].items.push(i);
            }
        }

        actorData.inventory = inventory;
    }

    // Events

    private _distributeCoins(event) {
        event.preventDefault();
        new DistributeCoinsPopup(this.actor, {}).render(true);
    }

    private _lootNPCs(event) {
        event.preventDefault();
        if (canvas?.tokens?.controlled?.length > 0) {
            new LootNPCsPopup(this.actor, {}).render(true);
        } else {
            ui.notifications.warn('No tokens selected.');
        }
    }

    /** @override
     * Anyone can loot from a loot sheet
     */
    protected _canDragStart(_selector: string): boolean {
        return true;
    }

    /** @override */
    protected _canDragDrop(_selector: string): boolean {
        return true;
    }

    /** @override */
    protected async _onDropItem(event: DragEvent, data: { actorId: string }): Promise<PF2EItem> {
        // Prevent a Foundry permissions error from being thrown when a player drops an item from an unowned
        // loot sheet to the same sheet
        if (this.actor.id === data.actorId && !this.actor.hasPerm(game.user, 'OWNER')) {
            return null;
        }
        return super._onDropItem(event, data);
    }

    activateListeners(html: JQuery<HTMLElement>) {
        super.activateListeners(html);

        const shouldListenToEvents = this.options.editable;

        if (shouldListenToEvents) {
            html.find('.split-coins')
                .removeAttr('disabled')
                .on('click', (ev) => this._distributeCoins(ev));
            html.find('.loot-npcs')
                .removeAttr('disabled')
                .on('click', (ev) => this._lootNPCs(ev));
            html.find('.isLootEditable').on('change', (ev: JQuery.ChangeEvent<HTMLInputElement>) => {
                this.actor.setFlag('pf2e', 'editLoot', { value: ev.target.checked });
            });
        }
    }
}
