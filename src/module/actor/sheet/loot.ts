import { calculateWealth } from '@item/treasure';
import { ActorSheetPF2e } from './base';
import { LootPF2e } from '../loot';
import { calculateBulk, formatBulk, indexBulkItemsById, itemsFromActorData } from '@item/bulk';
import { getContainerMap } from '@item/container';
import { DistributeCoinsPopup } from './popups/distribute-coins-popup';
import { PhysicalItemPF2e } from '@item/physical';
import { isPhysicalItem, ItemDataPF2e } from '@item/data-definitions';
import { LootNPCsPopup } from './loot/loot-npcs-popup';

/**
 * @category Actor
 */
export class LootSheetPF2e extends ActorSheetPF2e<LootPF2e> {
    /** Is the application in edit mode? */
    inEditMode = false;

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
        const editableSheetPath = 'systems/pf2e/templates/actors/loot-sheet.html';
        const nonEditableSheetPath = 'systems/pf2e/templates/actors/loot-sheet-no-edit.html';
        return this.inEditMode && this.actor.owner ? editableSheetPath : nonEditableSheetPath;
    }

    /** @override */
    get isLootSheet(): boolean {
        return !this.actor.owner && this.actor.isLootableBy(game.user) && !this.inEditMode;
    }

    /** @override */
    getData() {
        const sheetData = super.getData();

        sheetData.inEditMode = this.inEditMode;

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

        // Process default values
        const isEditable = this.actor.getFlag('pf2e', 'editLoot.value');
        if (isEditable === undefined) {
            this.actor.setFlag('pf2e', 'editLoot', { value: false });
        }

        // Precalculate some data to adapt sheet more easily
        sheetData.isLoot = this.actor.data.data.lootSheetType === 'Loot';
        sheetData.isShop = !sheetData.isLoot;

        this.prepareItems(sheetData);

        // TEMP: Name edit is only available for the GM
        sheetData.isGM = game.user.isGM;

        return sheetData;
    }

    /** @override */
    activateListeners(html: JQuery<HTMLElement>) {
        super.activateListeners(html);

        if (this.options.editable) {
            html.find('.split-coins')
                .removeAttr('disabled')
                .on('click', (event) => this._distributeCoins(event));
            html.find('.loot-npcs')
                .removeAttr('disabled')
                .on('click', (event) => this._lootNPCs(event));

            html.find<HTMLInputElement>('input.editMode').on('change', (event) => {
                const checkbox = event.delegateTarget;
                if (checkbox.checked != this.inEditMode) {
                    this.inEditMode = checkbox.checked;
                    this.render(false);
                }
            });
        }
    }

    /**
     * Take the loot sheet out of edit mode upon close
     * @override
     */
    async close(options: { force?: boolean }) {
        this.inEditMode = false;
        super.close(options);
    }

    prepareItems(sheetData: any) {
        const actorData: any = sheetData.actor;
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
        const bulkItemsById = indexBulkItemsById(bulkItems);
        const containers = getContainerMap({
            items: actorData.items,
            bulkItemsById,
            bulkConfig,
        });

        for (const i of actorData.items) {
            // item identification
            i.identified = !isPhysicalItem(i) || PhysicalItemPF2e.isIdentified(i);
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
                const bulkItem = bulkItemsById.get(i._id);
                const [approximatedBulk] = calculateBulk({
                    items: bulkItem === undefined ? [] : [bulkItem],
                    bulkConfig,
                });
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

    private _distributeCoins(event: JQuery.ClickEvent) {
        event.preventDefault();
        new DistributeCoinsPopup(this.actor, {}).render(true);
    }

    private _lootNPCs(event: JQuery.ClickEvent) {
        event.preventDefault();
        if (canvas?.tokens?.controlled?.filter((token) => token.actor._id !== this.actor._id).length > 0) {
            new LootNPCsPopup(this.actor, {}).render(true);
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
