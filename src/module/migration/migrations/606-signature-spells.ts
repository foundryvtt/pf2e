import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

export class Migration606SignatureSpells extends MigrationBase {
    static override version = 0.606;

    override async updateItem(item: ItemSourcePF2e) {
        if (item.type === "spellcastingEntry" && !item.data.signatureSpells) {
            item.data.signatureSpells = {
                value: [],
            };
        }
    }
}
