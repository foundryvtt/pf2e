import { ItemSourcePF2e } from "@item/data";
import { AELikeSource } from "@module/rules/rule-element/ae-like";
import { PredicateStatement, RawPredicate } from "@system/predication";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

/** Predicate rule elements related to crafting entries to protect against partial entry data getting created */
export class Migration724CraftingMaxItemLevel extends MigrationBase {
    static override version = 0.724;

    private pathPattern = /^data\.crafting\.entries\.([-a-z]+)\.maxItemLevel$/i;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        if (source.data.slug === "advanced-alchemy") {
            for (const rule of source.data.rules) {
                rule.predicate = { all: ["self:class:alchemist"] };
            }
        }

        const rules = source.data.rules.filter((r): r is AELikeSource => r.key === "ActiveEffectLike");
        for (const rule of rules) {
            if (typeof rule.path !== "string") continue;

            const selector = this.pathPattern.exec(rule.path)?.[1] ?? null;
            if (selector) {
                type RawPredicateAll = RawPredicate & { all: PredicateStatement[] };
                const predicate: RawPredicateAll = (rule.predicate = mergeObject({ all: [] }, rule.predicate ?? {}));
                const slug = sluggify(selector);
                predicate.all = Array.from(new Set([...predicate.all, `crafting:entry:${slug}`]));
            }
        }
    }
}
