import { AbilityString } from '@actor/actor-data-definitions';
import { ABCFeatureEntryData, FeatType } from '@item/data-definitions';
import { ItemSheetPF2e } from './base';
import { PF2EFeat } from '@item/others';
import { PF2EAncestry } from '@item/ancestry';
import { PF2EBackground } from '@item/background';
import { PF2EClass } from '@item/class';
import { PF2EItem } from '@item/item';
import { TraitSelector5e } from '@system/trait-selector';
import { LocalizePF2e } from '@system/localize';
import { ABCSheetData } from './data-types';
import { ConfigPF2e } from '@scripts/config';

/**
 * @category Other
 */
export abstract class ABCSheetPF2e<
    ItemType extends PF2EAncestry | PF2EBackground | PF2EClass
> extends ItemSheetPF2e<ItemType> {
    /** @override */
    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            scrollY: ['.item-details'],
            dragDrop: [{ dropSelector: '.item-details' }],
        };
    }

    /** @override */
    getData(): ABCSheetData<ItemType['data']> {
        const itemType = this.item.type;

        return {
            ...this.getBaseData(),
            hasSidebar: this.item.data.type !== 'class',
            sidebarTemplate: () => `systems/pf2e/templates/items/${itemType}-sidebar.html`,
            hasDetails: true,
            detailsTemplate: () => `systems/pf2e/templates/items/${itemType}-details.html`,
        };
    }

    protected getLocalizedAbilities(traits: { value: AbilityString[] }): { [key: string]: string } {
        if (traits !== undefined && traits.value) {
            if (traits.value.length === 6) return { free: game.i18n.localize('PF2E.AbilityFree') };
            return Object.fromEntries(traits.value.map((x: AbilityString) => [x, CONFIG.PF2E.abilities[x]]));
        }

        return {};
    }

    /** @override */
    onTraitSelector(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        const a = $(event.currentTarget);
        const options = {
            name: a.parents('label').attr('for'),
            title: a.parent().text().trim(),
            choices: CONFIG.PF2E[a.attr('data-options') as keyof ConfigPF2e['PF2E']],
            no_custom: a.attr('data-no-custom') ?? true,
        };
        new TraitSelector5e(this.item, options).render(true);
    }

    /** Is the dropped feat or feature valid for the given section? */
    private isValidDrop(event: ElementDragEvent, feat: PF2EFeat): boolean {
        const validFeatTypes: FeatType[] = $(event.target).closest('.abc-list').data('valid-drops')?.split(' ') ?? [];
        if (validFeatTypes.includes(feat.featType.value)) {
            return true;
        }

        const goodTypes = validFeatTypes.map((featType) => game.i18n.localize(CONFIG.PF2E.featTypes[featType]));
        if (goodTypes.length === 1) {
            const badType = feat.featType.label;
            const warning = game.i18n.format(LocalizePF2e.translations.PF2E.Item.ABC.InvalidDrop, {
                badType,
                goodType: goodTypes[0],
            });
            ui.notifications.warn(warning);
            return false;
        }

        // No feat/feature type restriction value, so let it through
        return true;
    }

    /** @override */
    protected async _onDrop(event: ElementDragEvent): Promise<void> {
        event.preventDefault();
        const dataString = event.dataTransfer?.getData('text/plain');
        const dropData = JSON.parse(dataString ?? '');
        const item = await PF2EItem.fromDropData(dropData);

        if (!(item instanceof PF2EFeat) || !this.isValidDrop(event, item)) {
            return;
        }

        const entry: ABCFeatureEntryData = {
            pack: dropData.pack,
            id: dropData.id,
            img: item.data.img,
            name: item.name,
            level: item.data.data.level.value,
        };

        const items = this.item.data.data.items;
        const pathPrefix = 'data.items';

        let id: string;
        do {
            id = randomID(5);
        } while (items[id]);

        await this.item.update({
            [`${pathPrefix}.${id}`]: entry,
        });
    }

    private removeItem(event: JQuery.ClickEvent) {
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

    /** @override */
    activateListeners(html: JQuery): void {
        super.activateListeners(html);
        html.on('click', '[data-action=remove]', (ev) => this.removeItem(ev));
    }
}
