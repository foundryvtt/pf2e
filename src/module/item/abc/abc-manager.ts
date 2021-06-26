import { FeatPF2e, AncestryPF2e, ClassPF2e, BackgroundPF2e, ItemPF2e } from '@item/index';
import { AncestrySource, BackgroundSource, ClassSource, ItemSourcePF2e } from '@item/data';
import { ABCFeatureEntryData } from '@item/abc/data';
import { CharacterPF2e } from '@actor/index';
import type { FeatSource } from '@item/feat/data';
import { ErrorPF2e } from '@module/utils';

export class AncestryBackgroundClassManager {
    static async addABCFromDrop(
        source: AncestrySource | BackgroundSource | ClassSource,
        actor: CharacterPF2e,
    ): Promise<ItemPF2e[]> {
        if (source.type === 'ancestry' || source.type === 'background') {
            await this.deleteExistingFeatures(source, actor);
            return this.addFeatures(source, actor, true);
        } else {
            if (source.type !== 'class') throw ErrorPF2e('Invalid item type for ABC creation!');

            source._id = randomID(16);
            source.flags.pf2e ??= {};
            source.flags.pf2e.insertedClassFeaturesLevel = actor.level;

            const itemsToCreate: ItemSourcePF2e[] = await this.getClassFeaturesForLevel(source, 0, actor.level);
            itemsToCreate.push(source);
            return actor.createEmbeddedDocuments('Item', itemsToCreate, { keepId: true });
        }
    }

    static async ensureClassFeaturesForLevel(
        classItem: ClassPF2e,
        actor: CharacterPF2e,
        minLevelInput?: number,
    ): Promise<void> {
        const minLevel: number = minLevelInput ?? classItem.data.flags.pf2e?.insertedClassFeaturesLevel ?? 0;
        const classFeaturesToCreate = await this.getClassFeaturesForLevel(classItem, minLevel, actor.level);

        if (classFeaturesToCreate.length > 0) {
            await actor.createEmbeddedDocuments('Item', classFeaturesToCreate, { keepId: true, render: false });
            classItem.setFlag(game.system.id, 'insertedClassFeaturesLevel', actor.level);
        }
    }

    protected static async getClassFeaturesForLevel(
        item: ClassPF2e | ClassSource,
        minLevel: number,
        actorLevel: number,
    ): Promise<FeatSource[]> {
        const classFeatsToAdd = item instanceof ClassPF2e ? item.data.data.items : item.data.items;
        const itemId = item instanceof ClassPF2e ? item.id : item._id;

        if (minLevel >= actorLevel) {
            // no need to do anything, since we've seen it all
            return [];
        }

        const featuresToAdd = Object.values(classFeatsToAdd).filter(
            (entryData) => actorLevel >= entryData.level && entryData.level > minLevel,
        );

        return this.getFeatures(featuresToAdd, itemId);
    }

    protected static async getFeatures(entries: ABCFeatureEntryData[], locationId: string): Promise<FeatSource[]> {
        const feats: FeatSource[] = [];
        if (entries.length > 0) {
            // Get feats from a compendium pack
            const packEntries = entries.filter((entry) => entry.pack !== undefined);
            if (packEntries.length > 0) {
                const compendiumFeats = await this.getFromCompendium(packEntries);
                feats.push(
                    ...compendiumFeats.map((feat) => {
                        if (feat instanceof FeatPF2e) {
                            const featSource = feat.toObject();
                            featSource._id = randomID(16);
                            featSource.data.location = locationId;
                            // There are some classes (e.g. Investigator) where multiple active effects have the same id
                            featSource.effects.forEach((effect) => {
                                effect._id = randomID(16);
                            });
                            return featSource;
                        } else {
                            throw ErrorPF2e('Invalid item type referenced in ABCFeatureEntryData');
                        }
                    }),
                );
            }
            // Get feats from the game.items collection
            const gameEntries = entries.filter((entry) => entry.pack === undefined);
            feats.push(
                ...gameEntries.map((entry) => {
                    const item = game.items.get(entry.id);
                    if (item instanceof FeatPF2e) {
                        const itemData = item.toObject();
                        itemData._id = randomID(16);
                        return itemData;
                    } else {
                        throw ErrorPF2e('Invalid item type referenced in ABCFeatureEntryData');
                    }
                }),
            );
        }
        return feats;
    }

    protected static async getFromCompendium(entries: ABCFeatureEntryData[]): Promise<FeatPF2e[]> {
        const feats: FeatPF2e[] = [];
        // Entries can be from different packs
        const packs = new Set(entries.map((entry) => entry.pack!));
        for await (const pack of packs) {
            // Only fetch feats that are in this pack
            const entryIds = entries.filter((entry) => entry.pack === pack).map((entry) => entry.id);
            feats.push(
                ...(await game.packs
                    .get<CompendiumCollection<FeatPF2e>>(pack, { strict: true })
                    // Use NeDB query to fetch all needed feats in one transaction
                    .getDocuments({ _id: { $in: entryIds } })),
            );
        }
        return feats;
    }

    protected static async addFeatures(
        itemSource: AncestrySource | BackgroundSource,
        actor: CharacterPF2e,
        createSource = false,
    ): Promise<ItemPF2e[]> {
        await this.deleteExistingFeatures(itemSource, actor);
        const itemsToCreate: ItemSourcePF2e[] = [];
        if (createSource) {
            itemSource._id = randomID(16);
            itemsToCreate.push(itemSource);
        }
        const entriesData = Object.values(itemSource.data.items);
        itemsToCreate.push(...(await this.getFeatures(entriesData, itemSource._id)));
        return actor.createEmbeddedDocuments('Item', itemsToCreate, { keepId: true });
    }

    protected static async deleteExistingFeatures(
        itemSource: AncestrySource | BackgroundSource,
        actor: CharacterPF2e,
    ): Promise<void> {
        // Ancestries, backgrounds, and classes are singletons, so we need to remove the others
        const existingABCIds = actor.itemTypes[itemSource.type].map((item: AncestryPF2e | BackgroundPF2e) => item.id);
        const existingFeatureIds = actor.itemTypes.feat
            .filter((feat) => existingABCIds.includes(feat.data.data.location))
            .map((feat) => feat.id);

        if (existingABCIds.length > 0 || existingFeatureIds.length > 0) {
            await actor.deleteEmbeddedDocuments('Item', existingABCIds.concat(existingFeatureIds), { render: false });
        }
    }
}
