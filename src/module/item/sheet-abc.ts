/* global randomID */
/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
import { TraitSelector5e } from '../system/trait-selector';
import { ABCFeatureEntryData, AncestryData } from './dataDefinitions';

/**
 * @category Other
 */
export class ABCItemSheetPF2e extends ItemSheet {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 630;
        options.height = 460;
        options.classes = options.classes.concat(['pf2e', 'item']);
        options.template = 'systems/pf2e/templates/items/item-sheet.html';
        options.tabs = [{
            navSelector: ".tabs",
            contentSelector: ".sheet-body",
            initial: "description"
        }];
        options.scrollY = ['.item-details'];
        options.dragDrop = [{dropSelector: '.item-details'}]
        options.resizable = false;
        return options;
    }

    /**
     * Prepare item sheet data
     * Start with the base item data and extending with additional properties for rendering.
     */
    getData() {
        const data: any = super.getData();
        const type = this.item.type;

        mergeObject(data, {
            type,
            hasSidebar: true,
            sidebarTemplate: () => `systems/pf2e/templates/items/${type}-sidebar.html`,
            hasDetails: true,
            detailsTemplate: () => `systems/pf2e/templates/items/${type}-details.html`
        });

        const itemData = (<AncestryData>this.item.data).data;

        data.actorSizes = CONFIG.PF2E.actorSizes;
        data.rarityChoices = CONFIG.PF2E.rarityTraits;
        data.ancestryVision = CONFIG.PF2E.ancestryVision;

        this._prepareTraits(data.data.traits, CONFIG.PF2E.ancestryItemTraits);

        data.size = CONFIG.PF2E.actorSizes[itemData.size];
        data.rarity = CONFIG.PF2E.rarityTraits[itemData.traits.rarity.value];

        return data;
    }

    _prepareTraits(traits, choices) {
        if (traits.value) {
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
            choices: CONFIG.PF2E[a.attr('data-options')]
        };
        new TraitSelector5e(this.item, options).render(true);
    }

    _canDragDrop(selector) {
        return this.item.owner;
    }

    async _onDrop(event) {
        event.preventDefault();
        const dragData = event.dataTransfer.getData('text/plain');
        const dragItem = JSON.parse(dragData);

        if (dragItem.type !== 'Item') return;

        let item;

        if (dragItem.pack) {
            item = await game.packs.get(dragItem.pack).getEntity(dragItem.id);
        } else {
            item = game.items.get(dragItem.id);
        }

        if ([
            "feat",
        ].includes(item.data.type)) {
            const entry = {
                pack: dragItem.pack,
                id: dragItem.id,
                img: item.data.img,
                name: item.name,
                items: {}
            };

            let items : { [key: number]: ABCFeatureEntryData };
            let pathPrefix : string;

            if (this.item.data.type === 'ancestry') {
                items = (this.item.data as AncestryData).data.items;
                pathPrefix = 'data.items';
            } else {
                throw new Error('Unknown data type');
            }

            let id;
            do {
                id = randomID(5);
            } while (items[id]);
            
            await this.item.update({
                [`${pathPrefix}.${id}`]: entry
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
            [`data.items.${path}`]: null
        });

    }

    activateListeners(html) {
        super.activateListeners(html);

        html.on('change', 'input[type="checkbox"]', ev => this._onSubmit(ev));

        html.on('click', '.trait-selector', ev => this.onTraitSelector(ev));

        html.on('click', '[data-action=remove]', ev => this.removeItem(ev));

    }
}