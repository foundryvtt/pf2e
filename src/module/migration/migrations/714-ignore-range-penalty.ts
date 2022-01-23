import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { MigrationBase } from "../base";

/** Add new rule elements to feats that allow one to ignore or mitigate range penalties */
export class Migration714IgnoreRangePenalty extends MigrationBase {
    static override version = 0.714;

    private farThrow = {
        key: "AdjustModifier",
        mode: "add",
        predicate: {
            all: ["weapon:trait:thrown"],
        },
        selectors: ["ranged-attack-roll"],
        slug: "range-penalty",
        value: 1,
    };

    private huntPrey = {
        key: "RollOption",
        domain: "ranged-attack-roll",
        option: "ignore-range-penalty:2",
        predicate: {
            all: ["hunted-prey"],
        },
    };

    private triangulate = [
        {
            default: true,
            key: "ToggleProperty",
            label: "PF2E.SpecificRule.ToggleProperty.Triangulate",
            property: "flags.pf2e.rollOptions.all.triangulate",
        },
        {
            domain: "ranged-attack-roll",
            key: "RollOption",
            option: "ignore-range-penalty:2",
            predicate: {
                all: ["triangulate"],
            },
        },
        {
            key: "AdjustModifier",
            mode: "add",
            predicate: {
                all: ["triangulate"],
            },
            selectors: ["ranged-attack-roll"],
            slug: "range-penalty",
            value: 1,
        },
    ];

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const { rules } = source.data;
        if (source.type === "feat") {
            switch (source.data.slug) {
                case "far-throw": {
                    source.data.rules = [this.farThrow];
                    return;
                }
                case "hunt-prey": {
                    const needsRE = !rules.some(
                        (r: MaybeRollOptionRE) => r.key === "RollOption" && r.option === this.huntPrey.option
                    );
                    if (needsRE) rules.push(this.huntPrey);
                    return;
                }
                case "triangulate": {
                    source.data.rules = this.triangulate;
                    return;
                }
            }
        }
    }
}

interface MaybeRollOptionRE extends RuleElementSource {
    option?: string;
}
