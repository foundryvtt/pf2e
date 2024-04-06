import type { ActorPF2e } from "@actor";
import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers.ts";
import type { ItemPF2e } from "@item";
import { damageDieSizeToFaces, nextDamageDieSize } from "@system/damage/helpers.ts";
import { BaseDamageData } from "@system/damage/types.ts";
import { DAMAGE_DICE_FACES, DAMAGE_TYPES } from "@system/damage/values.ts";
import { Predicate } from "@system/predication.ts";
import { setHasElement, tupleHasValue } from "@util";
import { AELikeRuleElement } from "../ae-like.ts";
import type { RuleValue } from "../data.ts";
import type { DamageAlterationProperty, DamageAlterationRuleElement, DamageAlterationValue } from "./rule-element.ts";

class DamageAlteration {
    #rule: PartialRuleElement;

    slug: string | null;

    property: DamageAlterationProperty;

    value: RuleValue | null;

    constructor(rule: PartialRuleElement) {
        this.#rule = rule;
        this.slug = rule.slug;
        this.property = rule.property;
        this.value = rule.value;
    }

    getNewValue(
        damage: BaseDamageData | DamageDicePF2e | ModifierPF2e,
        item: ItemPF2e | null,
    ): DamageAlterationValue | null {
        const rule = this.#rule;
        const resolvables: Record<string, unknown> = item
            ? { [item.type === "action" ? "ability" : item.type]: item }
            : {};
        const change = rule.resolveValue?.(rule.value, null, { resolvables }) ?? rule.value;
        if (rule.ignored) return null;

        if (rule.property === "damage-type" && setHasElement(DAMAGE_TYPES, change)) {
            return change;
        }

        if (rule.property === "dice-number" && "diceNumber" in damage && typeof change === "number") {
            return Math.clamped(
                Math.floor(AELikeRuleElement.getNewValue(rule.mode, damage.diceNumber ?? 0, change)),
                0,
                99,
            );
        }

        if (rule.property === "dice-faces") {
            if (!("dieSize" in damage) || !damage.dieSize) {
                return null;
            }

            const currentFaces = damageDieSizeToFaces(damage.dieSize);
            if (rule.mode === "downgrade") {
                return tupleHasValue(DAMAGE_DICE_FACES, change) && change <= currentFaces
                    ? change
                    : Number(nextDamageDieSize({ downgrade: damage.dieSize }).replace("d", ""));
            }
            if (rule.mode === "upgrade") {
                return tupleHasValue(DAMAGE_DICE_FACES, change) && change >= currentFaces
                    ? change
                    : Number(nextDamageDieSize({ upgrade: damage.dieSize }).replace("d", ""));
            }
            if (rule.mode === "override" && tupleHasValue(DAMAGE_DICE_FACES, change)) {
                return change;
            }
        }

        return null;
    }

    applyTo<TDamage extends DamageDicePF2e | ModifierPF2e>(
        damage: TDamage,
        options: { item: ItemPF2e<ActorPF2e>; test: string[] | Set<string> },
    ): TDamage {
        const rule = this.#rule;
        if (rule.ignored) return damage;

        if ("value" in damage && ["dice-faces", "dice-number"].includes(this.property)) {
            // `damage` is a `ModifierPF2e`
            return damage;
        }

        const parent = rule.parent ?? { getRollOptions: () => [] };
        const predicate = rule.predicate ?? new Predicate();
        const predicatePassed =
            predicate.length === 0 ||
            predicate.test([...options.test, ...damage.getRollOptions(), ...parent.getRollOptions("parent")]);
        if (!predicatePassed) return damage;

        const value = (this.value = this.getNewValue(damage, options.item));

        if (typeof value === "string") {
            damage.damageType = value;
        }

        if (this.property === "dice-faces" && "dieSize" in damage && tupleHasValue(DAMAGE_DICE_FACES, value)) {
            damage.dieSize = `d${value}`;
        }

        if (this.property === "dice-number" && "diceNumber" in damage && typeof value === "number") {
            damage.diceNumber = value;
        }

        return damage;
    }
}

interface PartialRuleElement extends Pick<DamageAlterationRuleElement, "mode" | "property" | "slug" | "value"> {
    resolveValue?: DamageAlterationRuleElement["resolveValue"];
    ignored?: boolean;
    parent?: ItemPF2e<ActorPF2e>;
    predicate?: Predicate;
}

export { DamageAlteration };
