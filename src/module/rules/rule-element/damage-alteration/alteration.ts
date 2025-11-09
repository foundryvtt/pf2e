import type { ActorPF2e } from "@actor";
import { DamageDicePF2e, Modifier } from "@actor/modifiers.ts";
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
        damage: BaseDamageData | DamageDicePF2e | Modifier,
        item: ItemPF2e | null,
    ): DamageAlterationValue | null {
        const rule = this.#rule;
        const resolvables: Record<string, unknown> = item
            ? { [item.type === "action" ? "ability" : item.type]: item }
            : {};
        const change = rule.resolveValue?.(rule.value, null, { resolvables }) ?? rule.value;
        if (rule.ignored) return null;

        switch (rule.property) {
            case "damage-type":
                return setHasElement(DAMAGE_TYPES, change) ? change : null;
            case "dice-number":
                return "diceNumber" in damage && typeof change === "number"
                    ? Math.clamp(
                          Math.floor(AELikeRuleElement.getNewValue(rule.mode, damage.diceNumber ?? 0, change)),
                          0,
                          99,
                      )
                    : null;
            case "dice-faces": {
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
                return null;
            }
            case "tags": {
                const changes = Array.isArray(change) ? change : [change];
                const tags = damage.tags ?? [];
                switch (rule.mode) {
                    case "add":
                        tags.push(...changes);
                        return tags;
                    case "remove":
                    case "subtract": {
                        for (const tag of changes) {
                            const index = tags.indexOf(tag);
                            if (index > -1) tags.splice(index, 1);
                        }
                        return tags;
                    }
                    case "override":
                        return changes;
                    default:
                        return null;
                }
            }
        }
    }

    applyTo<TDamage extends DamageDicePF2e | Modifier>(
        damage: TDamage,
        options: { item: ItemPF2e<ActorPF2e>; test: string[] | Set<string> },
    ): TDamage {
        const rule = this.#rule;
        if (rule.ignored) return damage;

        // If this is a modifier (and the property is for dice) or purely an override dice, skip
        const isModifier = "value" in damage && ["dice-faces", "dice-number"].includes(this.property);
        const isOverrideDice =
            !("value" in damage) && !damage.damageType && !damage.diceNumber && !damage.dieSize && damage.override;
        if (isModifier || isOverrideDice) return damage;

        const parent = rule.parent ?? { getRollOptions: () => [] };
        const predicate = rule.predicate ?? new Predicate();
        const predicatePassed =
            predicate.length === 0 ||
            predicate.test([...options.test, ...damage.getRollOptions(), ...parent.getRollOptions("parent")]);
        if (!predicatePassed) return damage;

        const value = (this.value = this.getNewValue(damage, options.item));

        if (rule.property === "tags" && Array.isArray(value)) {
            damage.tags = value;
        } else if (typeof value === "string") {
            damage.damageType = value;
        } else if (this.property === "dice-faces" && "dieSize" in damage && tupleHasValue(DAMAGE_DICE_FACES, value)) {
            const stringValue = `d${value}` as const;
            // Ensure that weapon damage isn't being upgraded multiple times
            if (
                this.#rule.slug === "base" &&
                this.#rule.mode === "upgrade" &&
                damage.dieSize !== stringValue &&
                options.item.isOfType("weapon")
            ) {
                if (options.item.flags.pf2e.damageFacesUpgraded) return damage;
                options.item.flags.pf2e.damageFacesUpgraded = true;
            }
            damage.dieSize = stringValue;
        } else if (this.property === "dice-number" && "diceNumber" in damage && typeof value === "number") {
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
