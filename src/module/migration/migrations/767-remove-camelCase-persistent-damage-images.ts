import { ItemSourcePF2e } from "@item/data";
import { isObject } from "@util";
import { MigrationBase } from "../base";

export class Migration767RemoveCamelCasePersistentDamageImages extends MigrationBase{
    static override version = 0.767;
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (
            (!("game" in globalThis) || source.flags.core?.sourceId.startsWith("Compendium.pf2e.")) &&
            isObject<{ value: unknown }>(source.data.source) &&
            typeof source.data.source.value === "string" &&
            source.data.source.value.startsWith("persistentDamage.webp")
        ) {
            source.data.source.value = "persistent-damage.webp";
        }
    }
}
