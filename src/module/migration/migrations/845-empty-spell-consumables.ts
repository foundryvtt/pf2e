import { ItemSourcePF2e } from "@item/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/**  Ensure partial spell consumables (from missed prior migration) are nulled out */
export class Migration845EmptySpellConsumables extends MigrationBase {
    static override version = 0.845;

    override async preUpdateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "consumable") {
            const spell: unknown = source.system.spell;
            if (isObject(spell) && !["_id", "name", "type", "system"].every((p) => p in spell)) {
                source.system.spell = null;
            }
        }
    }
}
