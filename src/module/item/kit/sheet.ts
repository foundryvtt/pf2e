import { KitPF2e } from '@item/kit';
import { PhysicalItemPF2e } from '@item/physical';
import { ItemSheetPF2e } from '../sheet/base';

/**
 * @category Other
 */
export class KitSheetPF2e extends ItemSheetPF2e<KitPF2e> {
    static override get defaultOptions() {
        return {
            ...super.defaultOptions,
            scrollY: ['.item-details'],
            dragDrop: [{ dropSelector: '.item-details' }],
        };
    }

    override getData() {
        const data = mergeObject(super.getBaseData(), {
            type: 'kit',
            hasSidebar: true,
            sidebarTemplate: () => 'systems/pf2e/templates/items/kit-sidebar.html',
            hasDetails: true,
            detailsTemplate: () => 'systems/pf2e/templates/items/kit-details.html',
            rarity: CONFIG.PF2E.rarityTraits,
        });

        this.prepareTraits(data.data.traits, CONFIG.PF2E.classTraits);

        return data;
    }

    protected override async _onDrop(event: ElementDragEvent): Promise<void> {
        event.preventDefault();
        const dropTarget = $(event.target);
        const dragData = event.dataTransfer?.getData('text/plain');
        const dragItem = JSON.parse(dragData ?? '');
        const containerId =
            dropTarget.data('containerId') ?? dropTarget.parents('[data-container-id]').data('containerId');

        if (dragItem.type !== 'Item') return;

        const item = dragItem.pack
            ? await game.packs.get(dragItem.pack)?.getDocument(dragItem.id)
            : game.items.get(dragItem.id);

        if (!(item instanceof PhysicalItemPF2e || item instanceof KitPF2e)) {
            return;
        }

        const entry = {
            pack: dragItem.pack,
            id: dragItem.id,
            img: item.data.img,
            quantity: 1,
            name: item.name,
            isContainer: item.data.type === 'backpack' && !containerId,
            items: {},
        };

        let { items } = this.item.data.data;
        let pathPrefix = 'data.items';

        if (containerId !== undefined) {
            pathPrefix = `${pathPrefix}.${containerId}.items`;
            items = items[containerId]?.items ?? {};
        }
        let id: string;
        do {
            id = randomID(5);
        } while (items[id]);

        await this.item.update({
            [`${pathPrefix}.${id}`]: entry,
        });
    }

    removeItem(event: JQuery.ClickEvent) {
        event.preventDefault();
        const target = $(event.target).parents('li');
        const containerId = target.parents('[data-container-id]').data('containerId');
        let path = `-=${target.data('index')}`;
        if (containerId) {
            path = `${containerId}.items.${path}`;
        }

        this.item.update({
            [`data.items.${path}`]: null,
        });
    }

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);
        html.on('click', '[data-action=remove]', (event) => this.removeItem(event));
    }
}
