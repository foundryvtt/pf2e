import { ItemSourcePF2e } from "@item/data";
import { OneToTen } from "@module/data";
import { MigrationBase } from "../base";

/** Ensure spells have a minimum level of one */
export class Migration688ClampSpellLevel extends MigrationBase {
    static override version = 0.688;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "spell") {
            itemSource.system.level.value = Math.min(Math.max(itemSource.system.level.value, 1), 10) as OneToTen;
        }
    }
}
