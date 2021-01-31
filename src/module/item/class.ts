import { PF2ECharacter } from '../actor/character';
import { ABCFeatureEntryData, ClassData, FeatData } from './dataDefinitions';
import { PF2EItem } from './item';
import { PF2EFeat } from './others';

export class PF2EClass extends PF2EItem {
    data!: ClassData;

    static async getClassItemData(entry: ABCFeatureEntryData): Promise<FeatData | undefined> {
        const feat = await (async (): Promise<CompendiumEntity | undefined> => {
            if (entry.pack) {
                const pack = game.packs.get(entry.pack);
                if (pack === null) {
                    console.error(`Failed to load pack ${entry.pack}`);
                    return undefined;
                }
                return pack.getEntity(entry.id);
            }
            return game.items.get(entry.id) ?? undefined;
        })();

        if (!(feat instanceof PF2EFeat)) {
            console.error('Invalid item type referenced in ABCFeatureEntryData');
            return undefined;
        }
        return duplicate(feat);
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

        // ideally this would be a Promise.all on a map with a filter, but
        // we're working around a bug in foundry where you're not allowed to
        // call packs.get() multiple times concurrently, which this avoids.
        const classFeaturesToCreate: FeatData[] = [];
        for (const feature of featuresToAdd) {
            const featureData = await PF2EClass.getClassItemData(feature);
            if (featureData === undefined) {
                continue;
            }
            classFeaturesToCreate.push(featureData);
        }

        for (const feature of classFeaturesToCreate) {
            feature.data.location = itemData._id;
        }

        return Promise.all([
            actor.createEmbeddedEntity('OwnedItem', classFeaturesToCreate),
            item.setFlag(game.system.id, 'insertedClassFeaturesLevel', actor.level),
        ]);
    }
}
