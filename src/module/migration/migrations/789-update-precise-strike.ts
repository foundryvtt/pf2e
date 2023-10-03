import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Fix the predicate on the Precise Strike's DamageDice rule element  */
export class Migration789UpdatePreciseStrike extends MigrationBase {
    static override version = 0.789;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        if (source.system.slug === "precise-strike") {
            source.system.rules = this.#preciseStrikeRules;
        } else if (source.system.slug === "finishing-precision") {
            const rules = source.system.rules.filter((r) => r.key === "GrantItem");
            source.system.rules = [...rules, ...this.#finishingPrecisionRules];
        }
    }

    get #preciseStrikeRules(): RESourceWithOtherStuff[] {
        return [
            {
                domain: "damage-roll",
                key: "RollOption",
                label: "PF2E.SpecificRule.PreciseStrike.Finisher",
                option: "finisher",
                toggleable: true,
            },
            {
                damageCategory: "precision",
                key: "FlatModifier",
                predicate: {
                    all: [
                        "class:swashbuckler",
                        "self:effect:panache",
                        {
                            or: [
                                "weapon:melee",
                                { and: ["feat:flying-blade", "weapon:thrown", "target:range-increment:1"] },
                            ],
                        },
                    ],
                    any: ["weapon:trait:agile", "weapon:trait:finesse"],
                    not: ["finisher"],
                },
                selector: "strike-damage",
                slug: "precise-strike",
                value: {
                    brackets: [
                        { end: 4, value: 2 },
                        { end: 8, start: 5, value: 3 },
                        { end: 12, start: 9, value: 4 },
                        { end: 16, start: 13, value: 5 },
                        { start: 17, value: 6 },
                    ],
                },
            },
            {
                category: "precision",
                dieSize: "d6",
                key: "DamageDice",
                predicate: {
                    all: [
                        "class:swashbuckler",
                        "self:effect:panache",
                        "finisher",
                        {
                            or: [
                                "weapon:melee",
                                { and: ["feat:flying-blade", "weapon:thrown", "target:range-increment:1"] },
                            ],
                        },
                    ],
                    any: ["weapon:trait:agile", "weapon:trait:finesse"],
                },
                selector: "strike-damage",
                slug: "finisher",
                value: {
                    brackets: [
                        { end: 4, value: { diceNumber: 2 } },
                        { end: 8, start: 5, value: { diceNumber: 3 } },
                        { end: 12, start: 9, value: { diceNumber: 4 } },
                        { end: 16, start: 13, value: { diceNumber: 5 } },
                        { start: 17, value: { diceNumber: 6 } },
                    ],
                },
            },
        ];
    }

    get #finishingPrecisionRules(): RESourceWithOtherStuff[] {
        return [
            {
                damageCategory: "precision",
                key: "FlatModifier",
                predicate: {
                    all: [
                        "self:effect:panache",
                        {
                            or: [
                                "weapon:melee",
                                { and: ["feat:flying-blade", "weapon:thrown", "target:range-increment:1"] },
                            ],
                        },
                    ],
                    any: ["weapon:trait:agile", "weapon:trait:finesse"],
                    not: ["finisher"],
                },
                selector: "strike-damage",
                slug: "finishing-precision",
                value: 1,
            },
            {
                category: "precision",
                diceNumber: 1,
                dieSize: "d6",
                key: "DamageDice",
                predicate: {
                    all: [
                        "self:effect:panache",
                        "finisher",
                        {
                            or: [
                                "weapon:melee",
                                { and: ["feat:flying-blade", "weapon:thrown", "target:range-increment:1"] },
                            ],
                        },
                    ],
                    any: ["weapon:trait:agile", "weapon:trait:finesse"],
                },
                selector: "strike-damage",
                slug: "finishing-precision",
            },
        ];
    }
}

type RESourceWithOtherStuff = RuleElementSource & Record<string, unknown>;
