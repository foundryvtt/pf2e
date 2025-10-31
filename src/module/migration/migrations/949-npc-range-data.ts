import type { ItemSourcePF2e, MeleeSource } from "@item/base/data/index.ts";
import type { NPCAttackTrait } from "@item/melee/types.ts";
import type { RuleElementSource } from "@module/rules/index.ts";
import type { StrikeSource } from "@module/rules/rule-element/strike.ts";
import { MigrationBase } from "../base.ts";

export class Migration949NPCRangeData extends MigrationBase {
    static override version = 0.949;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "melee") {
            this.#updateNPCAttack(source);
        }

        // Update traits and ranges of strike rule elements
        for (const rule of source.system.rules) {
            if (!this.#isStrikeRE(rule)) continue;
            if (!Array.isArray(rule.traits)) continue;
            const data = this.#getDataFromTraits(rule.traits);
            if (!data.increment && !data.max) continue;
            rule.range = data;
            rule.traits = this.#filterRangeTraits(rule.traits);
        }
    }

    #updateNPCAttack(source: MeleeSource) {
        const rangeData = this.#getDataFromTraits(source.system.traits.value);
        if (rangeData.increment || rangeData.max) {
            source.system.range ??= { increment: null, max: null };
            source.system.range.increment ??= rangeData.increment;
            source.system.range.max ??= rangeData.max;
        } else {
            source.system.range = null;
        }

        source.system.traits.value = this.#filterRangeTraits(source.system.traits.value);
    }

    /** Returns range from traits data */
    #getDataFromTraits(traits: string[]) {
        const specifiedMaxRange = ((): number | null => {
            const rangeTrait = traits.find((t) => /^range-\d+$/.test(t));
            const range = Number(rangeTrait?.replace(/\D/g, "") || "NaN");
            return Number.isInteger(range) ? range : null;
        })();

        return {
            increment: ((): number | null => {
                if (specifiedMaxRange) return null;
                const incrementTrait = traits.find((t) => /^(?:range-increment)-\d+$/.test(t));
                return Number(incrementTrait?.replace(/\D/g, "")) || null;
            })(),
            max: specifiedMaxRange,
        };
    }

    #filterRangeTraits(traits: NPCAttackTrait[]): NPCAttackTrait[] {
        return traits.filter((t) => !/^(?:range-increment|range)-\d+$/.test(t));
    }

    #isStrikeRE(rule: RuleElementSource): rule is StrikeSource {
        return rule.key === "Strike";
    }
}
