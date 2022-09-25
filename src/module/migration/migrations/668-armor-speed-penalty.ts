import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

/** Remove RuleElement implementation of armor speed penalties  */
export class Migration668ArmorSpeedPenalty extends MigrationBase {
    static override version = 0.668;

    override async updateItem(itemSource: ItemSourcePF2e) {
        const slug = itemSource.system.slug ?? sluggify(itemSource.name);
        if (itemSource.type === "armor") {
            const rules = (itemSource.system.rules ??= []);
            const rule = rules.find(
                (r: RuleElementSource & { selector?: unknown }) =>
                    typeof r.key === "string" &&
                    r.key.endsWith("FlatModifier") &&
                    r.selector === "speed" &&
                    typeof r.value === "object" &&
                    JSON.stringify(r.predicate ?? null) === JSON.stringify({ not: ["unburdened-iron"] })
            );
            if (rule) rules.splice(rules.indexOf(rule), 1);
        } else if (itemSource.type === "feat") {
            // Use rollOptions flags for ignoring the armor speed and stealth penalties
            if (slug === "unburdened-iron") {
                const rule: RollOption = { key: "RollOption", domain: "speed", option: "armor:ignore-speed-penalty" };
                itemSource.system.rules = [rule];
            } else if (slug === "armored-stealth") {
                const rule: RollOption = { key: "RollOption", domain: "stealth", option: "armor:ignore-noisy-penalty" };
                itemSource.system.rules = [rule];
            }
        }
    }
}

interface RollOption extends RuleElementSource {
    domain?: string;
    option: string;
}
