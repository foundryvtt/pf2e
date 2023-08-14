import type { ActorPF2e } from "@actor";
import { type ItemPF2e, type PhysicalItemPF2e } from "@item";
import { PersistentSourceData } from "@item/condition/data.ts";
import { FrequencyInterval } from "@item/data/base.ts";
import { ItemSourcePF2e, PhysicalItemSource } from "@item/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { isObject, objectHasKey } from "@util";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import type { DataModelValidationFailure } from "types/foundry/common/data/validation-failure.d.ts";
import { AELikeChangeMode, AELikeRuleElement } from "../ae-like.ts";
import { RuleElementPF2e } from "../base.ts";
import { ResolvableValueField } from "../data.ts";
import { ITEM_ALTERATION_VALIDATORS } from "./schemas.ts";
import { Duration } from "luxon";

class ItemAlteration extends foundry.abstract.DataModel<RuleElementPF2e, ItemAlterationSchema> {
    static VALID_PROPERTIES = [
        "ac-bonus",
        "badge-max",
        "badge-value",
        "category",
        "hardness",
        "hp-max",
        "pd-recovery-dc",
        "persistent-damage",
        "rarity",
        "frequency-max",
        "frequency-per",
    ] as const;

    static override defineSchema(): ItemAlterationSchema {
        const { fields } = foundry.data;
        return {
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "multiply", "override", "remove", "subtract", "upgrade"],
                initial: undefined,
            }),
            property: new fields.StringField({
                required: true,
                choices: this.VALID_PROPERTIES,
                initial: undefined,
            }),
            value: new ResolvableValueField(),
        };
    }

    get actor(): ActorPF2e {
        return this.parent.actor;
    }

    /** Convenience access to the parent rule element's `resolveValue` method */
    resolveValue(...args: Parameters<RuleElementPF2e["resolveValue"]>): ReturnType<RuleElementPF2e["resolveValue"]> {
        return this.parent.resolveValue(...args);
    }

    /**
     * Apply this alteration to an item (or source)
     * @param item The item to be altered
     */
    applyTo(item: ItemPF2e<ActorPF2e> | ItemSourcePF2e): void {
        const data: {
            item: ItemPF2e | ItemSourcePF2e;
            alteration: { mode: string; itemType: string; value: unknown };
        } = {
            item,
            alteration: {
                mode: this.mode,
                itemType: item.type,
                value: (this.value = this.parent.resolveValue(this.value)),
            },
        };
        const { DataModelValidationFailure } = foundry.data.validation;

        switch (this.property) {
            case "ac-bonus": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const armor = data.item;
                const newValue = AELikeRuleElement.getNewValue(this.mode, armor.system.acBonus, data.alteration.value);
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                armor.system.acBonus = Math.max(newValue, 0);
                this.#adjustCreatureShieldData(armor);
                return;
            }
            case "badge-max": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const effect = data.item;
                const { badge } = effect.system;
                if (badge?.type !== "counter" || !badge.value || !badge.max) return;

                const newValue = AELikeRuleElement.getNewValue(this.mode, badge.max, data.alteration.value);
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }

                const hardMax = badge.labels?.length ?? newValue;
                badge.max = Math.clamped(newValue, 1, hardMax);
                badge.value = Math.clamped(badge.value, 1, badge.max);
                return;
            }
            case "badge-value": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const effect = data.item;
                const badge = itemIsOfType(effect, "condition")
                    ? effect.system.value
                    : effect.system.badge ?? { value: 0 };
                if (typeof badge.value !== "number") return;
                const newValue = AELikeRuleElement.getNewValue(this.mode, badge.value, data.alteration.value);
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                const max = "max" in badge ? badge.max ?? Infinity : Infinity;
                badge.value = Math.clamped(newValue, 1, max);
                return;
            }
            case "category": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    data.item.system.category = data.alteration.value;
                }
                return;
            }
            case "hardness": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    const { system } = data.item;
                    const { value } = data.alteration;
                    const newValue = AELikeRuleElement.getNewValue(this.mode, system.hardness, value);
                    if (newValue instanceof DataModelValidationFailure) {
                        throw newValue.asError();
                    }
                    system.hardness = Math.max(newValue, 0);
                    this.#adjustCreatureShieldData(data.item);
                }
                return;
            }
            case "hp-max": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    const { hp } = data.item.system;
                    const { value } = data.alteration;
                    const newValue = AELikeRuleElement.getNewValue(this.mode, hp.max, value);
                    if (newValue instanceof DataModelValidationFailure) {
                        throw newValue.asError();
                    }
                    hp.max = Math.max(Math.trunc(newValue), 1);
                    if ("brokenThreshold" in hp) {
                        hp.brokenThreshold = Math.floor(hp.max / 2);
                    }
                    this.#adjustCreatureShieldData(data.item);
                }
                return;
            }
            case "persistent-damage": {
                const pdObject = isObject<PersistentSourceData>(data.alteration.value)
                    ? data.alteration.value
                    : { dc: NaN };
                const dc = Math.trunc(Math.abs(Number(pdObject?.dc) || 15));
                data.alteration.value = { ...pdObject, dc };
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    data.item.system.persistent = validator.initialize(data.alteration).value;
                }
                return;
            }
            case "rarity": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    data.item.system.traits.rarity = data.alteration.value;
                }
                return;
            }
            case "pd-recovery-dc": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                data.alteration.value = this.resolveValue(data.alteration.value) || 15;
                if (validator.isValid(data) && data.item.system.persistent) {
                    const { persistent } = data.item.system;
                    const newValue = AELikeRuleElement.getNewValue(this.mode, persistent.dc, data.alteration.value);
                    if (newValue instanceof DataModelValidationFailure) {
                        throw newValue.asError();
                    }
                    persistent.dc = Math.max(newValue, 0);
                }
                return;
            }
            case "frequency-max": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data) || !data.item.system.frequency) return;
                const frequency = data.item.system.frequency;
                const newValue = AELikeRuleElement.getNewValue(this.mode, frequency.max, data.alteration.value);
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                frequency.max = newValue;
                frequency.value = Math.clamped(frequency.value ?? newValue, 0, newValue);
                return;
            }
            case "frequency-per": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data) || !data.item.system.frequency) return;
                const newValue = this.#getNewInterval(this.mode, data.item.system.frequency.per, data.alteration.value);
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                data.item.system.frequency.per = newValue;
                return;
            }
        }
    }

    /** Adjust creature shield data due it being set before item alterations occur */
    #adjustCreatureShieldData(item: PhysicalItemPF2e | PhysicalItemSource): void {
        if ("actor" in item && item.actor?.isOfType("character", "npc") && item.isOfType("armor") && item.isShield) {
            const { heldShield } = item.actor;
            if (item === heldShield) {
                const shieldData = item.actor.attributes.shield;
                shieldData.ac = item.system.acBonus;
                shieldData.hardness = item.system.hardness;
                shieldData.hp.max = item.system.hp.max;
                shieldData.brokenThreshold = Math.floor(item.system.hp.max / 2);
            }
        }
    }

    /** Handle alterations for frequency intervals, which are luxon durations */
    #getNewInterval(
        mode: "upgrade" | "downgrade" | "override" | string,
        current: FrequencyInterval,
        newValue: string
    ): FrequencyInterval | DataModelValidationFailure {
        const { DataModelValidationFailure } = foundry.data.validation;
        if (!objectHasKey(CONFIG.PF2E.frequencies, newValue)) {
            return new DataModelValidationFailure({ invalidValue: current, fallback: false });
        }
        if (mode === "override") return newValue;

        function getDuration(key: FrequencyInterval) {
            if (key === "turn" || key === "round") return Duration.fromISO("PT6S");
            if (key === "day") return Duration.fromISO("PT24H");
            return Duration.fromISO(key);
        }

        const newIsLonger =
            (newValue === "round" && current === "turn") ||
            (newValue === "PT24H" && current === "day") ||
            getDuration(newValue) > getDuration(current);
        return (mode === "upgrade" && newIsLonger) || (mode === "downgrade" && !newIsLonger) ? newValue : current;
    }
}

interface ItemAlteration
    extends foundry.abstract.DataModel<RuleElementPF2e, ItemAlterationSchema>,
        ModelPropsFromSchema<ItemAlterationSchema> {}

type ItemAlterationSchema = {
    mode: StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    property: StringField<ItemAlterationProperty, ItemAlterationProperty, true, false, false>;
    value: ResolvableValueField<true, true, false>;
};

type ItemAlterationProperty = (typeof ItemAlteration.VALID_PROPERTIES)[number];

export { ItemAlteration, ItemAlterationProperty, ItemAlterationSchema };
