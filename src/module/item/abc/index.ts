import { ItemPF2e, FeatPF2e } from '../index';
import { CharacterPF2e } from '@actor/index';
import type { FeatSource } from '@item/feat/data';
import { ErrorPF2e } from '@module/utils';
import { ABCFeatureEntryData } from './data';
import type { AncestryData, AncestrySource } from '@item/ancestry/data';
import type { BackgroundData, BackgroundSource } from '@item/background/data';
import type { ClassData, ClassSource } from '@item/class/data';

/** Abstract base class representing a Pathfinder (A)ncestry, (B)ackground, or (C)lass */
export abstract class ABCItemPF2e extends ItemPF2e {
    protected async getFeature(entry: ABCFeatureEntryData): Promise<FeatSource> {
        if (entry.pack) {
            const feat = await game.packs.get(entry.pack)?.getDocument(entry.id);
            return feat instanceof FeatPF2e
                ? feat.toObject()
                : Promise.reject(new Error('Invalid item type referenced in ABCFeatureEntryData'));
        } else {
            const feat = game.items.get(entry.id);
            if (!(feat instanceof FeatPF2e)) {
                throw ErrorPF2e('Invalid item type referenced in ABCFeatureEntryData');
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
        await this.deleteExistingFeatures(actor);

        const entriesData = Object.values(this.data.data.items);
        const featuresData: FeatSource[] = await entriesData
            .map((entryData) => () => this.getFeature(entryData))
            .reduce(
                (promise: Promise<FeatSource[]>, getItemData) =>
                    promise.then((retrieved) =>
                        getItemData().then((featureData) => {
                            featureData.data.location = this.id;
                            return retrieved.concat([featureData]);
                        }),
                    ),
                Promise.resolve([]),
            );
        await actor.createEmbeddedDocuments('Item', featuresData);
    }

    protected override _onCreate(
        data: AncestrySource | BackgroundSource | ClassSource,
        options: DocumentModificationContext,
        userId: string,
    ): void {
        super._onCreate(data, options, userId);
        if (this.actor instanceof CharacterPF2e && game.user.id === userId) {
            this.addFeatures(this.actor);
        }
    }
}

export interface ABCItemPF2e {
    readonly data: AncestryData | BackgroundData | ClassData;
}
