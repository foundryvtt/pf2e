import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";
import { isObject, sluggify } from "@util";
import { RuleElementSource } from "@module/rules/index.ts";
import { PredicateStatement } from "@system/predication.ts";

/** Remove bulwark armor rule elements */
export class Migration673RemoveBulwarkREs extends MigrationBase {
    static override version = 0.673;

    private hasRuleElement(rules: RuleElementSource[]): boolean {
        return rules.some(
            (r) =>
                typeof r.key === "string" &&
                r.key.endsWith("FlatModifier") &&
                isObject<OldRawPredicate>(r.predicate) &&
                !!r.predicate.all?.includes("self:armor:trait:bulwark")
        );
    }

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        const { rules } = item.system;
        if (item.type === "armor") {
            const index = rules.findIndex(
                (rule: RESourceWithAbility) =>
                    typeof rule.key === "string" &&
                    rule.key.endsWith("FlatModifier") &&
                    rule.selector === "reflex" &&
                    rule.type === "ability" &&
                    /bulwark/i.test(String(rule.label ?? ""))
            );
            if (index !== -1) rules.splice(index);
        }

        const slug = item.system.slug ?? sluggify(item.name);
        if (item.type === "feat" && slug === "mighty-bulwark" && !this.hasRuleElement(rules)) {
            const newRules = [
                {
                    key: "FlatModifier",
                    predicate: { all: ["self:armor:trait:bulwark"] },
                    selector: "reflex",
                    type: "untyped",
                    value: 4,
                },
                {
                    key: "RollOption",
                    domain: "reflex",
                    option: "self:armor:bulwark-all",
                },
            ];
            rules.push(...newRules);
        }
    }
}

interface RESourceWithAbility extends RuleElementSource {
    selector?: string;
    type?: string;
}

interface OldRawPredicate {
    all?: PredicateStatement[];
    any?: PredicateStatement[];
    not?: PredicateStatement[];
}
