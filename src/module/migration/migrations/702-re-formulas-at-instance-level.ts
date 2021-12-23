import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules/rules-data-definitions";
import { isObject } from "@util";
import { MigrationBase } from "../base";

/** Change RE formula data replacement to operate at actor and item instance levels */
export class Migration702REFormulasAtInstanceLevel extends MigrationBase {
    static override version = 0.702;

    private raiseToInstanceLevel(value: string): string {
        return value.replace(/@[a-z.]+/gi, (match) => {
            if (match === "@details.level.value") return "@actor.level";
            if (match.startsWith("@abilities.")) return match.replace(/\babilities\b/, "actor.abilities");
            if (match === "@item.level.value") return "@item.level";
            if (/^@item\.[a-z]+$/.test(match)) return match;
            return match
                .replace(/@item\.(?!data\b)/, "@item.data.data.")
                .replace(/@(?!(?:item|actor|[A-Z]\w+))/, "@actor.data.data.");
        });
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules: Array<RuleElementSource & { text?: string }> = itemSource.data.rules;
        for (const rule of rules) {
            try {
                if (typeof rule.value === "string") {
                    rule.value = this.raiseToInstanceLevel(rule.value);
                } else if (Array.isArray(rule.value)) {
                    for (const bracket of rule.value) {
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
