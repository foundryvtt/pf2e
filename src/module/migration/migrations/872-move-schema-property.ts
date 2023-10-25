import { ActorSystemSource } from "@actor/data/base.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSystemSource } from "@item/base/data/system.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/**  Remove the `schema` property and create a new `_migration` one */
export class Migration872MoveSchemaProperty extends MigrationBase {
    static override version = 0.872;

    #mvSchema(systemData: (ItemSystemSource | ActorSystemSource) & { "-=schema"?: null }): void {
        const migrations = (systemData._migration ??= { version: null, previous: null });
        if ("schema" in systemData) {
            systemData["-=schema"] = null;
            if (isObject<{ version: unknown }>(systemData.schema) && typeof systemData.schema.version === "number") {
                migrations.version = systemData.schema.version;
            }
        }
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        this.#mvSchema(source.system);
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        this.#mvSchema(source.system);
    }
}
