import { FeatPF2e, ClassPF2e, ItemPF2e, ABCItemPF2e } from "@item/index";
import { AncestrySource, BackgroundSource, ClassSource, ItemSourcePF2e } from "@item/data";
import { ABCFeatureEntryData } from "@item/abc/data";
import { CharacterPF2e } from "@actor/index";
import type { FeatSource } from "@item/feat/data";
import { ErrorPF2e, sluggify } from "@util";
import { fromUUIDs } from "@util/from-uuids";
import { MigrationList, MigrationRunner } from "@module/migration";

export interface ABCManagerOptions {
    assurance?: string[];
}

export class AncestryBackgroundClassManager {
    static async addABCItem(
        source: AncestrySource | BackgroundSource | ClassSource,
        actor: CharacterPF2e,
        options?: ABCManagerOptions
    ): Promise<ItemPF2e[]> {
        const tempItem = new CONFIG.PF2E.Item.documentClasses[source.type](source);
        await MigrationRunner.ensureSchemaVersion(tempItem, MigrationList.constructFromVersion(tempItem.schemaVersion));
        source = tempItem.toObject();

        switch (source.type) {
            case "ancestry": {
                await actor.ancestry?.delete({ render: false });
                return this.addFeatures(source, actor, true, options);
            }
            case "background": {
                await actor.background?.delete({ render: false });
                return this.addFeatures(source, actor, true, options);
            }
            case "class": {
                await actor.class?.delete({ render: false });

                /** Add class self roll option in case it is needed by any features' rule elements */
                const slug = source.system.slug ?? sluggify(source.name);
                actor.rollOptions.all[`class:${slug}`] = true;

                source._id = randomID(16);
                source.flags.pf2e ??= {};
                source.flags.pf2e.insertedClassFeaturesLevel = actor.level;

                const itemsToCreate = await this.getClassFeaturesForLevel(source, 0, actor.level);
                this.sortClassFeaturesByLevelAndChoiceSet(itemsToCreate);
                return actor.createEmbeddedDocuments("Item", [...itemsToCreate, source], { keepId: true });
            }
            default:
                throw ErrorPF2e("Invalid item type for ABC creation!");
        }
    }

    /** Add or remove class features as appropriate to the PC's level */
    static async ensureClassFeaturesForLevel(actor: CharacterPF2e, newLevel: number): Promise<void> {
        const actorClass = actor.class;
        if (!actorClass) return;

        const current = actor.itemTypes.feat.filter((feat) => feat.featType === "classfeature");
        if (newLevel > actor.level) {
            const classFeaturesToCreate = (
                await this.getClassFeaturesForLevel(actorClass, actor.level, newLevel)
            ).filter(
                (feature) => !current.some((currentFeature) => currentFeature.sourceId === feature.flags.core?.sourceId)
            );
            this.sortClassFeaturesByLevelAndChoiceSet(classFeaturesToCreate);
            await actor.createEmbeddedDocuments("Item", classFeaturesToCreate, { keepId: true, render: false });
        } else if (newLevel < actor.level) {
            const classFeaturestoDelete = current.filter((feat) => feat.level > newLevel).map((feat) => feat.id);
            await actor.deleteEmbeddedDocuments("Item", classFeaturestoDelete, { render: false });
        }
    }

    static sortClassFeaturesByLevelAndChoiceSet(features: FeatSource[]) {
        const hasChoiceSet = (f: FeatSource) => f.system.rules.some((re) => re.key === "ChoiceSet");
        return features.sort((a, b) => {
            const [aLevel, bLevel] = [a.system.level.value, b.system.level.value];
            if (aLevel !== bLevel) return aLevel - bLevel;
            const [aHasSet, bHasSet] = [hasChoiceSet(a), hasChoiceSet(b)];
            if (aHasSet !== bHasSet) return aHasSet ? -1 : 1;
            return a.name.localeCompare(b.name, game.i18n.lang);
        });
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
        const docs = await pack.getDocuments({ "system.slug": { $in: [slug] } });
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
        if (minLevel >= actorLevel) {
            // no need to do anything, since we've seen it all
            return [];
        }

        const classSource = item instanceof ClassPF2e ? item.toObject() : item;
        const itemId = classSource._id;
        const featureEntries = classSource.system.items;
        const featuresToAdd = Object.values(featureEntries).filter(
            (entryData) => actorLevel >= entryData.level && entryData.level > minLevel
        );

        return this.getFeatures(featuresToAdd, itemId);
    }

    protected static async getFeatures(entries: ABCFeatureEntryData[], locationId: string): Promise<FeatSource[]> {
        const feats: FeatSource[] = [];
        if (entries.length > 0) {
            // Get feats from a compendium pack
            const packEntries = entries.filter((entry) => !!entry.uuid);
            if (packEntries.length > 0) {
                const compendiumFeats = await this.getFromCompendium(packEntries);
                feats.push(
                    ...compendiumFeats.map((feat) => {
                        const featSource = feat.toObject();
                        featSource._id = randomID(16);
                        featSource.system.location = locationId;
                        return featSource;
                    })
                );
            }
            // Get feats from the game.items collection
            const worldEntries = entries.filter((e) => e.uuid.startsWith("Item."));
            feats.push(
                ...worldEntries.map((entry) => {
                    const item = fromUuidSync(entry.uuid);
                    if (item instanceof FeatPF2e) {
                        const source = item.toObject();
                        source._id = randomID(16);
                        return source;
                    } else {
                        throw ErrorPF2e("Invalid item type referenced in ABCFeatureEntryData");
                    }
                })
            );
        }
        return feats;
    }

    protected static async getFromCompendium(entries: ABCFeatureEntryData[]): Promise<FeatPF2e[]> {
        const items = (await fromUUIDs(entries.map((e) => e.uuid))).map((i) => i.clone());
        for (const item of items) {
            if (item instanceof ItemPF2e) {
                await MigrationRunner.ensureSchemaVersion(item, MigrationList.constructFromVersion(item.schemaVersion));
            }
        }

        return items.flatMap((item): FeatPF2e | never[] => {
            if (item instanceof FeatPF2e) {
                if (item.featType === "classfeature") {
                    const level = entries.find((e) => item.sourceId === e.uuid)?.level ?? item.level;
                    item.updateSource({ "system.level.value": level });
                }
                return item;
            } else {
                console.error("PF2e System | Missing or invalid ABC item");
                return [];
            }
        });
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
        const entriesData = Object.values(itemSource.system.items);
        itemsToCreate.push(...(await this.getFeatures(entriesData, itemSource._id)));

        if (options?.assurance) {
            for (const skill of options.assurance) {
                const index = itemsToCreate.findIndex((item) => item.system.slug === "assurance");
                if (index > -1) {
                    const location = (itemsToCreate[index] as FeatSource).system.location;
                    itemsToCreate[index] = await this.getItemSource("pf2e.feats-srd", `Assurance (${skill})`);
                    itemsToCreate[index]._id = randomID(16);
                    (itemsToCreate[index] as FeatSource).system.location = location;
                }
            }
        }
        return actor.createEmbeddedDocuments("Item", itemsToCreate, { keepId: true });
    }
}
