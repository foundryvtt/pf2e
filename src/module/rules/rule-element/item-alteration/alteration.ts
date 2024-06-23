import type { ActorPF2e } from "@actor";
import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { FrequencyInterval, ItemSourcePF2e, PhysicalItemSource } from "@item/base/data/index.ts";
import { PersistentSourceData } from "@item/condition/data.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { prepareBulkData } from "@item/physical/helpers.ts";
import { ZeroToThree } from "@module/data.ts";
import { nextDamageDieSize } from "@system/damage/helpers.ts";
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
        "bulk",
        "category",
        "check-penalty",
        "damage-dice-faces",
        "damage-type",
        "defense-passive",
        "description",
        "dex-cap",
        "focus-point-cost",
        "frequency-max",
        "frequency-per",
        "hardness",
        "hp-max",
        "material-type",
        "other-tags",
        "pd-recovery-dc",
        "persistent-damage",
        "rarity",
        "speed-penalty",
        "strength",
        "traits",
    ] as const;

    static override defineSchema(): ItemAlterationSchema {
        const fields = foundry.data.fields;
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

    get rule(): RuleElementPF2e {
        return this.parent;
    }

    get actor(): ActorPF2e {
        return this.parent.actor;
    }

    /**
     * Apply this alteration to an item (or source)
     * @param item The item to be altered
     */
    applyTo(item: ItemPF2e<ActorPF2e> | ItemSourcePF2e): void {
        const fallbackValue = ITEM_ALTERATION_VALIDATORS[this.property].fields.value.getInitialValue();
        const data: {
            item: ItemPF2e | ItemSourcePF2e;
            alteration: { mode: string; itemType: string; value: unknown };
        } = {
            item,
            alteration: {
                mode: this.mode,
                itemType: item.type,
                value: (this.value = this.parent.resolveValue(this.value, fallbackValue)),
            },
        };
        if (this.parent.ignored) return;

        const DataModelValidationFailure = foundry.data.validation.DataModelValidationFailure;

        switch (this.property) {
            case "ac-bonus": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const item = data.item;
                const newValue = AELikeRuleElement.getNewValue(this.mode, item.system.acBonus, data.alteration.value);
                const itemBonus =
                    itemIsOfType(item, "armor") && this.mode === "override" ? item.system.runes.potency : 0;
                item.system.acBonus = Math.max(newValue, 0) + itemBonus;
                this.#adjustCreatureShieldData(item);
                return;
            }
            case "badge-max": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                const effect = data.item;
                const badge = effect.system.badge;
                if (badge?.type !== "counter" || typeof badge.value !== "number" || typeof badge.max !== "number") {
                    return;
                }

                const newValue = AELikeRuleElement.getNewValue(this.mode, badge.max, data.alteration.value);
                const hardMax = badge.labels?.length ?? newValue;
                const min = badge.min ?? 0;
                badge.max = Math.clamp(newValue, min, hardMax);
                badge.value = Math.clamp(badge.value, min, badge.max) || 0;
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
                const max = "max" in badge ? badge.max ?? Infinity : Infinity;
                const min = "min" in badge ? badge.min ?? 0 : 0;
                badge.value = Math.clamp(newValue, min, max) || 0;
                return;
            }
            case "bulk": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                data.alteration.value = Number(data.alteration.value) || 0;
                if (!validator.isValid(data)) return;
                data.item.system.bulk.value = data.alteration.value;
                if (data.item instanceof foundry.abstract.DataModel) {
                    data.item.system.bulk = prepareBulkData(data.item);
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
                data.item.system.checkPenalty = Math.min(newValue, 0);
                return;
            }
            case "damage-dice-faces": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data) || !(data.item instanceof ItemPF2e)) {
                    return;
                }

                const item = data.item;
                if (!item.system.damage.die) return;
                if (this.mode === "upgrade" && !item.flags.pf2e.damageFacesUpgraded) {
                    item.system.damage.die = nextDamageDieSize({ upgrade: item.system.damage.die });
                    item.flags.pf2e.damageFacesUpgraded = true;
                } else if (this.mode === "downgrade") {
                    item.system.damage.die = nextDamageDieSize({ downgrade: item.system.damage.die });
                } else if (this.mode === "override" && typeof data.alteration.value === "number") {
                    if (data.alteration.value > Number(item.system.damage.die.replace("d", ""))) {
                        item.flags.pf2e.damageFacesUpgraded = true;
                    }
                    item.system.damage.die = `d${data.alteration.value}`;
                }

                return;
            }
            case "damage-type": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    data.item.system.damage.damageType = data.alteration.value;
                }
                return;
            }
            case "defense-passive": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data) && data.item instanceof ItemPF2e && data.item.system.defense?.passive) {
                    data.item.system.defense.passive.statistic = data.alteration.value;
                }
                return;
            }
            case "description": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                if (!(data.item instanceof ItemPF2e)) return;
                const contents = validator.initialize(validator.clean(data.alteration)).value;
                if (this.mode === "override") {
                    data.item.system.description.override = contents;
                } else {
                    data.item.system.description.addenda.push({ label: this.rule.label, contents });
                }
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
                data.item.system.dexCap = Math.max(newValue, 0);
                return;
            }
            case "focus-point-cost": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                if (!(data.item instanceof ItemPF2e) || data.item.isRitual) return;
                const newValue = AELikeRuleElement.getNewValue(
                    this.mode,
                    data.item.system.cast.focusPoints,
                    data.alteration.value,
                );
                data.item.system.cast.focusPoints = (Math.clamp(newValue, 0, 3) || 0) as ZeroToThree;
                return;
            }
            case "hardness": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    const system = data.item.system;
                    const value = data.alteration.value;
                    const newValue = AELikeRuleElement.getNewValue(this.mode, system.hardness, value);
                    system.hardness = Math.max(Math.trunc(newValue), 0);
                    this.#adjustCreatureShieldData(data.item);
                }
                return;
            }
            case "hp-max": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (validator.isValid(data)) {
                    const hp = data.item.system.hp;
                    const value = data.alteration.value;
                    const newValue = AELikeRuleElement.getNewValue(this.mode, hp.max, value);
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
                if (validator.isValid(data) && data.item.system.persistent) {
                    const persistent = data.item.system.persistent;
                    const newValue = AELikeRuleElement.getNewValue(this.mode, persistent.dc, data.alteration.value);
                    persistent.dc = Math.max(newValue, 0);
                }
                return;
            }
            case "frequency-max": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                data.item.system.frequency ??= { max: 1, per: "day" };
                const frequency = data.item.system.frequency;
                const newValue = AELikeRuleElement.getNewValue(this.mode, frequency.max, data.alteration.value);
                frequency.max = newValue;
                frequency.value = Math.clamp(frequency.value ?? newValue, 0, newValue);
                return;
            }
            case "frequency-per": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data)) return;
                data.item.system.frequency ??= { max: 1, per: "day" };
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
                data.item.system.speedPenalty = Math.min(newValue, 0);
                return;
            }
            case "strength": {
                const validator = ITEM_ALTERATION_VALIDATORS[this.property];
                if (!validator.isValid(data) || data.item.system.strength === null) {
                    return;
                }
                const newValue = AELikeRuleElement.getNewValue(
                    this.mode,
                    data.item.system.strength,
                    data.alteration.value,
                );
                data.item.system.strength = Math.max(newValue, -2);
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
                if (!newValue) return;
                if (newValue instanceof DataModelValidationFailure) {
                    throw newValue.asError();
                }
                const traits: string[] = data.item.system.traits.value ?? [];
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
        if ("actor" in item && item.actor?.isOfType("character", "npc") && item.isOfType("shield")) {
            const heldShield = item.actor.heldShield;
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
        if (!objectHasKey(CONFIG.PF2E.frequencies, newValue)) {
            return new foundry.data.validation.DataModelValidationFailure({ invalidValue: current, fallback: false });
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
