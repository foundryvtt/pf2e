import type { ActorPF2e } from "@actor";
import { ArmorPF2e, type ItemPF2e, type PhysicalItemPF2e } from "@item";
import { PersistentSourceData } from "@item/condition/data.ts";
import { ItemSourcePF2e, PhysicalItemSource } from "@item/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { isObject } from "@util";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { AELikeChangeMode, AELikeRuleElement } from "../ae-like.ts";
import { RuleElementPF2e } from "../base.ts";
import { ResolvableValueField } from "../data.ts";
import { ITEM_ALTERATION_VALIDATORS } from "./schemas.ts";

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

        switch (this.property) {
            case "ac-bonus": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                data.item.system.acBonus;
                return;
            }
            case "badge-max": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const effect = data.item;
                const { badge } = effect.system;
                if (badge?.type !== "counter" || !badge.value || !badge.max) return;

                const newValue = AELikeRuleElement.getNewValue(this.mode, badge.max, data.alteration.value);
                if (newValue instanceof foundry.data.validation.DataModelValidationFailure) {
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
                if (newValue instanceof foundry.data.validation.DataModelValidationFailure) {
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
                    if (newValue instanceof foundry.data.validation.DataModelValidationFailure) {
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
                    if (newValue instanceof foundry.data.validation.DataModelValidationFailure) {
                        throw newValue.asError();
                    }
                    hp.max = Math.max(newValue, 1);
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
                    if (newValue instanceof foundry.data.validation.DataModelValidationFailure) {
                        throw newValue.asError();
                    }
                    persistent.dc = Math.max(newValue, 0);
                }
                return;
            }
        }
    }

    /** Adjust creature shield data due it being set before item alterations occur */
    #adjustCreatureShieldData(item: PhysicalItemPF2e | PhysicalItemSource): void {
        if (item instanceof ArmorPF2e && item.actor.isOfType("character", "npc") && item.isShield) {
            const { heldShield } = item.actor;
            if (item === heldShield) {
                const shieldData = item.actor.attributes.shield;
                shieldData.hardness = item.system.hardness;
                shieldData.hp.max = item.system.hp.max;
                shieldData.brokenThreshold = Math.floor(item.system.hp.max / 2);
            }
        }
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
