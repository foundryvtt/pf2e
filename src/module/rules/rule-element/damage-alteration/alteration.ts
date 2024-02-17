import type { ActorPF2e } from "@actor";
import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers.ts";
import type { ItemPF2e } from "@item";
import { nextDamageDieSize } from "@system/damage/helpers.ts";
import { BaseDamageData } from "@system/damage/types.ts";
import { DAMAGE_DIE_FACES, DAMAGE_TYPES } from "@system/damage/values.ts";
import { setHasElement, tupleHasValue } from "@util";
import { AELikeRuleElement } from "../ae-like.ts";
import type { DamageAlterationRuleElement, DamageAlterationValue } from "./rule-element.ts";

class DamageAlteration {
    #rule: DamageAlterationRuleElement;

    slug: string | null;

    constructor(rule: DamageAlterationRuleElement) {
        this.#rule = rule;
        this.slug = rule.slug;
    }

    getNewValue(
        damage: BaseDamageData | DamageDicePF2e | ModifierPF2e,
        item: ItemPF2e | null,
    ): DamageAlterationValue | null {
        const rule = this.#rule;
        const resolvables: Record<string, unknown> = item
            ? { [item.type === "action" ? "ability" : item.type]: item }
            : {};
        const change = this.#rule.resolveValue(this.#rule.value, null, { resolvables });
        if (rule.ignored) return null;

        if (rule.property === "damage-type" && setHasElement(DAMAGE_TYPES, change)) {
            return change;
        }

        if (rule.property === "dice-number" && "diceNumber" in damage && typeof change === "number") {
            return AELikeRuleElement.getNewValue(rule.mode, damage.diceNumber ?? 0, change);
        }

        if (rule.property === "dice-faces") {
            if (!("dieSize" in damage) || !damage.dieSize) {
                return null;
            }
            if (rule.mode === "downgrade") {
                return Number(nextDamageDieSize({ downgrade: damage.dieSize }).replace("d", ""));
            }
            if (rule.mode === "upgrade") {
                return Number(nextDamageDieSize({ downgrade: damage.dieSize }).replace("d", ""));
            }
            if (rule.mode === "override" && tupleHasValue(DAMAGE_DIE_FACES, change)) {
                return change;
            }
        }

        return null;
    }

    applyTo<TDamage extends BaseDamageData | DamageDicePF2e | ModifierPF2e>(
        damage: TDamage,
        options: { item: ItemPF2e<ActorPF2e>; test: string[] | Set<string> },
    ): TDamage {
        const rule = this.#rule;
        if (rule.ignored) return damage;

        if ("value" in damage && ["dice-faces", "dice-number"].includes(rule.property)) {
            // `damage` is a `ModifierPF2e`
            return damage;
        }

        const { parent, predicate } = this.#rule;
        const damageRollOptions =
            "getRollOptions" in damage
                ? damage.getRollOptions()
                : new DamageDicePF2e({ ...damage, selector: "damage", slug: "base" }).getRollOptions();
        const predicatePassed =
            predicate.length === 0 ||
            predicate.test([...options.test, ...damageRollOptions, ...parent.getRollOptions("parent")]);
        if (!predicatePassed) return damage;

        const value = this.getNewValue(damage, options.item);

        if (typeof value === "string") {
            damage.damageType = value;
        }

        if (rule.property === "dice-faces" && "dieSize" in damage && tupleHasValue(DAMAGE_DIE_FACES, value)) {
            damage.dieSize = `d${value}`;
        }

        if (rule.property === "dice-number" && "diceNumber" in damage && typeof value === "number") {
            damage.diceNumber = value;
        }

        return damage;
    }
}

export { DamageAlteration };
