import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Start recording the schema version and other details of a migration */
export class Migration642TrackSchemaVersion extends MigrationBase {
    static override version = 0.642;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        actorSource.data.schema ??= {
            version: null,
            lastMigration: null,
        };
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        itemSource.data.schema ??= {
            version: null,
            lastMigration: null,
        };
    }
}
