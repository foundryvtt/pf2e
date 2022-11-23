import { ClassPF2e, ItemPF2e, BackgroundPF2e, AncestryPF2e } from "@item/index";
import { CharacterPF2e } from "@actor/index";
import { sluggify } from "@util";
import { MigrationList, MigrationRunner } from "@module/migration";

class AncestryBackgroundClassManager {
    static async addABCItem(
        item: AncestryPF2e | BackgroundPF2e | ClassPF2e,
        actor: CharacterPF2e
    ): Promise<ItemPF2e[]> {
        await MigrationRunner.ensureSchemaVersion(item, MigrationList.constructFromVersion(item.schemaVersion));
        const source = item.toObject();

        switch (source.type) {
            case "ancestry": {
                await actor.ancestry?.delete({ render: false });
                break;
            }
            case "background": {
                await actor.background?.delete({ render: false });
                break;
            }
            case "class": {
                await actor.class?.delete({ render: false });

                /** Add class self roll option in case it is needed by any features' rule elements */
                const slug = source.system.slug ?? sluggify(source.name);
                actor.rollOptions.all[`class:${slug}`] = true;

                source.flags.pf2e ??= {};
                source.flags.pf2e.insertedClassFeaturesLevel = actor.level;
                break;
            }
        }

        source._id = randomID(16);
        const itemsToCreate = [source, ...(await item.getFeatures({ level: actor.level }))];
        return actor.createEmbeddedDocuments("Item", itemsToCreate, { keepId: true });
    }
}

export { AncestryBackgroundClassManager };
