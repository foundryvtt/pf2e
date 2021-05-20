import type {
    ABCFeatureEntryData,
    AncestryData,
    BackgroundData,
    ClassData,
    FeatData,
    ItemDataPF2e,
} from './data/types';
import { ItemPF2e, FeatPF2e } from './index';
import { CharacterPF2e } from '@actor/character';

/** Abstract base class representing a Pathfinder (A)ncestry, (B)ackground, or (C)lass */
export abstract class ABCItemPF2e extends ItemPF2e {
    protected async getFeature(entry: ABCFeatureEntryData): Promise<FeatData> {
        if (entry.pack) {
            const pack = game.packs.get(entry.pack);
            const feat = await pack?.getEntity(entry.id);
            return feat instanceof FeatPF2e
                ? feat.toObject()
                : Promise.reject(new Error('Invalid item type referenced in ABCFeatureEntryData'));
        } else {
            const feat = game.items.get(entry.id);
            if (feat === undefined || !(feat instanceof FeatPF2e)) {
                throw Error('Invalid item type referenced in ABCFeatureEntryData');
            }
            return feat.toObject();
        }
    }

    protected async deleteExistingFeatures(actor: CharacterPF2e): Promise<void> {
        // Ancestries, backgrounds, and classes are singletons, so we need to remove the others
        const existingABCIds = actor.items.contents.flatMap((item) =>
            item.type === this.type && item.id !== this.id ? item.id : [],
        );
        const existingFeatureIds = actor.itemTypes.feat
            .filter((feat) => existingABCIds.includes(feat.data.data.location))
            .map((feat) => feat.id);
        await actor.deleteEmbeddedDocuments('Item', existingABCIds.concat(existingFeatureIds));
    }

    async addFeatures(actor: CharacterPF2e): Promise<void> {
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
        await actor.createEmbeddedDocuments('Item', featuresData);
    }

    /** @override */
    protected _onCreate(itemData: ItemDataPF2e, options: EntityCreateOptions, userId: string): void {
        super._onCreate(itemData, options, userId);
        if (this.actor instanceof CharacterPF2e && game.user.id === userId) {
            this.addFeatures(this.actor);
        }
    }
}

export interface ABCItemPF2e {
    data: AncestryData | BackgroundData | ClassData;
}
