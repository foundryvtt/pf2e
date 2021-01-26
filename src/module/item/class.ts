import { PF2ECharacter } from '../actor/character';
import { ABCFeatureEntryData, ClassData, FeatData } from './dataDefinitions';
import { PF2EItem } from './item';
import { PF2EFeat } from './others';

export class PF2EClass extends PF2EItem {
    data!: ClassData;

    static async getClassItemData(entry: ABCFeatureEntryData): Promise<FeatData> {
        if (entry.pack) {
            const pack = game.packs.get<PF2EFeat>(entry.pack);
            if (pack === null) {
                throw Error('could not load pack');
            }
            return await pack.getEntry(entry.id);
        } else {
            const feat = game.items.get(entry.id);
            if (feat?.data.type !== 'feat') {
                throw Error('Invalid item type referenced in ABCFeatureEntryData');
            }
            return duplicate(feat?.data);
        }
    }

    static async addToActor(actor: PF2ECharacter, itemData: ClassData): Promise<void> {
        // ancestries are singletons, so we need to remove the others
        const existingClassIds = actor.items.filter((x) => x.type === 'class').map((x) => x._id);
        const existingClassFeatureIds = actor.items
            .filter((x: PF2EItem) => x.data.type === 'feat' && existingClassIds.includes(x.data.data.location))
            .map((x) => x._id);
        await actor.deleteEmbeddedEntity('OwnedItem', existingClassIds.concat(existingClassFeatureIds));

        // create the class in order to get its
        await actor.createEmbeddedEntity('OwnedItem', itemData);
        await this.ensureClassFeaturesForLevel(actor, 0);
    }

    static async ensureClassFeaturesForLevel(actor: PF2ECharacter, minLevelInput?: number): Promise<any> {
        const item = actor.items.find((x): x is PF2EClass => x.data.type === 'class');
        if (!item || item.data.type !== 'class') {
            throw Error('Cannot find class data to update features');
        }
        const itemData = item.data;

        const minLevel: number =
            minLevelInput ?? (await item.getFlag(game.system.id, 'insertedClassFeaturesLevel')) ?? 0;
        if (minLevel >= actor.level) {
            // no need to do anything, since we've seen it all
            return;
        }

        const featuresToAdd = Object.values(itemData.data.items).filter(
            (x) => actor.level >= x.level && x.level > minLevel,
        );
        const classFeaturesToCreate = await Promise.all(featuresToAdd.map(PF2EClass.getClassItemData));

        for (const feature of classFeaturesToCreate) {
            feature.data.location = itemData._id;
        }

        return Promise.all([
            actor.createEmbeddedEntity('OwnedItem', classFeaturesToCreate),
            item.setFlag(game.system.id, 'insertedClassFeaturesLevel', actor.level),
        ]);
    }
}
