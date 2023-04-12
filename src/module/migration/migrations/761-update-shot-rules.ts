import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Update rule elements on Double Shot, Triple Shot, and Stance: Multishot Stance */
export class Migration761ShotRules extends MigrationBase {
    static override version = 0.761;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        switch (source.type) {
            case "effect":
                this.#updateEffect(source);
                break;
            case "feat":
                this.#updateFeat(source);
                break;
        }
    }

    #updateEffect(source: ItemSourcePF2e): void {
        if (source.system.slug === "stance-multishot-stance") {
            const newRules = [
                {
                    key: "AdjustModifier",
                    mode: "add",
                    predicate: {
                        all: ["double-shot"],
                    },
                    relabel: "{item|name}",
                    selector: "ranged-attack-roll",
                    slug: "double-shot",
                    value: 1,
                },
                {
                    key: "AdjustModifier",
                    mode: "add",
                    predicate: {
                        all: ["triple-shot"],
                    },
                    relabel: "{item|name}",
                    selector: "ranged-attack-roll",
                    slug: "double-shot",
                    value: 1,
                },
            ];
            source.system.rules = newRules;
        }
    }

    #updateFeat(source: ItemSourcePF2e): void {
        switch (source.system.slug) {
            case "double-shot": {
                const newRules = [
                    {
                        domain: "ranged-attack-roll",
                        key: "RollOption",
                        option: "double-shot",
                        toggleable: true,
                    },
                    {
                        key: "FlatModifier",
                        predicate: {
                            all: ["double-shot", "weapon:reload:0"],
                        },
                        selector: "ranged-attack-roll",
                        slug: "double-shot",
                        value: -2,
                    },
                ];
                source.system.rules = newRules;
                break;
            }
            case "triple-shot": {
                const newRules = [
                    {
                        domain: "ranged-attack-roll",
                        disabledIf: {
                            not: ["double-shot"],
                        },
                        key: "RollOption",
                        option: "triple-shot",
                        priority: 51,
                        toggleable: true,
                    },
                    {
                        key: "AdjustModifier",
                        mode: "override",
                        predicate: {
                            all: ["double-shot", "triple-shot"],
                        },
                        relabel: "{item|name}",
                        selector: "ranged-attack-roll",
                        slug: "double-shot",
                        value: -4,
                    },
                ];
                source.system.rules = newRules;
                break;
            }
        }
    }
}
