import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add roll options to abilities allowing one to ignore the flat-footed condition from being flanked */
export class Migration908TrueGangUp extends MigrationBase {
    static override version = 0.908;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const slug = source.system.slug ?? "";
        if (slug === "gang-up" && source.type === "feat") {
            const rule = {
                key: "ActiveEffectLike",
                mode: "add",
                path: "system.attributes.flanking.canGangUp",
                value: true,
            };
            source.system.rules = [rule];
        }
    }
}
