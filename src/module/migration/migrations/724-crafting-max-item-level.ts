import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
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

        /** Predicate all Advanced Alchemy REs on the presence of the Alchemist class */
        type RESourceWithName = RuleElementSource & { name?: unknown };
        if (source.data.slug === "advanced-alchemy") {
            const rules: RESourceWithName[] = source.data.rules;
            for (const rule of rules) {
                rule.predicate = { all: ["self:class:alchemist"] };
                if (rule.key === "CraftingEntry") {
                    delete rule.name;
                    rule.label = "PF2E.TraitAlchemist";
                }
            }
        } else if (source.data.slug?.endsWith("-dedication") && source.data.slug !== "alchemist-dedication") {
            // Set localized labels
            const rules = source.data.rules.filter((r): r is RESourceWithName => r.key === "CraftingEntry");
            for (const rule of rules) {
                delete rule.name;
                const i18nKey = sluggify(source.data.slug.replace(/-dedication$/, ""), { camel: "bactrian" });
                rule.label = `PF2E.SpecificRule.DedicationCraftingEntry.${i18nKey}`;
            }
        }

        const aeLikes = source.data.rules.filter((r): r is AELikeSource => r.key === "ActiveEffectLike");
        for (const rule of aeLikes) {
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
