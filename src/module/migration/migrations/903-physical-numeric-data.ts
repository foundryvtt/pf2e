import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Ensure some physical numeric data is non-null. */
export class Migration903PhysicalNumericData extends MigrationBase {
    static override version = 0.903;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "armor") {
            source.system.dexCap ||= 0;
            source.system.strength ||= source.system.category === "unarmored" ? null : 0;
        } else if (source.type === "backpack") {
            const slug = source.system.slug ?? "";
            if (/bag-of-(?:devouring|holding|weasels)|spacious-pouch/.test(slug)) {
                source.system.bulk.value ||= 1;
            }
        }
    }
}
