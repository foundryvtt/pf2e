import type { CharacterPF2e } from '@actor/character';
import { FeatSource } from '@item/feat/data';
import { ABCItemPF2e } from '../abc';
import { ClassData } from './data';

export class ClassPF2e extends ABCItemPF2e {
    static override get schema(): typeof ClassData {
        return ClassData;
    }

    get hpPerLevel(): number {
        return this.data.data.hp;
    }

    override async addFeatures(actor: CharacterPF2e): Promise<void> {
        await this.deleteExistingFeatures(actor);
        await this.ensureClassFeaturesForLevel(actor, 0);
    }

    async ensureClassFeaturesForLevel(actor: CharacterPF2e, minLevelInput?: number): Promise<void> {
        const minLevel: number = minLevelInput ?? this.getFlag(game.system.id, 'insertedClassFeaturesLevel') ?? 0;
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
        const classFeaturesToCreate: FeatSource[] = [];
        for await (const feature of featuresToAdd) {
            const featureData = await this.getFeature(feature);
            if (!featureData) continue;
            classFeaturesToCreate.push(featureData);
        }

        for (const feature of classFeaturesToCreate) {
            feature.data.location = this.id;
        }

        await actor.createEmbeddedDocuments('Item', classFeaturesToCreate);
        await this.setFlag(game.system.id, 'insertedClassFeaturesLevel', actor.level);
    }
}

export interface ClassPF2e {
    readonly data: ClassData;
}
