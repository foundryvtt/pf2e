import { FeatSource, ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { AdjustModifierSource } from "@module/rules/rule-element/adjust-modifier.ts";
import { DamageDiceSource } from "@module/rules/rule-element/damage-dice.ts";
import { FlatModifierSource } from "@module/rules/rule-element/flat-modifier.ts";
import { sluggify } from "@util/misc.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Certain things were incorrectly set to be on strike-damage, but apply to all weapon and unarmed damage */
export class Migration953NotStrikeDamage extends MigrationBase {
    static override version = 0.953;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const slug = source.system.slug ?? sluggify(source.name);
        if (slug === "bloodrager" && itemIsOfType(source, "feat")) {
            this.#updateBloodrager(source);
            return;
        }

        for (const rule of source.system.rules) {
            if (
                this.#isAdjustModifier(rule) &&
                ["weapon-specialization", "spirit-striking"].includes(rule.slug ?? "")
            ) {
                if (rule.selector === "strike-damage") {
                    delete rule.selector;
                    rule.selectors = ["unarmed-damage", "weapon-damage"];
                }
            } else if (
                (this.#isFlatModifier(rule) || this.#isDamageDice(rule)) &&
                (["weapon-specialization", "spirit-striking"].includes(rule.slug ?? "") ||
                    [
                        "gorum-moderate-curse",
                        "striking-retribution",
                        "mountain-strategy",
                        "demonbane-warrior",
                        "kin-hunter",
                    ].includes(slug))
            ) {
                const selectors = this.#coerceArray(rule.selector);
                if (selectors.includes("strike-damage")) {
                    rule.selector = this.#simplifyModifierSelector([
                        ...selectors.filter((s) => s !== "strike-damage"),
                        "unarmed-damage",
                        "weapon-damage",
                    ]);
                }
            } else if (this.#isFlatModifier(rule) && slug === "dragon-roar") {
                const selectors = this.#coerceArray(rule.selector);
                if (selectors.includes("strike-damage")) {
                    rule.selector = this.#simplifyModifierSelector([
                        ...selectors.filter((s) => s !== "strike-damage"),
                        "attack-damage",
                    ]);
                }
            }
        }
    }

    #updateBloodrager(source: FeatSource) {
        const idx = source.system.rules.findIndex((r) => r.key === "FlatModifier");
        source.system.rules = source.system.rules.filter((r) => r.key !== "FlatModifier");
        source.system.rules.splice(
            idx >= 0 ? idx : source.system.rules.length,
            0,
            {
                damageType: "bleed",
                key: "FlatModifier",
                predicate: ["self:effect:rage", "item:damage:category:physical"],
                selector: ["attack-damage"],
                value: "ternary(gte(@actor.level,15),4,ternary(gte(@actor.level,7),2,1))",
            } as FlatModifierSource,
            {
                key: "FlatModifier",
                predicate: ["self:effect:rage"],
                selector: ["attack-spell-damage"],
                slug: "blood-rage-spell",
                value: "ternary(gte(@actor.level,15),8,ternary(gte(@actor.level,7),4,2))",
            } as FlatModifierSource,
        );
    }

    #isAdjustModifier(rule: RuleElementSource): rule is AdjustModifierSource {
        return rule.key === "AdjustModifier";
    }

    #isFlatModifier(rule: RuleElementSource): rule is FlatModifierSource {
        return rule.key === "FlatModifier";
    }

    #isDamageDice(rule: RuleElementSource): rule is DamageDiceSource {
        return rule.key === "DamageDice";
    }

    #coerceArray<T>(value: T[] | T): T[] {
        return Array.isArray(value) ? value : [value];
    }

    #simplifyModifierSelector<T>(value: T[]): T[] | T {
        const reduced = R.unique(value).sort();
        return reduced.length === 1 ? reduced[0] : reduced;
    }
}
