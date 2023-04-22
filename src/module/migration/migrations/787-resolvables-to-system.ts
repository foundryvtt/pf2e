import { ItemSourcePF2e } from "@item/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Convert object paths of weapon and spell resolvables with <V10 `data` properties to use `system` */
export class Migration787ResolvablesToSystem extends MigrationBase {
    static override version = 0.787;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (value: string) =>
            value.replace(/@(weapon|spell)\.data\.data./g, "@$1.system.").replace(/@(weapon|spell)\.data./g, "@$1.")
        );
    }
}
