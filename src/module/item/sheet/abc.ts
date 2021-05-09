import { AbilityString } from '@actor/data-definitions';
import { ABCFeatureEntryData, FeatType } from '@item/data/types';
import { ItemSheetPF2e } from './base';
import { FeatPF2e } from '@item/feat';
import { AncestryPF2e } from '@item/ancestry';
import { BackgroundPF2e } from '@item/background';
import { ClassPF2e } from '@item/class';
import { ItemPF2e } from '@item/base';
import { LocalizePF2e } from '@system/localize';
import { ABCSheetData } from './data-types';

/**
 * @category Other
 */
export abstract class ABCSheetPF2e<
    ItemType extends AncestryPF2e | BackgroundPF2e | ClassPF2e
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

    /** Is the dropped feat or feature valid for the given section? */
    private isValidDrop(event: ElementDragEvent, feat: FeatPF2e): boolean {
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
        const item = await ItemPF2e.fromDropData(dropData);

        if (!(item instanceof FeatPF2e) || !this.isValidDrop(event, item)) {
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
