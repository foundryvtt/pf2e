/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
import { PF2EActor } from '../actor/actor';
import { PF2EItem } from './item';
import { TraitSelector5e } from '../system/trait-selector';
import { KitData } from './dataDefinitions';

/**
 * @category Other
 */
export class KitItemSheetPF2e extends ItemSheet<PF2EItem, PF2EActor> {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 630;
        options.height = 460;
        options.classes = options.classes.concat(['pf2e', 'item']);
        options.template = 'systems/pf2e/templates/items/item-sheet.html';
        options.tabs = [
            {
                navSelector: '.tabs',
                contentSelector: '.sheet-body',
                initial: 'description',
            },
        ];
        options.scrollY = ['.item-details'];
        options.dragDrop = [{ dropSelector: '.item-details' }];
        options.resizable = false;
        return options;
    }

    /**
     * Prepare item sheet data
     * Start with the base item data and extending with additional properties for rendering.
     */
    getData() {
        const data: any = super.getData();

        mergeObject(data, {
            type: 'kit',
            hasSidebar: true,
            sidebarTemplate: () => 'systems/pf2e/templates/items/kit-sidebar.html',
            hasDetails: true,
            detailsTemplate: () => 'systems/pf2e/templates/items/kit-details.html',
        });

        data.rarity = CONFIG.PF2E.rarityTraits; // treasure data
        this._prepareTraits(data.data.traits, CONFIG.PF2E.classTraits);

        return data;
    }

    _prepareTraits(traits, choices) {
        if (traits.selected) {
            traits.selected = traits.value.reduce((obj, t) => {
                obj[t] = choices[t];
                return obj;
            }, {});
        } else {
            traits.selected = [];
        } // Add custom entry

        if (traits.custom) traits.selected.custom = traits.custom;
    }

    onTraitSelector(event) {
        event.preventDefault();
        const a = $(event.currentTarget);
        const options = {
            name: a.parents('label').attr('for'),
            title: a.parent().text().trim(),
            choices: CONFIG.PF2E[a.attr('data-options')],
        };
        new TraitSelector5e(this.item, options).render(true);
    }

    _canDragDrop(selector) {
        return this.item.owner;
    }

    async _onDrop(event) {
        event.preventDefault();
        const dropTarget = $(event.target);
        const dragData = event.dataTransfer.getData('text/plain');
        const dragItem = JSON.parse(dragData);
        const containerId =
            dropTarget.data('containerId') ?? dropTarget.parents('[data-container-id]').data('containerId');

        if (dragItem.type !== 'Item') return;

        let item;

        if (dragItem.pack) {
            item = await game.packs.get(dragItem.pack).getEntity(dragItem.id);
        } else {
            item = game.items.get(dragItem.id);
        }

        if (['weapon', 'armor', 'equipment', 'consumable', 'treasure', 'backpack', 'kit'].includes(item.data.type)) {
            const entry = {
                pack: dragItem.pack,
                id: dragItem.id,
                img: item.data.img,
                quantity: 1,
                name: item.name,
                isContainer: item.data.type === 'backpack' && !containerId,
                items: {},
            };

            let { items } = (<KitData>this.item.data).data;
            let pathPrefix = 'data.items';

            if (containerId !== undefined) {
                pathPrefix = `${pathPrefix}.${containerId}.items`;
                items = items[containerId].items;
            }
            let id;
            do {
                id = randomID(5);
            } while (items[id]);

            await this.item.update({
                [`${pathPrefix}.${id}`]: entry,
            });
        }
    }

    removeItem(event) {
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

    activateListeners(html) {
        super.activateListeners(html);

        html.on('change', 'input[type="checkbox"]', (ev) => this._onSubmit(ev));

        html.on('click', '.trait-selector', (ev) => this.onTraitSelector(ev));

        html.on('click', '[data-action=remove]', (ev) => this.removeItem(ev));
    }
}
