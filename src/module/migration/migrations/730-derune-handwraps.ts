import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove Potency and Striking rule elements from handwraps of mighty blows */
export class Migration730DeruneHandwraps extends MigrationBase {
    static override version = 0.73;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "weapon" && source.system.slug === "handwraps-of-mighty-blows") {
            const { rules } = source.system;

            for (const rule of [...rules]) {
                if (["Striking", "WeaponPotency"].includes(String(rule.key))) {
                    source.system.rules.splice(rules.indexOf(rule), 1);
                }
            }
        }
    }
}
