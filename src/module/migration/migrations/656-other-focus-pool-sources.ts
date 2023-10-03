import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Set focus pool for druids */
export class Migration656OtherFocusPoolSources extends MigrationBase {
    static override version = 0.656;

    private needsRuleElement(rules: (RuleElementSource & { path?: string })[]): boolean {
        return !rules.some((rule) => rule.key === "ActiveEffectLike" && rule.path === "system.resources.focus.max");
    }

    private increasesByOne = new Set([
        "additional-shadow-magic",
        "basic-bloodline-spell",
        "blessed-one-dedication",
        "breath-of-the-dragon",
        "crystal-ward-spells",
        "domain-initiate",
        "expanded-domain-initiate",
        "gravity-weapon",
        "heal-companion",
        "leaf-order",
        "shadow-illusion",
        "storm-order",
        "wings-of-the-dragon",
    ]);

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "feat") return;

        const systemData = itemSource.system;

        const rule = ((): (RuleElementSource & { [key: string]: unknown }) | null => {
            const slug = systemData.slug ?? sluggify(itemSource.name);

            if (slug === "druidic-order") {
                return {
                    key: "ActiveEffectLike",
                    path: "system.resources.focus.max",
                    mode: "upgrade",
                    value: 1,
                    priority: 10, // Before any adds
                };
            }

            if (this.increasesByOne.has(slug)) {
                return {
                    key: "ActiveEffectLike",
                    path: "system.resources.focus.max",
                    mode: "add",
                    value: 1,
                };
            }

            return null;
        })();

        if (rule && this.needsRuleElement(itemSource.system.rules)) systemData.rules.push(rule);
    }
}
