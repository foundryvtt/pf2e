import { PF2ECharacter } from '../actor/character';
import { ABCFeatureEntryData, BackgroundData, FeatData } from './dataDefinitions';
import { PF2EItem } from './item';
import { PF2EFeat } from './others';

export class PF2EBackground extends PF2EItem {
    data!: BackgroundData;

    static async getBackgroundItemData(entry: ABCFeatureEntryData): Promise<FeatData> {
        if (entry.pack) {
            const pack = game.packs.get<PF2EFeat>(entry.pack);
            return pack.getEntry(entry.id);
        } else {
            const feat = game.items.get(entry.id);
            if (feat?.data.type !== 'feat') {
                throw Error('Invalid item type referenced in ABCFeatureEntryData');
            }
            return duplicate(feat?.data);
        }
    }

    static async addToActor(actor: PF2ECharacter, itemData: BackgroundData) {
        // ancestries are singletons, so we need to remove the others
        const existingBackgroundIds = actor.items.filter((x) => x.type === 'background').map((x) => x._id);
        const existingBackgroundFeatureIds = actor.items
            .filter((x: PF2EItem) => x.data.type === 'feat' && existingBackgroundIds.includes(x.data.data.location))
            .map((x) => x._id);
        actor.deleteEmbeddedEntity('OwnedItem', existingBackgroundIds.concat(existingBackgroundFeatureIds));

        // create the background in order to get its
        const createdBackground = await actor.createEmbeddedEntity('OwnedItem', itemData);

        const backgroundFeaturesToCreate = await Promise.all(
            Object.values(itemData.data.items).map(PF2EBackground.getBackgroundItemData),
        );

        for (const feature of backgroundFeaturesToCreate) {
            feature.data.location = createdBackground._id;
        }
        await actor.createEmbeddedEntity('OwnedItem', backgroundFeaturesToCreate);
    }
}
