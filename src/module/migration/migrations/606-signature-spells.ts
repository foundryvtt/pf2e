import { ItemSourcePF2e } from "@item/data";
import { SpellcastingEntrySystemData } from "@item/spellcasting-entry/data";
import { MigrationBase } from "../base";

export class Migration606SignatureSpells extends MigrationBase {
    static override version = 0.606;

    override async updateItem(item: ItemSourcePF2e) {
        if (item.type === "spellcastingEntry") {
            const data: SpellcastingEntrySystemDataOld = item.system;
            if (!data.signatureSpells) {
                data.signatureSpells = {
                    value: [],
                };
            }
        }
    }
}

interface SpellcastingEntrySystemDataOld extends SpellcastingEntrySystemData {
    signatureSpells?: {
        value: string[];
    };
}
