import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Change `usage` of religious symbols to "held-in-one-hand" */
export class Migration773ReligiousSymbolUsage extends MigrationBase {
    static override version = 0.773;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "equipment" && source.system.slug?.startsWith("religious-symbol")) {
            source.system.usage.value = "held-in-one-hand";
        }
    }
}
