import { calculateWealth } from '@item/treasure';
import { ActorSheetPF2e } from './base';
import { LootPF2e } from '../loot';
import { calculateBulk, formatBulk, indexBulkItemsById, itemsFromActorData } from '@item/bulk';
import { getContainerMap } from '@item/container';
import { DistributeCoinsPopup } from './popups/distribute-coins-popup';
import { ItemDataPF2e, InventoryItemType, isPhysicalItem, PhysicalItemData, KitData } from '@item/data-definitions';
import { LootNPCsPopup } from './loot/loot-npcs-popup';
import { InventoryItem } from './data-types';

/**
 * @category Actor
 */
export class LootSheetPF2e extends ActorSheetPF2e<LootPF2e> {
    /** @override */
    constructor(actor: LootPF2e, options: Partial<BaseEntitySheetOptions> = {}) {
        super(actor, { ...options, editable: true });
    }

    /** @override */
    static get defaultOptions() {
        const options = super.defaultOptions;
        return mergeObject(options, {
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
        return !this.actor.owner && this.actor.isLootableBy(game.user);
    }

    /** @override */
    getData() {
        const sheetData = super.getData();

        // update currency based on items
        if (sheetData.actor.items !== undefined) {
            const treasure = calculateWealth(sheetData.actor.items);
            sheetData.totalTreasure = {};
            for (const denomination of ['cp', 'sp', 'gp', 'pp'] as const) {
                sheetData.totalTreasure[denomination] = {
                    value: treasure[denomination],
                    label: CONFIG.PF2E.currencies[denomination],
                };
            }
        }

        // Precalculate some data to adapt sheet more easily
        sheetData.isLoot = this.actor.data.data.lootSheetType === 'Loot';
        sheetData.isMerchant = !sheetData.isLoot;

        this.prepareItems(sheetData);

        return sheetData;
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
            InventoryItemType,
            { label: string; items: (Exclude<PhysicalItemData, KitData> & { totalWeight?: string })[] }
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

        const itemsData: InventoryItem[] = actorData.items.filter((itemData: ItemDataPF2e) => isPhysicalItem(itemData));
        for (const itemData of itemsData) {
            itemData.showEdit = game.user.isGM || (itemData.isIdentified && this.actor.owner);

            itemData.img ??= CONST.DEFAULT_TOKEN;
            const containerData = containers.get(itemData._id);
            if (!containerData) continue;

            itemData.containerData = containerData;
            itemData.showEdit = game.user.isGM || (itemData.isIdentified && this.actor.owner);
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
    protected async _onDropItem(
        event: ElementDragEvent,
        data: DropCanvasData,
    ): Promise<(ItemDataPF2e | null)[] | ItemDataPF2e | null> {
        // Prevent a Foundry permissions error from being thrown when a player drops an item from an unowned
        // loot sheet to the same sheet
        if (this.actor.id === data.actorId && !this.actor.hasPerm(game.user, 'OWNER')) {
            return null;
        }
        return super._onDropItem(event, data);
    }
}
