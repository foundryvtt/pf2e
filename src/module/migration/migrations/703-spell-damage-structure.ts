import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Correct the structure of spell damage in case it slipped past a previous migration */
export class Migration703SpellDamageStructure extends MigrationBase {
    static override version = 0.703;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "spell") {
            if (!(itemSource.data.damage instanceof Object)) {
                itemSource.data.damage = { value: {} };
            } else if (!(itemSource.data.damage.value instanceof Object)) {
                itemSource.data.damage.value = {};
            }
        }
    }
}
