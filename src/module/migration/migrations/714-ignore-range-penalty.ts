import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { MigrationBase } from "../base";

/** Grant an extra fist attack from the "Powerful Fist" and "Martial Artist Dedication" items */
export class Migration714IgnoreRangePenalty extends MigrationBase {
    static override version = 0.714;

    private huntPrey = {
        key: "RollOption",
        domain: "ranged-attack-roll",
        option: "ignore-range-penalty:2",
        predicate: {
            all: ["hunted-prey"],
        },
    };

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const { rules } = source.data;
        if (source.type === "feat" && source.data.slug === "hunt-prey") {
            const needsRE = !rules.some(
                (r: MaybeRollOptionRE) => r.key === "RollOption" && r.option === this.huntPrey.option
            );
            if (needsRE) rules.push(this.huntPrey);
        }
    }
}

interface MaybeRollOptionRE extends RuleElementSource {
    option?: string;
}
