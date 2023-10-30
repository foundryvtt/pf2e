import type { ActorPF2e } from "@actor";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import { PersistentSourceData } from "@item/condition/data.ts";
import { FrequencyInterval, ItemSourcePF2e, PhysicalItemSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { organizeBulkData } from "@item/physical/helpers.ts";
import { isObject, objectHasKey } from "@util";
import { Duration } from "luxon";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import type { DataModelValidationFailure } from "types/foundry/common/data/validation-failure.d.ts";
import { AELikeChangeMode, AELikeRuleElement } from "../ae-like.ts";
import type { RuleElementPF2e } from "../base.ts";
import { ResolvableValueField } from "../data.ts";
import { ITEM_ALTERATION_VALIDATORS } from "./schemas.ts";

class ItemAlteration extends foundry.abstract.DataModel<RuleElementPF2e, ItemAlterationSchema> {
    static VALID_PROPERTIES = [
        "ac-bonus",
        "badge-max",
        "badge-value",
        "bulk-held-or-stowed",
        "bulk-worn",
        "category",
        "check-penalty",
        "dex-cap",
        "hardness",
        "hp-max",
        "material-type",
        "pd-recovery-dc",
        "persistent-damage",
        "rarity",
        "frequency-max",
        "frequency-per",
        "other-tags",
        "speed-penalty",
        "strength",
        "traits",
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
                if (badge?.type !== "counter" || typeof badge.value !== "number" || typeof badge.max !== "number") {
                    return;
                }

                const newValue = AELikeRuleElement.getNewValue(this.mode, badge.max, data.alteration.value);
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }

                const hardMax = badge.labels?.length ?? newValue;
                const min = badge.min ?? 0;
                badge.max = Math.clamped(newValue, min, hardMax);
                badge.value = Math.clamped(badge.value, min, badge.max) || 0;
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
                const min = "min" in badge ? badge.min ?? 0 : 0;
                badge.value = Math.clamped(newValue, min, max) || 0;
                return;
            }
            case "bulk-held-or-stowed": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                data.alteration.value = String(data.alteration.value);
                if (!validator.isValid(data)) return;
                data.item.system.weight.value = data.alteration.value;
                if (data.item instanceof foundry.abstract.DataModel) {
                    data.item.system.bulk = organizeBulkData(data.item);
                }
                return;
            }
            case "bulk-worn": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                data.alteration.value = String(data.alteration.value);
                if (!validator.isValid(data)) return;
                data.item.system.equippedBulk.value = data.alteration.value;
                if (data.item instanceof foundry.abstract.DataModel) {
                    data.item.system.bulk = organizeBulkData(data.item);
                }
                return;
            }
            case "category": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    data.item.system.category = data.alteration.value;
                }
                return;
            }
            case "check-penalty": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const newValue = AELikeRuleElement.getNewValue(
                    this.mode,
                    data.item.system.checkPenalty,
                    data.alteration.value,
                );
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                data.item.system.checkPenalty = newValue === null ? null : Math.min(newValue, 0);
                return;
            }
            case "dex-cap": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const newValue = AELikeRuleElement.getNewValue(
                    this.mode,
                    data.item.system.dexCap,
                    data.alteration.value,
                );
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                data.item.system.dexCap = Math.max(newValue, 0);
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
            case "material-type": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    data.item.system.material.type = data.alteration.value;
                    data.item.system.material.grade = "standard";
                    // If this is a constructed item, have the displayed name reflect the new material
                    if ("_source" in data.item) {
                        data.item.name = game.pf2e.system.generateItemName(data.item);
                    }
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
            case "other-tags": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const otherTags: string[] = data.item.system.traits.otherTags;
                const newValue = AELikeRuleElement.getNewValue(this.mode, otherTags, data.alteration.value);
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                if (this.mode === "add") {
                    if (!otherTags.includes(newValue)) otherTags.push(newValue);
                } else if (["subtract", "remove"].includes(this.mode)) {
                    otherTags.splice(otherTags.indexOf(newValue), 1);
                }
                return;
            }
            case "speed-penalty": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const newValue = AELikeRuleElement.getNewValue(
                    this.mode,
                    data.item.system.speedPenalty,
                    data.alteration.value,
                );
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                data.item.system.speedPenalty = newValue === null ? null : Math.min(newValue, 0);
                return;
            }
            case "strength": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const newValue = AELikeRuleElement.getNewValue(
                    this.mode,
                    data.item.system.strength,
                    data.alteration.value,
                );
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                data.item.system.strength = newValue === null ? null : Math.max(newValue, 0);
                return;
            }
            case "traits": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const newValue = AELikeRuleElement.getNewValue(
                    this.mode,
                    data.item.system.traits.value,
                    data.alteration.value,
                );
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                const traits = data.item.system.traits.value;
                if (this.mode === "add") {
                    if (!traits.includes(newValue)) traits.push(newValue);
                } else if (["subtract", "remove"].includes(this.mode)) {
                    traits.splice(traits.indexOf(newValue), 1);
                }
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
        newValue: string,
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

export { ItemAlteration };
export type { ItemAlterationProperty, ItemAlterationSchema };
