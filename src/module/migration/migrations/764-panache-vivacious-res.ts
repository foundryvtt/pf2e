import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove rule elements from Panache class feature, add slugs to Vivacious Speed REs */
export class Migration764PanacheVivaciousREs extends MigrationBase {
    static override version = 0.764;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        if (source.system.slug === "panache") {
            source.system.rules = [];
        } else if (source.system.slug === "vivacious-speed") {
            source.system.rules = this.#vivaciousRules;
        }
    }

    get #vivaciousRules(): FlatModifierSource[] {
        return [
            {
                key: "FlatModifier",
                predicate: {
                    all: ["self:effect:panache"],
                },
                selector: "speed",
                slug: "vivacious-full",
                type: "status",
                value: {
                    brackets: [
                        {
                            end: 2,
                            value: 5,
                        },
                        {
                            end: 6,
                            start: 3,
                            value: 10,
                        },
                        {
                            end: 10,
                            start: 7,
                            value: 15,
                        },
                        {
                            end: 14,
                            start: 11,
                            value: 20,
                        },
                        {
                            end: 18,
                            start: 15,
                            value: 25,
                        },
                        {
                            start: 19,
                            value: 30,
                        },
                    ],
                },
            },
            {
                key: "FlatModifier",
                predicate: {
                    not: ["self:effect:panache"],
                },
                selector: "speed",
                slug: "vivacious-half",
                type: "status",
                value: {
                    brackets: [
                        {
                            end: 10,
                            start: 3,
                            value: 5,
                        },
                        {
                            end: 18,
                            start: 11,
                            value: 10,
                        },
                        {
                            start: 19,
                            value: 15,
                        },
                    ],
                },
            },
        ];
    }
}

interface FlatModifierSource extends RuleElementSource {
    selector?: string;
    type?: string;
}
