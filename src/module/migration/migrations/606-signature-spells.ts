import { ItemSourcePF2e } from "@item/data/index.ts";
import { SpellcastingEntrySystemSource } from "@item/spellcasting-entry/data.ts";
import { MigrationBase } from "../base.ts";

export class Migration606SignatureSpells extends MigrationBase {
    static override version = 0.606;

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
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

interface SpellcastingEntrySystemDataOld extends SpellcastingEntrySystemSource {
    signatureSpells?: {
        value: string[];
    };
}
