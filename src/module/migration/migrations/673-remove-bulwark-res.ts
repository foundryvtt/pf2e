import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";
import { sluggify } from "@util";
import { RuleElementSource } from "@module/rules";

/** Remove bulwark armor rule elements */
export class Migration673RemoveBulwarkREs extends MigrationBase {
    static override version = 0.673;

    private hasRuleElement(rules: RuleElementSource[]): boolean {
        return rules.some(
            (rule) => rule.key?.endsWith("FlatModifier") && rule.predicate?.all?.includes("self:armor:trait:bulwark")
        );
    }

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        const { rules } = item.data;
        if (item.type === "armor") {
            const index = rules.findIndex(
                (rule: RESourceWithAbility) =>
                    rule.key?.endsWith("FlatModifier") &&
                    rule.selector === "reflex" &&
                    rule.type === "ability" &&
                    /bulwark/i.test(rule.label ?? "")
            );
            if (index !== -1) rules.splice(index);
        }

        const slug = item.data.slug ?? sluggify(item.name);
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
    type?: string;
}
