import { PF2ECharacter } from '../actor/character';
import { PF2EABC } from './abc';
import { ClassData, FeatData } from './data-definitions';

export class PF2EClass extends PF2EABC {
    data!: ClassData;
    _data!: ClassData;

    async addFeatures(actor: PF2ECharacter): Promise<void> {
        await this.deleteExistingFeatures(actor);
        await this.ensureClassFeaturesForLevel(actor, 0);
    }

    async ensureClassFeaturesForLevel(actor: PF2ECharacter, minLevelInput?: number): Promise<void> {
        const minLevel: number =
            minLevelInput ?? (await this.getFlag(game.system.id, 'insertedClassFeaturesLevel')) ?? 0;
        if (minLevel >= actor.level) {
            // no need to do anything, since we've seen it all
            return;
        }

        const featuresToAdd = Object.values(this.data.data.items).filter(
            (entryData) => actor.level >= entryData.level && entryData.level > minLevel,
        );

        // ideally this would be a Promise.all on a map with a filter, but
        // we're working around a bug in foundry where you're not allowed to
        // call packs.get() multiple times concurrently, which this avoids.
        const classFeaturesToCreate: FeatData[] = [];
        for await (const feature of featuresToAdd) {
            const featureData = await this.getFeature(feature);
            if (featureData === undefined) {
                continue;
            }
            classFeaturesToCreate.push(featureData);
        }

        for (const feature of classFeaturesToCreate) {
            feature.data.location = this.id;
        }

        await Promise.all([
            actor.createEmbeddedEntity('OwnedItem', classFeaturesToCreate),
            this.setFlag(game.system.id, 'insertedClassFeaturesLevel', actor.level),
        ]);
    }
}
