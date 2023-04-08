import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Move torch improvised from traits to otherTags */
export class Migration806TorchImprovisedOtherTags extends MigrationBase {
    static override version = 0.806;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "equipment" && source.system.slug === "torch") {
            const torchStrikeRE = source.system.rules.find(
                (r: MaybeStrikeSource): r is MaybeStrikeSource => r.key === "Strike" && r.otherTags === undefined
            );
            if (torchStrikeRE) {
                delete torchStrikeRE.traits;
                torchStrikeRE.otherTags = ["improvised"];
            }
        }
    }
}

interface MaybeStrikeSource extends RuleElementSource {
    traits?: unknown;
    otherTags?: unknown;
}
