import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { RuleElementSource } from "@module/rules/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Move RollOption RE suboption selections to top level of object. */
export class Migration920SuboptionSelection extends MigrationBase {
    static override version = 0.92;

    override async updateItem(source: ItemSourcePF2e, actorSource: ActorSourcePF2e): Promise<void> {
        const suboptionREs = source.system.rules.filter(
            (r): r is RollOptionSource =>
                "suboptions" in r &&
                Array.isArray(r.suboptions) &&
                r.suboptions.some((s) => R.isPlainObject(s) && typeof s.selected === "boolean"),
        );
        for (const rule of suboptionREs) {
            for (const suboption of rule.suboptions) {
                if (suboption.selected && actorSource) {
                    rule.selection = suboption.value;
                }
                delete suboption.selected;
            }
        }
    }
}

interface RollOptionSource extends RuleElementSource {
    selection?: string;
    suboptions: { value: string; selected?: boolean }[];
}
