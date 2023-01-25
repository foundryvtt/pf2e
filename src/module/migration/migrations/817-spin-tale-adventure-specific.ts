import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Replace links to adventure-specific Spin Tale */
export class Migration817SpinTaleAdventureSpecific extends MigrationBase {
    static override version = 0.817;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat") {
            const oldSpinTale = "Compendium.pf2e.adventure-specific-actions.Spin Tale";
            const newSpinTale = "Compendium.pf2e.actionspf2e.Spin Tale";

            const oldSpinTaleId = "Compendium.pf2e.adventure-specific-actions.5gahZQXf3UVwATSC";
            const newSpinTaleId = "Compendium.pf2e.actionspf2e.hPZQ5vA9QHEPtjFW";

            if (source.system.description.value) {
                source.system.description.value = source.system.description.value.replace(oldSpinTale, newSpinTale);
                source.system.description.value = source.system.description.value.replace(oldSpinTaleId, newSpinTaleId);
            }

            for (const rule of source.system.rules) {
                if (rule.key === "GrantItem" && "uuid" in rule && typeof rule.uuid === "string") {
                    rule.uuid = rule.uuid.replace(oldSpinTale, newSpinTale);

                    if (typeof rule.uuid === "string") {
                        rule.uuid = rule.uuid.replace(oldSpinTaleId, newSpinTaleId);
                    }
                }
            }
        }
    }
}
