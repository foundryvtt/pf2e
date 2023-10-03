import { FeatSource, ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add negative healing to basic undead benefits */
export class Migration818BasicUndeadNegativeHealing extends MigrationBase {
    static override version = 0.818;

    #needsRE(source: FeatSource): boolean {
        return (
            source.system.slug === "basic-undead-benefits" &&
            !source.system.rules.some(
                (r) => r.key === "ActiveEffectLike" && "path" in r && r.path === "system.attributes.hp.negativeHealing"
            )
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat" && this.#needsRE(source)) {
            const rule = {
                key: "ActiveEffectLike",
                mode: "override",
                path: "system.attributes.hp.negativeHealing",
                value: true,
            };
            source.system.rules.push(rule);
        }
    }
}
