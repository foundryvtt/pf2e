import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/**  Ensure partial spell consumables (from missed prior migration) are nulled out */
export class Migration845EmptySpellConsumables extends MigrationBase {
    static override version = 0.845;

    override async preUpdateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "consumable") {
            const spell: unknown = source.system.spell;
            if (R.isObject(spell) && !["_id", "name", "type", "system"].every((p) => p in spell)) {
                source.system.spell = null;
            }
        }
    }
}
