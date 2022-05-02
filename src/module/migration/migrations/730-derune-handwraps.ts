import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Remove Potency and Striking rule elements from handwraps of mighty blows */
export class Migration730DeruneHandwraps extends MigrationBase {
    static override version = 0.73;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "weapon" && source.data.slug === "handwraps-of-mighty-blows") {
            const { rules } = source.data;

            for (const rule of [...rules]) {
                if (["Striking", "WeaponPotency"].includes(rule.key)) {
                    source.data.rules.splice(rules.indexOf(rule), 1);
                }
            }
        }
    }
}
