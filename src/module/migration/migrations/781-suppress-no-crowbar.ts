import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Suppress the "no-crowbar" penalty applied to the Force Open action */
export class Migration781SuppressNoCrowbar extends MigrationBase {
    static override version = 0.781;

    get #suppressNoCrowbar() {
        return {
            key: "AdjustModifier",
            selector: "athletics",
            slug: "no-crowbar",
            suppress: true,
        };
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!source.system.slug) return;
        const isCrowbar = source.type === "equipment" && /^crowbar(?:-levered)?$/.test(source.system.slug);
        const isForcedEntry = source.type === "feat" && source.system.slug === "forced-entry";
        const suppressesNoCrowbar = isCrowbar || isForcedEntry;
        if (suppressesNoCrowbar && !source.system.rules.some((r) => r.key === "AdjustModifier")) {
            source.system.rules.push(this.#suppressNoCrowbar);
        }
    }
}
