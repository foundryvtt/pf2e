import { FeatPF2e, ClassPF2e, ItemPF2e, ABCItemPF2e } from "@item/index";
import { AncestrySource, BackgroundSource, ClassSource, ItemSourcePF2e } from "@item/data";
import { ABCFeatureEntryData } from "@item/abc/data";
import { CharacterPF2e } from "@actor/index";
import type { FeatSource } from "@item/feat/data";
import { ErrorPF2e, sluggify } from "@module/utils";

export interface ABCManagerOptions {
    assurance?: string[];
}

export class AncestryBackgroundClassManager {
    static async addABCItem(
        source: AncestrySource | BackgroundSource | ClassSource,
        actor: CharacterPF2e,
        options?: ABCManagerOptions
    ): Promise<ItemPF2e[]> {
        switch (source.type) {
            case "ancestry": {
                await actor.ancestry?.delete();
                return this.addFeatures(source, actor, true, options);
            }
            case "background": {
                await actor.background?.delete();
                return this.addFeatures(source, actor, true, options);
            }
            case "class": {
                await actor.class?.delete();

                source._id = randomID(16);
                source.flags.pf2e ??= {};
                source.flags.pf2e.insertedClassFeaturesLevel = actor.level;

                const itemsToCreate = await this.getClassFeaturesForLevel(source, 0, actor.level);
                itemsToCreate.sort((featureA, featureB) => {
                    const levelA = featureA.data.level.value;
                    const levelB = featureB.data.level.value;
                    if (levelA > levelB) {
                        return 1;
                    } else if (levelA === levelB) {
                        return featureA.name > featureB.name ? 1 : -1;
                    } else {
                        return -1;
                    }
                });
                return actor.createEmbeddedDocuments("Item", [...itemsToCreate, source], { keepId: true });
            }
            default:
                throw ErrorPF2e("Invalid item type for ABC creation!");
        }
    }

    static async ensureClassFeaturesForLevel(
        classItem: ClassPF2e,
        actor: CharacterPF2e,
        minLevelInput?: number
    ): Promise<void> {
        const minLevel: number = minLevelInput ?? classItem.data.flags.pf2e?.insertedClassFeaturesLevel ?? 0;
        const classFeaturesToCreate = await this.getClassFeaturesForLevel(classItem, minLevel, actor.level);

        if (classFeaturesToCreate.length > 0) {
            await actor.createEmbeddedDocuments("Item", classFeaturesToCreate, { keepId: true, render: false });
            classItem.setFlag(game.system.id, "insertedClassFeaturesLevel", actor.level);
        }
    }

    static async getItemSource(packName: "pf2e.ancestries", name: string): Promise<AncestrySource>;
    static async getItemSource(packName: "pf2e.backgrounds", name: string): Promise<BackgroundSource>;
    static async getItemSource(packName: "pf2e.classes", name: string): Promise<ClassSource>;
    static async getItemSource(packName: "pf2e.feats-srd", name: string): Promise<FeatSource>;
    static async getItemSource(
        packName: "pf2e.ancestries" | "pf2e.backgrounds" | "pf2e.classes" | "pf2e.feats-srd",
        name: string
    ): Promise<AncestrySource | BackgroundSource | ClassSource | FeatSource> {
        const slug = sluggify(name);
        const pack = game.packs.get<CompendiumCollection<ABCItemPF2e>>(packName, { strict: true });
        const docs = await pack.getDocuments({ "data.slug": { $in: [slug] } });
        if (docs.length === 1) {
            return docs[0].toObject();
        } else {
            throw ErrorPF2e(`Cannot find '${name}' in pack '${packName}'`);
        }
    }

    protected static async getClassFeaturesForLevel(
        item: ClassPF2e | ClassSource,
        minLevel: number,
        actorLevel: number
    ): Promise<FeatSource[]> {
        const classFeatsToAdd = item instanceof ClassPF2e ? item.data.data.items : item.data.items;
        const itemId = item instanceof ClassPF2e ? item.id : item._id;

        if (minLevel >= actorLevel) {
            // no need to do anything, since we've seen it all
            return [];
        }

        const featuresToAdd = Object.values(classFeatsToAdd).filter(
            (entryData) => actorLevel >= entryData.level && entryData.level > minLevel
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
                            throw ErrorPF2e("Invalid item type referenced in ABCFeatureEntryData");
                        }
                    })
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
                        throw ErrorPF2e("Invalid item type referenced in ABCFeatureEntryData");
                    }
                })
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
                    .getDocuments({ _id: { $in: entryIds } }))
            );
        }
        return feats;
    }

    protected static async addFeatures(
        itemSource: AncestrySource | BackgroundSource,
        actor: CharacterPF2e,
        createSource = false,
        options?: ABCManagerOptions
    ): Promise<ItemPF2e[]> {
        const itemsToCreate: ItemSourcePF2e[] = [];
        if (createSource) {
            itemSource._id = randomID(16);
            itemsToCreate.push(itemSource);
        }
        const entriesData = Object.values(itemSource.data.items);
        itemsToCreate.push(...(await this.getFeatures(entriesData, itemSource._id)));

        if (options?.assurance) {
            for (const skill of options.assurance) {
                const index = itemsToCreate.findIndex((item) => item.data.slug === "assurance");
                if (index > -1) {
                    const location = (itemsToCreate[index] as FeatSource).data.location;
                    itemsToCreate[index] = await this.getItemSource("pf2e.feats-srd", `Assurance (${skill})`);
                    itemsToCreate[index]._id = randomID(16);
                    (itemsToCreate[index] as FeatSource).data.location = location;
                }
            }
        }
        return actor.createEmbeddedDocuments("Item", itemsToCreate, { keepId: true });
    }
}
