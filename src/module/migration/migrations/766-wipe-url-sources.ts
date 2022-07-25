import { ItemSourcePF2e } from "@item/data";
import { isObject } from "@util";
import { MigrationBase } from "../base";

/** Wipe URL sources (typically Archives of Nethys) */
export class Migration766WipeURLSources extends MigrationBase {
    static override version = 0.766;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (
            (!("game" in globalThis) || source.flags.core?.sourceId?.startsWith("Compendium.pf2e.")) &&
            isObject<{ value: unknown }>(source.data.source) &&
            typeof source.data.source.value === "string" &&
            source.data.source.value.startsWith("http")
        ) {
            source.data.source.value = "";
        }
    }
}
