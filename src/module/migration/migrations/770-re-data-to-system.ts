import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Convert object paths with <V10 `data` properties to use `system` */
export class Migration770REDataToSystem extends MigrationBase {
    static override version = 0.77;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (value: string) =>
            value.replace(/@(actor|item)\.data\.data./g, "@$1.system.").replace(/@(actor|item)\.data./g, "@$1.")
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (value: string) =>
            value
                .replace(/^data\.data\./, "system.")
                .replace(/^data\./, "system.")
                .replace(/"data\.data\./g, '"system.')
                .replace(/"data\./g, '"system.')
                .replace(/@(actor|item)\.data\.data./g, "@$1.system.")
                .replace(/@(actor|item)\.data./g, "@$1.")
                .replace(/\b(actor|item|rule)\|data\.data\./g, "$1|system.")
                .replace(/\b(actor|item|rule)\|data\./g, "$1|system.")
        );
    }
}
