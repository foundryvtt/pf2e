import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Convert `range` and `maxRange` properties of Strike rule elements to single `RangeData` object */
export class Migration868StrikeRERange extends MigrationBase {
    static override version = 0.868;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const strikeREs = source.system.rules.filter((r): r is OldStrikeSource => r.key === "Strike");
        for (const rule of strikeREs) {
            if (typeof rule.maxRange === "number" && rule.range !== rule.maxRange / 6) {
                rule.range = { max: rule.maxRange };
            } else if (typeof rule.range === "number") {
                rule.range = { increment: rule.range };
            }
            delete rule.maxRange;
        }
    }
}

interface OldStrikeSource extends RuleElementSource {
    range?: unknown;
    maxRange?: unknown;
}
