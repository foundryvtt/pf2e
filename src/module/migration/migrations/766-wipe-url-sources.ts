import { ItemSourcePF2e } from "@item/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Wipe URL sources (typically Archives of Nethys) */
export class Migration766WipeURLSources extends MigrationBase {
    static override version = 0.766;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (
            (!("game" in globalThis) || source.flags.core?.sourceId?.startsWith("Compendium.pf2e.")) &&
            isObject<{ value: unknown }>(source.system.source) &&
            typeof source.system.source.value === "string" &&
            source.system.source.value.startsWith("http")
        ) {
            source.system.source.value = "";
        }
    }
}
