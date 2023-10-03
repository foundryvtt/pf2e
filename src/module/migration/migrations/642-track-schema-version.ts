import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Start recording the schema version and other details of a migration */
export class Migration642TrackSchemaVersion extends MigrationBase {
    static override version = 0.642;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        actorSource.system.schema ??= {
            version: null,
            lastMigration: null,
        };
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        itemSource.system.schema ??= {
            version: null,
            lastMigration: null,
        };
    }
}
