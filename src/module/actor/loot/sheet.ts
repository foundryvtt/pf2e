import { ActorSheetPF2e } from '../sheet/base';
import { LootPF2e } from '@actor/loot';
import { calculateBulk, formatBulk, indexBulkItemsById, itemsFromActorData } from '@item/bulk';
import { getContainerMap } from '@item/container/helpers';
import { DistributeCoinsPopup } from '../sheet/popups/distribute-coins-popup';
import { ItemDataPF2e, PhysicalItemData } from '@item/data';
import { LootNPCsPopup } from '../sheet/loot/loot-npcs-popup';
import { ActorSheetDataPF2e, InventoryItem, LootSheetDataPF2e } from '../sheet/data-types';
import { PhysicalItemType } from '@item/physical/data';
import { isPhysicalData } from '@item/data/helpers';

export class LootSheetPF2e extends ActorSheetPF2e<LootPF2e> {
    /** @override */
    static get defaultOptions() {
        const options = super.defaultOptions;
        return mergeObject(options, {
            editable: true,
            classes: options.classes.concat('loot'),
            width: 650,
            height: 680,
            tabs: [{ navSelector: '.sheet-navigation', contentSelector: '.sheet-content', initial: 'inventory' }],
        });
    }

    /** @override */
    get template() {
        return 'systems/pf2e/templates/actors/loot/sheet.html';
    }

    /** @override */
    get isLootSheet(): boolean {
        return !this.actor.isOwner && this.actor.isLootableBy(game.user);
    }

    /** @override */
    getData(): LootSheetDataPF2e {
        const sheetData: ActorSheetDataPF2e<LootPF2e> = super.getData();
        const isLoot = this.actor.data.data.lootSheetType === 'Loot';
        return { ...sheetData, isLoot };
    }

    /** @override */
    activateListeners(html: JQuery<HTMLElement>) {
        super.activateListeners(html);

        if (this.options.editable) {
            html.find('.split-coins')
                .removeAttr('disabled')
                .on('click', (event) => this.distributeCoins(event));
            html.find('.loot-npcs')
                .removeAttr('disabled')
                .on('click', (event) => this.lootNPCs(event));
        }
    }

    prepareItems(sheetData: any) {
        const actorData: any = sheetData.actor;
        const inventory: Record<
            PhysicalItemType,
            { label: string; items: (PhysicalItemData & { totalWeight?: string })[] }
        > = {
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
        const bulkItemsById = indexBulkItemsById(bulkItems);
        const containers = getContainerMap({
            items: actorData.items,
            bulkItemsById,
            bulkConfig,
        });

        const itemsData: InventoryItem[] = actorData.items.filter((itemData: ItemDataPF2e) => isPhysicalData(itemData));
        for (const itemData of itemsData) {
            itemData.showEdit = game.user.isGM || (itemData.isIdentified && this.actor.isOwner);

            itemData.img ??= CONST.DEFAULT_TOKEN;
            const containerData = containers.get(itemData._id);
            if (!containerData) continue;

            itemData.containerData = containerData;
            itemData.showEdit = game.user.isGM || (itemData.isIdentified && this.actor.isOwner);
            itemData.isInContainer = containerData.isInContainer;
            itemData.isSellableTreasure =
                itemData.showEdit && itemData.type === 'treasure' && itemData.data.stackGroup.value !== 'coins';
            itemData.canBeEquipped = false;
            // Inventory
            itemData.data.quantity.value = itemData.data.quantity.value || 0;
            itemData.data.weight.value = itemData.data.weight.value || 0;
            const bulkItem = bulkItemsById.get(itemData._id);
            const [approximatedBulk] = calculateBulk({
                items: bulkItem === undefined ? [] : [bulkItem],
                bulkConfig,
            });
            itemData.totalWeight = formatBulk(approximatedBulk);
            inventory[itemData.type].items.push(itemData);
        }

        actorData.inventory = inventory;
    }

    // Events

    private distributeCoins(event: JQuery.ClickEvent) {
        event.preventDefault();
        new DistributeCoinsPopup(this.actor, {}).render(true);
    }

    private lootNPCs(event: JQuery.ClickEvent) {
        event.preventDefault();
        if (canvas.tokens.controlled.some((token) => token.actor?.id !== this.actor.id)) {
            new LootNPCsPopup(this.actor).render(true);
        } else {
            ui.notifications.warn('No tokens selected.');
        }
    }

    /** @override */
    protected async _onDropItem(event: ElementDragEvent, data: DropCanvasData): Promise<unknown> {
        // Prevent a Foundry permissions error from being thrown when a player drops an item from an unowned
        // loot sheet to the same sheet
        if (this.actor.id === data.actorId && !this.actor.testUserPermission(game.user, 'OWNER')) {
            return null;
        }
        return super._onDropItem(event, data);
    }
}
