import { ItemSourcePF2e } from "@item/data/index.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { MigrationBase } from "../base.ts";

/** Convert crafting-entry field discovery data to predicates */
export class Migration817FieldDiscoveryPredicates extends MigrationBase {
    static override version = 0.817;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const aeLikes = source.system.rules.filter(
            (r): r is AELikeSource =>
                r.key === "ActiveEffectLike" &&
                "path" in r &&
                typeof r.path === "string" &&
                /^system.crafting.entries.\w+.fieldDiscovery$/.test(r.path) &&
                "value" in r &&
                typeof r.value === "string"
        );

        for (const rule of aeLikes) {
            switch (rule.value) {
                case "bomb":
                    rule.value = ["item:base:alchemical-bomb"];
                    break;
                case "elixir":
                    rule.value = ["item:trait:elixir", "item:trait:healing"];
                    break;
                case "mutagen":
                    rule.value = ["item:trait:mutagen"];
                    break;
                case "poison":
                    rule.value = ["item:trait:alchemical", "item:trait:poison"];
                    break;
                default:
                    // Sorry, homebrewers, I hope this is right!
                    rule.value = [`item:trait:${rule.value}`];
            }
        }
    }
}
