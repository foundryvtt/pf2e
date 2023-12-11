import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";

/** Add roll options to abilities allowing one to ignore the flat-footed condition from being flanked */
export class Migration719ShrugFlanking extends MigrationBase {
    static override version = 0.908;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const slug = source.system.slug ?? "";
        if (slug === "gang-up" && source.type === "feat") {
            source.system.rules = [this.gangUp];
        }
    }

    /** Instead of merely shrugging the flat--footed condition, this will suppress all benefits of flanking */

    private get gangUp(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "add",
            path: "system.attributes.flanking.canGangUp",
            value: 1,
        };
    }

}
