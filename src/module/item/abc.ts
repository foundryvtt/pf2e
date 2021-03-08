import { PF2ECharacter } from '@actor/character';
import { ABCFeatureEntryData, AncestryData, BackgroundData, ClassData, FeatData } from './data-definitions';
import { PF2EItem } from './item';
import { PF2EFeat } from './others';

/** Abstract base class representing a Pathfinder (A)ncestry, (B)ackground, or (C)lass */
export abstract class PF2EABC extends PF2EItem {
    abstract data: AncestryData | BackgroundData | ClassData;
    abstract _data: AncestryData | BackgroundData | ClassData;

    protected async getFeature(entry: ABCFeatureEntryData): Promise<FeatData> {
        if (entry.pack) {
            const pack = game.packs.get<Compendium<PF2EFeat>>(entry.pack);
            const featData = await pack?.getEntry(entry.id);
            return featData && featData.type === 'feat'
                ? featData
                : Promise.reject(new Error('Invalid item type referenced in ABCFeatureEntryData'));
        } else {
            const feat = game.items.get(entry.id)?._data;
            if (feat === undefined || !(feat instanceof PF2EFeat)) {
                throw Error('Invalid item type referenced in ABCFeatureEntryData');
            }
            return feat._data;
        }
    }

    protected async deleteExistingFeatures(actor: PF2ECharacter): Promise<void> {
        // Ancestries, backgrounds, and classes are singletons, so we need to remove the others
        const existingABCIds = actor.items.entries.flatMap((item) =>
            item.type === this.type && item.id !== this.id ? item.id : [],
        );
        const existingFeatureIds = actor.itemTypes.feat
            .filter((feat) => existingABCIds.includes(feat.data.data.location))
            .map((feat) => feat.id);
        await actor.deleteEmbeddedEntity('OwnedItem', existingABCIds.concat(existingFeatureIds));
    }

    async addFeatures(actor: PF2ECharacter): Promise<void> {
        this.deleteExistingFeatures(actor);

        const entriesData = Object.values(this.data.data.items);
        const featuresData = await entriesData
            .map((entryData) => () => this.getFeature(entryData))
            .reduce(
                (promise, getItemData) =>
                    promise.then((retrieved) =>
                        getItemData().then((featureData) => {
                            featureData.data.location = this.id;
                            return retrieved.concat([featureData]);
                        }),
                    ),
                Promise.resolve([] as FeatData[]),
            );
        await actor.createEmbeddedEntity('OwnedItem', featuresData);
    }
}
