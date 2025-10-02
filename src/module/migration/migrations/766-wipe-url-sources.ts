import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Wipe URL sources (typically Archives of Nethys) */
export class Migration766WipeURLSources extends MigrationBase {
    static override version = 0.766;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (
            (!("game" in globalThis) || source._stats.compendiumSource?.startsWith("Compendium.pf2e.")) &&
            "source" in source.system &&
            R.isPlainObject(source.system.source) &&
            typeof source.system.source.value === "string" &&
            source.system.source.value.startsWith("http")
        ) {
            source.system.source.value = "";
        }
    }
}
