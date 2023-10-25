import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Refresh rule elements on mighty bulwark feat. */
export class Migration869RefreshMightyBulwark extends MigrationBase {
    static override version = 0.869;

    get #mightyBulwarkRules() {
        return [
            {
                key: "FlatModifier",
                predicate: ["armor:trait:bulwark"],
                selector: "reflex",
                value: 4,
            },
            {
                key: "AdjustModifier",
                predicate: ["armor:trait:bulwark"],
                selector: "reflex",
                slug: "dex",
                suppress: true,
            },
            {
                key: "AdjustModifier",
                selector: "reflex",
                slug: "bulwark",
                suppress: true,
            },
        ];
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat" && source.system.slug === "mighty-bulwark") {
            source.system.rules = this.#mightyBulwarkRules;
        } else {
            for (const rule of source.system.rules) {
                if ("option" in rule && rule.option === "self:armor:strength-requirement-met") {
                    rule.option = "armor:strength-requirement-met";
                }
            }
        }
    }
}
