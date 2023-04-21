import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Add negativeHealing and recoveryMultiplier AE-like rules elements to certain feats */
export class Migration667HPSubProperties extends MigrationBase {
    static override version = 0.667;

    addRecoveryMultiplier(itemSource: ItemSourcePF2e, slug: string): void {
        if (!["dream-may", "fast-recovery"].includes(slug)) return;

        const rules = itemSource.system.rules;
        const needsRuleElement = !rules.some(
            (rule: Record<string, unknown>) =>
                "path" in rule && rule["path"] === "system.attributes.hp.recoveryMultiplier"
        );
        if (needsRuleElement) {
            const element: AELikeSource = {
                key: "ActiveEffectLike",
                mode: "add",
                path: "system.attributes.hp.recoveryMultiplier",
                value: 1,
            };
            rules.push(element);
        }
    }

    addNegativeHealing(itemSource: ItemSourcePF2e, slug: string): void {
        if (!["dhampir", "negative-healing"].includes(slug)) return;
        const rules = itemSource.system.rules;
        const needsRuleElement = !rules.some(
            (rule: Record<string, unknown>) => "path" in rule && rule["path"] === "system.attributes.hp.negativeHealing"
        );

        if (needsRuleElement) {
            const element: AELikeSource = {
                key: "ActiveEffectLike",
                mode: "override",
                path: "system.attributes.hp.negativeHealing",
                value: true,
            };
            rules.push(element);
        }
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "feat" && itemSource.type !== "action") return;

        const slug = itemSource.system.slug ?? sluggify(itemSource.name);
        this.addRecoveryMultiplier(itemSource, slug);
        this.addNegativeHealing(itemSource, slug);
    }
}

interface AELikeSource extends RuleElementSource {
    mode: string;
    path: string;
}
