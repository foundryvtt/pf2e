import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Correct the structure of spell damage in case it slipped past a previous migration */
export class Migration703SpellDamageStructure extends MigrationBase {
    static override version = 0.703;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "spell") {
            if (!(itemSource.system.damage instanceof Object)) {
                itemSource.system.damage = { value: {} };
            } else if (!(itemSource.system.damage.value instanceof Object)) {
                itemSource.system.damage.value = {};
            }
        }
    }
}
