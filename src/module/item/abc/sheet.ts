import { AbilityString } from '@actor/data';
import { ABCFeatureEntryData } from '@item/abc/data';
import { FeatType } from '@item/feat/data';
import { AncestryPF2e, BackgroundPF2e, ClassPF2e, FeatPF2e, ItemPF2e } from '@item/index';
import { LocalizePF2e } from '@system/localize';
import { ItemSheetPF2e } from '../sheet/base';
import { ABCSheetData } from '../sheet/data-types';

type ABCItem = AncestryPF2e | BackgroundPF2e | ClassPF2e;

export abstract class ABCSheetPF2e<TItem extends ABCItem> extends ItemSheetPF2e<TItem> {
    static override get defaultOptions() {
        return {
            ...super.defaultOptions,
            scrollY: ['.item-details'],
            dragDrop: [{ dropSelector: '.item-details' }],
        };
    }

    override getData(): ABCSheetData<TItem> {
        const itemType = this.item.type;

        return {
            ...this.getBaseData(),
            hasSidebar: itemType !== 'class',
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

    protected override async _onDrop(event: ElementDragEvent): Promise<void> {
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

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);
        html.on('click', '[data-action=remove]', (ev) => this.removeItem(ev));
    }
}
