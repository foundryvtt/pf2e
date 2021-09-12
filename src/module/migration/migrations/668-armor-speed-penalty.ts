import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules/rules-data-definitions";
import { sluggify } from "@module/utils";
import { MigrationBase } from "../base";

/** Remove RuleElement implementation of armor speed penalties  */
export class Migration668ArmorSpeedPenalty extends MigrationBase {
    static override version = 0.668;

    override async updateItem(itemSource: ItemSourcePF2e) {
        const slug = itemSource.data.slug ?? sluggify(itemSource.name);
        if (itemSource.type === "armor") {
            const rules = (itemSource.data.rules ??= []);
            const rule = rules.find(
                (rule) =>
                    rule.key.endsWith("FlatModifier") &&
                    rule.selector === "speed" &&
                    typeof rule.value === "object" &&
                    JSON.stringify(rule.predicate ?? null) === JSON.stringify({ not: ["unburdened-iron"] })
            );
            if (rule) rules.splice(rules.indexOf(rule), 1);
        } else if (itemSource.type === "feat" && slug === "unburdened-iron") {
            // Use a general rollOptions flag for ignoring the armor speed penalty
            const rule: AELikeSource = {
                key: "ActiveEffectLike",
                mode: "override",
                path: "flags.pf2e.rollOptions.all.armor:ignore-speed-penalty",
                value: true,
            };
            itemSource.data.rules = [rule];
        }
    }
}

interface AELikeSource extends RuleElementSource {
    mode: string;
    path: string;
}
