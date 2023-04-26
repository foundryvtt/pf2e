import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Replace links to adventure-specific Spin Tale */
export class Migration819SpinTaleAdventureSpecific extends MigrationBase {
    static override version = 0.819;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat") {
            const oldSpinTale = "Compendium.pf2e.adventure-specific-actions.Spin Tale";
            const newSpinTale = "Compendium.pf2e.actionspf2e.Spin Tale";

            const oldSpinTaleId = "Compendium.pf2e.adventure-specific-actions.5gahZQXf3UVwATSC";
            const newSpinTaleId = "Compendium.pf2e.actionspf2e.hPZQ5vA9QHEPtjFW";

            source.system.description.value = source.system.description.value.replace(oldSpinTale, newSpinTale);
            source.system.description.value = source.system.description.value.replace(oldSpinTaleId, newSpinTaleId);
        }
    }
}
