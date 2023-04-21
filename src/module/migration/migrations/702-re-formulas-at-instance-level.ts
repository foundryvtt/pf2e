import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Change RE formula data replacement to operate at actor and item instance levels */
export class Migration702REFormulasAtInstanceLevel extends MigrationBase {
    static override version = 0.702;

    protected raiseToInstanceLevel(value: string): string {
        return value.replace(/@[a-z.]+/gi, (match) => {
            if (["@mod", "@castLevel", "@heighten", "@item.badge.value"].includes(match)) return match;
            if (match.indexOf("@spell") >= 0) return match;
            if (match === "@details.level.value") return "@actor.level";
            if (match === "@actor.details.level.value") return "@actor.level";
            if (match === "@item.value.value") return "@item.badge.value";
            if (match.startsWith("@abilities.")) return match.replace(/\babilities\b/, "actor.abilities");
            if (match.startsWith("@attributes.")) return match.replace(/\battributes\b/, "actor.attributes");
            if (match === "@item.level.value") return "@item.level";
            if (/^@item\.[a-z]+$/.test(match)) return match;
            return match
                .replace(/@item\.(?!data\b)/, "@item.system.")
                .replace(/@(?!(?:item|actor|[A-Z]\w+))/, "@actor.system.");
        });
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules: (RuleElementSource & { text?: string })[] = itemSource.system.rules;
        for (const rule of rules) {
            try {
                if (typeof rule.value === "string") {
                    rule.value = this.raiseToInstanceLevel(rule.value);
                } else if (
                    isObject<Record<string, unknown>>(rule.value) &&
                    "brackets" in rule.value &&
                    Array.isArray(rule.value.brackets)
                ) {
                    for (const bracket of rule.value.brackets) {
                        if (isObject<{ value: unknown }>(bracket) && typeof bracket.value === "string") {
                            bracket.value = this.raiseToInstanceLevel(bracket.value);
                        }
                    }
                }
                if (rule.key === "Note" && rule.text) {
                    rule.text = this.raiseToInstanceLevel(rule.text);
                }
            } catch {
                continue;
            }
        }
    }
}
