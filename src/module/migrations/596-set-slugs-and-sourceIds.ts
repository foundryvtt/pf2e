import { MigrationBase } from './base';
import { isPhysicalItem, ItemDataPF2e } from '@item/data/types';
import { ItemPF2e } from '../item/base';

type ItemMap = Map<string, ItemPF2e>;
type PackContent = Map<string, Promise<ItemMap>>;

export class Migration596SetSlugSourceIds extends MigrationBase {
    static version = 0.596;

    /** Only PF2e system compendia will be checked against */
    private sourceIdPattern = /^Compendium\.(pf2e\.[-\w]+)\.(\w+)$/;

    private readonly itemPacks: Map<string, Compendium<ItemPF2e>>;

    /** Cached compendium content */
    private static packContent: PackContent = new Map();

    constructor() {
        super();
        this.itemPacks = new Map(
            game.packs
                .filter<Compendium<ItemPF2e>>((pack) => pack.entity === 'Item')
                .map((pack) => [pack.collection, pack]),
        );
    }

    private getPackContent(collection: string): Promise<ItemMap> {
        const cache = Migration596SetSlugSourceIds.packContent;

        console.debug(`Loading pack ${collection}`);

        const cacheAndRelease = (): Promise<ItemMap> => {
            // Cache on first retrieval
            const pack = this.itemPacks.get(collection);
            if (pack === undefined) {
                throw Error('PF2e System | Expected error retrieving compendium');
            }

            // Make all item updates wait for this content retrieval to resolve
            const promisedItems = (async () => {
                const newContent = await pack.getContent();
                const itemMap = new Map(newContent.map((item) => [item.id, item]));
                return itemMap;
            })();
            cache.set(collection, promisedItems);

            return promisedItems;
        };

        return cache.get(collection) ?? cacheAndRelease();
    }

    /** Look through each pack and attempt to find the originating item */
    private async findCompendiumItem(itemData: ItemDataPF2e, collection?: string): Promise<ItemDataPF2e | undefined> {
        const identificationData = isPhysicalItem(itemData)
            ? (((itemData.data.identification ?? null) as unknown) as {
                  status: string;
                  identified?: { name?: string };
              } | null)
            : null;
        const itemName =
            identificationData?.status === 'identified'
                ? identificationData?.identified?.name || itemData.name
                : itemData.name;

        const packs = typeof collection === 'string' ? [this.itemPacks.get(collection)] : this.itemPacks.values();

        for await (const pack of packs) {
            if (pack === undefined) continue;
            const content = await this.getPackContent(pack.collection);
            const packItem = Array.from(content.values()).find(
                (packItem) => packItem.type === itemData.type && packItem.name === itemName,
            );

            if (packItem instanceof ItemPF2e) {
                return packItem.data;
            }
        }

        return undefined;
    }

    async updateItem(itemData: ItemDataPF2e): Promise<void> {
        const existingSourceId: string | undefined = itemData.flags.core?.sourceId;
        const match = this.sourceIdPattern.exec(existingSourceId ?? '');
        const collection = Array.isArray(match) ? match[1] : undefined;

        const sourcedItemData = [collection, itemData.data.slug].every((maybeString) => typeof maybeString === 'string')
            ? itemData
            : await this.findCompendiumItem(itemData, collection);

        if (sourcedItemData) {
            console.debug(`PF2e System | Setting slug and sourceId for ${itemData.name}`);
            const sourceId = sourcedItemData.flags.core.sourceId;
            itemData.data.slug = sourcedItemData.data.slug;
            itemData.flags.core = { sourceId: sourceId };
        }
    }
}
