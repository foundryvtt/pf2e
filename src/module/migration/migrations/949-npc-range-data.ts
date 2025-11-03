import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { RuleElementSource } from "@module/rules/index.ts";
import type { StrikeSource } from "@module/rules/rule-element/strike.ts";
import { MigrationBase } from "../base.ts";

class Migration949NPCRangeData extends MigrationBase {
    static override version = 0.949;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!("game" in globalThis) && source.type === "melee") {
            const system = source.system;
            const rangeData = getLegacyRangeData(system.traits.value);
            if (rangeData) {
                system.range ??= { increment: rangeData.increment, max: rangeData.max };
                system.traits.value = system.traits.value.filter((t) => !/^(?:range-increment|range)-\d+$/.test(t));
            }
        }

        // Update traits and ranges of strike rule elements
        for (const rule of source.system.rules) {
            if (!this.#isStrikeRE(rule)) continue;
            if (!Array.isArray(rule.traits)) continue;
            const data = getLegacyRangeData(rule.traits);
            if (!data) continue;
            rule.range = data;
            rule.traits = rule.traits.filter((t) => !/^(?:range-increment|range)-\d+$/.test(t));
        }
    }

    #isStrikeRE(rule: RuleElementSource): rule is StrikeSource {
        return rule.key === "Strike";
    }
}

/** Returns range from traits data */
function getLegacyRangeData(traits: string[]): { increment: number | null; max: number | null } | null {
    const rangeRegex = /^(range(?:-increment)?)-(\d+)$/;
    for (const trait of traits) {
        const match = trait.match(rangeRegex);
        if (!match) continue;
        const prop = match[1] === "range" ? "max" : "increment";
        return { max: null, increment: null, [prop]: Number(match[2]) };
    }

    return null;
}

export { getLegacyRangeData, Migration949NPCRangeData };
