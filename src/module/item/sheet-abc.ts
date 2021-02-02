/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
import { PF2EActor } from '../actor/actor';
import { PF2EItem } from './item';
import { AbilityString } from '../actor/actorDataDefinitions';
import { TraitSelector5e } from '../system/trait-selector';
import { ABCFeatureEntryData, AncestryData, BackgroundData, ClassData } from './dataDefinitions';

/**
 * @category Other
 */
export class ABCItemSheetPF2e extends ItemSheet<PF2EItem, PF2EActor> {
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
        const type = this.item.type;

        const data: any = {
            ...super.getData(),
            type,
            hasSidebar: this.item.data.type !== 'class',
            sidebarTemplate: () => `systems/pf2e/templates/items/${type}-sidebar.html`,
            hasDetails: true,
            detailsTemplate: () => `systems/pf2e/templates/items/${type}-details.html`,
        };

        // workaround for item sheet bug??
        const updatedData = this?.actor?.items?.get(this?.entity?.id)?.data;
        if (updatedData) {
            data.item = updatedData;
            data.data = updatedData.data;
        }

        if (this.item.data.type === 'ancestry') {
            const itemData = (<AncestryData>data.item).data;

            data.actorSizes = CONFIG.PF2E.actorSizes;
            data.rarityChoices = CONFIG.PF2E.rarityTraits;

            this._prepareTraits(data.data.traits, CONFIG.PF2E.ancestryItemTraits);
            this._prepareTraits(data.data.languages, CONFIG.PF2E.languages);
            this._prepareTraits(data.data.additionalLanguages, CONFIG.PF2E.languages);

            data.selectedBoosts = Object.fromEntries(
                Object.entries(itemData.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)]),
            );
            data.selectedFlaws = Object.fromEntries(
                Object.entries(itemData.flaws).map(([k, b]) => [k, this.getLocalizedAbilities(b)]),
            );

            data.size = CONFIG.PF2E.actorSizes[itemData.size];
            data.rarity = CONFIG.PF2E.rarityTraits[itemData.traits.rarity.value];
        } else if (this.item.data.type === 'background') {
            const itemData = (<BackgroundData>this.item.data).data;

            data.rarityChoices = CONFIG.PF2E.rarityTraits;
            data.skills = CONFIG.PF2E.skills;

            this._prepareTraits(data.data.traits, CONFIG.PF2E.ancestryItemTraits);
            this._prepareTraits(data.data.trainedSkills, CONFIG.PF2E.skills);

            data.selectedBoosts = Object.fromEntries(
                Object.entries(itemData.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)]),
            );

            data.rarity = CONFIG.PF2E.rarityTraits[itemData.traits.rarity.value];
        } else if (this.item.data.type === 'class') {
            const itemData = (<ClassData>this.item.data).data;

            data.rarityChoices = CONFIG.PF2E.rarityTraits;
            data.skills = CONFIG.PF2E.skills;
            data.proficiencyChoices = CONFIG.PF2E.proficiencyLevels;

            data.selectedKeyAbility = this.getLocalizedAbilities(itemData.keyAbility);

            this._prepareTraits(data.data.traits, CONFIG.PF2E.ancestryItemTraits);
            this._prepareTraits(data.data.trainedSkills, CONFIG.PF2E.skills);
            this._prepareTraits(data.data.ancestryFeatLevels, CONFIG.PF2E.levels);
            this._prepareTraits(data.data.classFeatLevels, CONFIG.PF2E.levels);
            this._prepareTraits(data.data.generalFeatLevels, CONFIG.PF2E.levels);
            this._prepareTraits(data.data.skillFeatLevels, CONFIG.PF2E.levels);
            this._prepareTraits(data.data.skillIncreaseLevels, CONFIG.PF2E.levels);
            this._prepareTraits(data.data.abilityBoostLevels, CONFIG.PF2E.levels);

            data.rarity = CONFIG.PF2E.rarityTraits[itemData.traits.rarity.value];
        }

        return data;
    }

    private getLocalizedAbilities(traits: { value: AbilityString[] }): { [key: string]: string } {
        if (traits !== undefined && traits.value) {
            if (traits.value.length === 6) return { free: game.i18n.localize('PF2E.AbilityFree') };
            return Object.fromEntries(traits.value.map((x: string) => [x, CONFIG.PF2E.abilities[x]]));
        }

        return {};
    }

    _prepareTraits(traits: any, choices: any) {
        if (traits === undefined) {
            return;
        }
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
            choices: CONFIG.PF2E[a.attr('data-options')],
            no_custom: a.attr('data-no-custom') ?? true,
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

        if (['feat'].includes(item.data.type)) {
            const entry: ABCFeatureEntryData = {
                pack: dragItem.pack,
                id: dragItem.id,
                img: item.data.img,
                name: item.name,
                level: item.data.data.level.value,
            };

            let items: { [key: number]: ABCFeatureEntryData };
            let pathPrefix: string;

            if (this.item.data.type === 'ancestry') {
                items = (this.item.data as AncestryData).data.items;
                pathPrefix = 'data.items';
            } else if (this.item.data.type === 'background') {
                items = (this.item.data as BackgroundData).data.items;
                pathPrefix = 'data.items';
            } else if (this.item.data.type === 'class') {
                items = (this.item.data as ClassData).data.items;
                pathPrefix = 'data.items';
            } else {
                throw new Error('Unknown data type');
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

    addSkill(event) {}

    activateListeners(html) {
        super.activateListeners(html);

        html.on('change', 'input[type="checkbox"]', (ev) => this._onSubmit(ev));

        html.on('click', '.trait-selector', (ev) => this.onTraitSelector(ev));

        html.on('click', '[data-action=remove]', (ev) => this.removeItem(ev));
    }
}
