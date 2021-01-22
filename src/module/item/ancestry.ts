import { PF2ECharacter } from '../actor/character';
import { ABCFeatureEntryData, AncestryData, FeatData } from './dataDefinitions';
import { PF2EItem } from './item';
import { PF2EFeat } from './others';

export class PF2EAncestry extends PF2EItem {
    data!: AncestryData;
    static async getAncestryItemData(entry: ABCFeatureEntryData): Promise<FeatData> {
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

    static async addToActor(actor: PF2ECharacter, itemData: AncestryData) {
        // ancestries are singletons, so we need to remove the others
        const existingAncestryIds = actor.items.filter((x) => x.type === 'ancestry').map((x) => x._id);
        const existingAncestryFeatureIds = actor.items
            .filter((x: PF2EItem) => x.data.type === 'feat' && existingAncestryIds.includes(x.data.data.location))
            .map((x) => x._id);
        actor.deleteEmbeddedEntity('OwnedItem', existingAncestryIds.concat(existingAncestryFeatureIds));

        // create the ancestry in order to get its
        const createdAncestry = await actor.createEmbeddedEntity('OwnedItem', itemData);

        const ancestryFeaturesToCreate = await Promise.all(
            Object.values(itemData.data.items).map(PF2EAncestry.getAncestryItemData),
        );

        for (const feature of ancestryFeaturesToCreate) {
            feature.data.location = createdAncestry._id;
        }
        await actor.createEmbeddedEntity('OwnedItem', ancestryFeaturesToCreate);
    }
}
