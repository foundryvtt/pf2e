import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { MigrationBase } from "../base.ts";

/** Migrate disrupting/greaterDisrupting property rune slugs to vitalizing/greaterVitalizing. */
export class Migration956VitalizingRuneSlugs extends MigrationBase {
    static override version = 0.956;

    #RUNE_RENAMES: Record<string, string> = {
        disrupting: "vitalizing",
        greaterDisrupting: "greaterVitalizing",
    };

    #migrateRunes(runes: string[]): void {
        for (let i = 0; i < runes.length; i++) {
            runes[i] = this.#RUNE_RENAMES[runes[i]] ?? runes[i];
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "weapon")) return;

        if (Array.isArray(source.system.runes?.property)) {
            this.#migrateRunes(source.system.runes.property);
        }
        if (Array.isArray(source.system.specific?.runes?.property)) {
            this.#migrateRunes(source.system.specific.runes.property);
        }
    }
}
