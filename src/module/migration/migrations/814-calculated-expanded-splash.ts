import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add/update rule elements for the Calculated Splash and Expanded Splash feats */
export class Migration814CalculatedExpandedSplash extends MigrationBase {
    static override version = 0.814;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        switch (source.system.slug) {
            case "calculated-splash": {
                const rules = [
                    {
                        key: "AdjustModifier",
                        mode: "upgrade",
                        predicate: [{ not: "feat:expanded-splash" }],
                        relabel: "{item|name}",
                        selector: "alchemical-bomb-damage",
                        slug: "splash",
                        value: "@actor.abilities.int.mod",
                    },
                ];

                source.system.rules = rules;
                return;
            }

            case "expanded-splash": {
                const rules = [
                    {
                        damageCategory: "splash",
                        key: "FlatModifier",
                        predicate: ["item:trait:splash"],
                        selector: "alchemical-bomb-damage",
                        value: "@actor.abilities.int.mod",
                    },
                    {
                        key: "Note",
                        predicate: ["item:trait:splash"],
                        selector: "alchemical-bomb-damage",
                        text: "The bomb deals splash damage to every creature within 10 feet of the target.",
                        title: "{item|name}",
                    },
                ];
                source.system.rules = rules;
            }
        }
    }
}
