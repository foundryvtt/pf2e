import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Restore prepared spells slots to their initial array state. */
export class Migration921SpellSlotArrays extends MigrationBase {
    static override version = 0.921;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "spellcastingEntry") {
            for (const slotGroup of Object.values(source.system.slots)) {
                slotGroup.prepared &&= R.compact(Object.values(slotGroup.prepared));
            }
        }
    }
}
