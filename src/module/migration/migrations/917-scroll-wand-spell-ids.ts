import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Populate `_id` field of spells embedded in old scrolls and wands. */
export class Migration917ScrollWandSpellIds extends MigrationBase {
    static override version = 0.917;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "consumable" || ["scroll", "wand"].includes(source.system.slug ?? "")) {
            return;
        }

        const sourceId = source.system.spell?.flags?.core?.sourceId ?? source.system.spell?._stats?.compendiumSource;
        if (!source.system.spell || !sourceId) {
            source.system.spell = null;
        } else {
            source.system.spell._id ??= fu.randomID();
        }
    }
}
