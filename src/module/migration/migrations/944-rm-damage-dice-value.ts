import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove the `value` field of DamageDice REs. Bracketed values are handled in migration 945. */
export class Migration944RmDamageDiceValue extends MigrationBase {
    static override version = 0.944;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rules: Record<string, unknown>[] = source.system.rules;
        for (const rule of rules) {
            if (rule.key !== "DamageDice") continue;
            if ("brackets" in rule) {
                rule.value ??= rule.brackets;
                delete rule.brackets;
            }
            if (typeof rule.value === "string") {
                rule.diceNumber = rule.value;
                delete rule.value;
            }
        }
    }
}
