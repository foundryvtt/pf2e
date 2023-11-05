import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.js";

/** Update rule element on Devise a Stratagem action and related feats. */
export class Migration879DeviseAStratagemAndFriends extends MigrationBase {
    static override version = 0.879;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "action" && source.system.slug === "devise-a-stratagem") {
            const rules = [
                {
                    domain: "all",
                    key: "RollOption",
                    option: "target:mark:devise-a-stratagem",
                    toggleable: "totm",
                },
                {
                    ability: "int",
                    key: "FlatModifier",
                    predicate: [
                        "class:investigator",
                        "target:mark:devise-a-stratagem",
                        {
                            or: [
                                "item:trait:agile",
                                "item:trait:finesse",
                                { and: ["item:ranged", { not: "item:thrown-melee" }] },
                                "item:base:sap",
                            ],
                        },
                    ],
                    selector: "strike-attack-roll",
                    type: "ability",
                },
            ];
            source.system.rules = rules;
        } else if (source.type === "feat" && source.system.slug === "athletic-strategist") {
            const rule = {
                ability: "int",
                key: "FlatModifier",
                predicate: [
                    "class:investigator",
                    "target:mark:devise-a-stratagem",
                    { or: ["action:disarm", "action:grapple", "action:shove", "action:trip"] },
                    {
                        or: [
                            "item:trait:agile",
                            "item:trait:finesse",
                            { and: ["item:ranged", { not: "item:thrown-melee" }] },
                            "item:base:sap",
                            { and: ["feat:takedown-expert", "item:group:club", "item:hands-held:1"] },
                        ],
                    },
                ],
                selector: "athletics",
                type: "ability",
            };
            source.system.rules = [rule];
        } else if (source.type === "feat" && source.system.slug === "ongoing-strategy") {
            const rule = {
                damageCategory: "precision",
                key: "FlatModifier",
                predicate: [
                    [
                        "class:investigator",
                        { not: "check:substitution:devise-a-stratagem" },
                        {
                            or: [
                                "item:trait:agile",
                                "item:trait:finesse",
                                {
                                    and: ["item:ranged", { not: "item:thrown-melee" }],
                                },
                                "item:base:sap",
                                { and: ["feat:takedown-expert", "item:group:club", "item:hands-held:1"] },
                            ],
                        },
                    ],
                ],
                selector: "strike-damage",
                value: {
                    brackets: [
                        { end: 4, value: 1 },
                        { end: 8, start: 5, value: 2 },
                        { end: 12, start: 9, value: 3 },
                        { end: 16, start: 13, value: 4 },
                        { start: 17, value: 5 },
                    ],
                },
            };
            source.system.rules = [rule];
        } else if (source.type === "feat" && source.system.slug === "shared-stratagem") {
            const rule = {
                key: "Note",
                predicate: ["target:mark:devise-a-stratagem"],
                selector: "strike-attack-roll",
                text: "PF2E.SpecificRule.Investigator.SharedStratagem.Note",
                title: "{item|name}",
                outcome: ["success", "criticalSuccess"],
            };
            source.system.rules = [rule];
        } else if (source.type === "feat" && source.system.slug === "takedown-expert") {
            const rule = {
                ability: "int",
                key: "FlatModifier",
                predicate: ["class:investigator", "target:mark:devise-a-stratagem", "item:hands-held:1"],
                selector: "club-group-attack-roll",
                type: "ability",
            };
            source.system.rules = [rule];
        }
    }
}
