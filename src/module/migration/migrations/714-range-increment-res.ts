import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { MigrationBase } from "../base";

/** Add rule elements to feats(ures) that increase range increments or allow one to ignore/mitigate range penalties */
export class Migration714RangeIncrementREs extends MigrationBase {
    static override version = 0.714;

    private farLobber = {
        definition: { all: ["weapon:base:alchemical-bomb"] },
        key: "AdjustStrike",
        mode: "upgrade",
        property: "range-increment",
        value: 30,
    };

    private farShot = {
        definition: { all: ["weapon:ranged"] },
        key: "AdjustStrike",
        mode: "multiply",
        property: "range-increment",
        value: 2,
    };

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

    private legendaryShot = {
        key: "RollOption",
        domain: "ranged-attack-roll",
        option: "ignore-range-penalty:5",
    };

    private masterfulHunter = (() => {
        const gte: [string, number] = ["weapon:proficiency:rank", 3];
        return {
            key: "RollOption",
            domain: "ranged-attack-roll",
            option: "ignore-range-penalty:3",
            predicate: {
                all: ["hunted-prey", { gte }],
            },
        };
    })();

    private shootistsEdge = (() => {
        const gte: [string, number] = ["weapon:proficiency:rank", 3];
        return [
            { key: "ActiveEffectLike", mode: "upgrade", path: "data.attributes.classDC.rank", value: 3 },
            {
                key: "RollOption",
                domain: "ranged-attack-roll",
                option: "ignore-range-penalty:3",
                phase: "beforeRoll",
                predicate: { all: [{ gte }] },
            },
        ];
    })();

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

    private uncannyBombs = {
        definition: { all: ["weapon:base:alchemical-bomb"] },
        key: "AdjustStrike",
        mode: "upgrade",
        property: "range-increment",
        value: 60,
    };

    private unerringShot = (() => {
        const gte: [string, number] = ["weapon:proficiency:rank", 3];
        return {
            key: "RollOption",
            option: "ignore-range-penalty",
            phase: "beforeRoll",
            predicate: { all: [{ gte }] },
        };
    })();

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const { rules } = source.data;
        if (source.type === "feat") {
            switch (source.data.slug) {
                case "far-lobber": {
                    source.data.rules = [this.farLobber];
                    return;
                }
                case "far-shot": {
                    source.data.rules = [this.farShot];
                    return;
                }
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
                case "legendary-shot": {
                    source.data.rules = [this.legendaryShot];
                    return;
                }
                case "masterful-hunter": {
                    const needsRE = !rules.some(
                        (r: MaybeRollOptionRE) => r.key === "RollOption" && r.option === this.masterfulHunter.option
                    );
                    if (needsRE) rules.push(this.masterfulHunter);

                    return;
                }
                case "shootists-edge": {
                    source.data.rules = this.shootistsEdge;
                    return;
                }
                case "triangulate": {
                    source.data.rules = this.triangulate;
                    return;
                }
                case "uncanny-bombs": {
                    source.data.rules = [this.uncannyBombs];
                    return;
                }
                case "unerring-shot": {
                    source.data.rules = [this.unerringShot];
                    return;
                }
            }
        }
    }
}

interface MaybeRollOptionRE extends RuleElementSource {
    option?: string;
}
