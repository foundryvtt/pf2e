import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration867DamageRollDomainFix extends MigrationBase {
    static override version = 0.867;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules ?? []) {
            if ("domain" in rule && rule.domain === "damage-roll") {
                rule.domain = "damage";
            }
        }
    }
}
