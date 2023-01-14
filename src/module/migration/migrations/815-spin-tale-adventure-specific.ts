import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Replace links to adventure-specific Spin Tale */
export class Migration815SpinTaleAdventureSpecific extends MigrationBase {
    static override version = 0.815;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat") {
            const oldSpinTale = "Compendium.pf2e.adventure-specific-actions.Spin Tale";
            const newSpinTale = "Compendium.pf2e.actionspf2e.Spin Tale";

            if (source.system.description.value) {
                source.system.description.value = source.system.description.value.replace(oldSpinTale, newSpinTale);
            }

            for (const rule of source.system.rules) {
                if (rule.key === "GrantItem" && "uuid" in rule && typeof rule.uuid === "string") {
                    rule.uuid = rule.uuid.replace(oldSpinTale, newSpinTale);
                }
            }
        }
    }
}
