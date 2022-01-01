import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { sluggify } from "@util";
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
        } else if (itemSource.type === "feat") {
            // Use rollOptions flags for ignoring the armor speed and stealth penalties
            if (slug === "unburdened-iron") {
                const rule: RollOption = { key: "RollOption", domain: "speed", option: "armor:ignore-speed-penalty" };
                itemSource.data.rules = [rule];
            } else if (slug === "armored-stealth") {
                const rule: RollOption = { key: "RollOption", domain: "stealth", option: "armor:ignore-noisy-penalty" };
                itemSource.data.rules = [rule];
            }
        }
    }
}

interface RollOption extends RuleElementSource {
    domain?: string;
    option: string;
}
