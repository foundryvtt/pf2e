import type { DataFieldOptions } from "@common/data/_types.d.mts";
import { ItemPF2e, WeaponPF2e } from "@item";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { PersistentDamageValueSchema } from "@item/condition/data.ts";
import { addOrUpgradeTrait, itemIsOfType, removeTrait } from "@item/helpers.ts";
import { prepareBulkData } from "@item/physical/helpers.ts";
import { Grade } from "@item/physical/types.ts";
import { PHYSICAL_ITEM_TYPES, PRECIOUS_MATERIAL_TYPES } from "@item/physical/values.ts";
import type { ItemType } from "@item/types.ts";
import { WeaponRangeIncrement } from "@item/weapon/types.ts";
import { MANDATORY_RANGED_GROUPS } from "@item/weapon/values.ts";
import { RARITIES, ZeroToFour, ZeroToThree } from "@module/data.ts";
import { nextDamageDieSize } from "@system/damage/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { DamageDiceFaces } from "@system/damage/types.ts";
import { DAMAGE_DICE_FACES } from "@system/damage/values.ts";
import {
    DataUnionField,
    PredicateField,
    SlugField,
    StrictNumberField,
    StrictStringField,
} from "@system/schema-data-fields.ts";
import { objectHasKey, setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";
import { AELikeRuleElement, type AELikeChangeMode } from "../ae-like.ts";
import { ResolvableValueField, RuleElement } from "../index.ts";
import { adjustCreatureShieldData, getNewInterval, itemHasCounterBadge } from "./helper.ts";
import fields = foundry.data.fields;
import validation = foundry.data.validation;

/** A `SchemaField` reappropriated for validation of specific item alterations */
class ItemAlterationHandler<TSchema extends AlterationSchema> extends fields.SchemaField<TSchema> {
    #validateForItem?: (
        item: ItemPF2e | ItemSourcePF2e,
        alteration: MaybeAlterationData,
    ) => validation.DataModelValidationFailure | void;

    operableOnInstances: boolean;

    operableOnSource: boolean;

    /** A registered handler function for the item alteration. The validation should be performed inside */
    handle: (data: AlterationApplicationData) => void;

    constructor(options: AlterationFieldOptions<TSchema> & { fields: TSchema }) {
        super(options.fields, R.omit(options, ["fields"]));
        if (options.validateForItem) this.#validateForItem = options.validateForItem;
        this.handle = options.handle.bind(this);
        this.operableOnInstances = options.operableOnInstances ?? true;
        this.operableOnSource = options.operableOnSource ?? true;
    }

    /**
     * A type-safe affirmation of full validity of an alteration _and_ its applicable to a particular item
     * Errors will bubble all the way up to the originating parent rule element
     */
    isValid(data: {
        item: ItemPF2e | ItemSourcePF2e;
        rule: RuleElement;
        fromEquipment: boolean;
        alteration: MaybeAlterationData;
    }): data is {
        item: ItemOrSource<fields.SourceFromSchema<TSchema>["itemType"]>;
        rule: RuleElement;
        fromEquipment: boolean;
        alteration: fields.SourceFromSchema<TSchema>;
    } {
        const alteration = (data.alteration = fu.mergeObject(this.getInitialValue(), data.alteration));
        const failure = this.validate(alteration);
        if (failure) throw new validation.DataModelValidationError(failure);

        const item = data.item;
        if (item.type !== alteration.itemType) return false;
        const forItemFailure = this.#validateForItem?.(item, alteration);
        if (forItemFailure) throw new validation.DataModelValidationError(forItemFailure);

        if (!this.operableOnInstances && item instanceof foundry.abstract.Document) {
            throw new validation.DataModelValidationError("may only be applied to source data");
        }

        if (!this.operableOnSource && !(item instanceof foundry.abstract.Document)) {
            throw new validation.DataModelValidationError("may only be applied to existing items");
        }

        return true;
    }
}

type ItemOrSource<TItemType extends ItemType> =
    | InstanceType<(typeof CONFIG.PF2E.Item.documentClasses)[TItemType]>
    | InstanceType<(typeof CONFIG.PF2E.Item.documentClasses)[TItemType]>["_source"];

type MaybeAlterationData = { mode: string; itemType: string; value: unknown };

interface AlterationApplicationData {
    item: ItemPF2e | ItemSourcePF2e;
    rule: RuleElement;
    fromEquipment: boolean;
    alteration: MaybeAlterationData;
}

const ITEM_ALTERATION_HANDLERS = {
    "ac-bonus": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["armor", "shield"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"],
            }),
            value: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                positive: true,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            const item = data.item;
            const mode = data.alteration.mode;
            const newValue = AELikeRuleElement.getNewValue(mode, item.system.acBonus, data.alteration.value);
            const itemBonus = itemIsOfType(item, "armor") && mode === "override" ? item.system.runes.potency : 0;
            item.system.acBonus = Math.max(newValue, 0) + itemBonus;
            adjustCreatureShieldData(item);
        },
    }),
    "area-size": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["spell"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "subtract", "upgrade", "downgrade", "override"],
            }),
            value: new fields.NumberField({
                required: true,
                nullable: false,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data) || !data.item.system.area) return;
            const mode = data.alteration.mode;
            const newValue = AELikeRuleElement.getNewValue(mode, data.item.system.area.value, data.alteration.value);
            const nearestFive = Math.floor(newValue / 5) * 5;
            data.item.system.area.value = Math.max(nearestFive, 5);
        },
    }),
    "badge-max": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["effect"] }),
            mode: new fields.StringField({ required: true, choices: ["downgrade", "override"] }),
            value: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                positive: true,
                initial: undefined,
            } as const),
        },
        validateForItem: itemHasCounterBadge,
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            const effect = data.item;
            const badge = effect.system.badge;
            if (badge?.type !== "counter" || typeof badge.value !== "number" || typeof badge.max !== "number") {
                return;
            }

            const mode = data.alteration.mode;
            const newValue = AELikeRuleElement.getNewValue(mode, badge.max, data.alteration.value);
            const hardMax = badge.labels?.length ?? newValue;
            const min = badge.min ?? 0;
            badge.max = Math.clamp(newValue, min, hardMax);
            badge.value = Math.clamp(badge.value, min, badge.max) || 0;
        },
    }),
    "badge-value": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["condition", "effect"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"],
            }),
            value: new fields.NumberField({
                required: true,
                integer: true,
                nullable: false,
                positive: true,
                initial: undefined,
            } as const),
        },
        validateForItem: itemHasCounterBadge,
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            const effect = data.item;
            const badge = itemIsOfType(effect, "condition")
                ? effect.system.value
                : (effect.system.badge ?? { value: 0 });
            if (typeof badge.value !== "number") return;
            const newValue = AELikeRuleElement.getNewValue(data.alteration.mode, badge.value, data.alteration.value);
            const max = "max" in badge ? (badge.max ?? Infinity) : Infinity;
            const min = "min" in badge ? (badge.min ?? 0) : 0;
            badge.value = Math.clamp(newValue, min, max) || 0;
        },
    }),
    bulk: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
            mode: new fields.StringField({ required: true, choices: ["override"] }),
            value: new StrictNumberField<number, number, true, false, false>({
                required: true,
                nullable: false,
                choices: [0, 0.1, ...Array.fromRange(100, 1)],
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            data.alteration.value = Number(data.alteration.value) || 0;
            if (!this.isValid(data)) return;
            data.item.system.bulk.value = data.alteration.value;
            if (data.item instanceof ItemPF2e) {
                data.item.system.bulk = prepareBulkData(data.item);
            }
        },
    }),
    category: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["armor"] }),
            mode: new fields.StringField({ required: true, choices: ["override"] }),
            value: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["light", "heavy", "medium"] as const,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data)) {
                data.item.system.category = data.alteration.value;
            }
        },
    }),
    "check-penalty": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: () => ["armor"] }),
            mode: new fields.StringField({
                required: true,
                choices: () => ["add", "downgrade", "override", "remove", "subtract", "upgrade"],
            }),
            value: new StrictNumberField({
                required: true,
                nullable: false,
                integer: true,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            const newValue = AELikeRuleElement.getNewValue(
                data.alteration.mode,
                data.item.system.checkPenalty,
                data.alteration.value,
            );
            data.item.system.checkPenalty = Math.min(newValue, 0);
        },
    }),
    "damage-dice-faces": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["weapon"] }),
            mode: new fields.StringField({ required: true, choices: ["downgrade", "override", "upgrade"] }),
            value: new StrictNumberField<DamageDiceFaces, DamageDiceFaces, true, true, true>({
                required: true,
                nullable: true,
                choices: () => DAMAGE_DICE_FACES,
                initial: null,
            } as const),
        },
        validate: (data) => {
            const hasBasicStructure = R.isPlainObject(data) && "mode" in data && "value" in data;
            if (!hasBasicStructure) return false;

            const validFaces: readonly number[] = DAMAGE_DICE_FACES;
            const valueIsFaceNumber = typeof data.value === "number" && validFaces.includes(data.value);
            if (data.mode === "override" && !valueIsFaceNumber) {
                throw new validation.DataModelValidationError(
                    new validation.DataModelValidationFailure({
                        message: `value: must be 4, 6, 8, 10, or 12 if mode is "override"`,
                    }),
                );
            } else if (tupleHasValue(["upgrade", "downgrade"], data.mode) && data.value !== null) {
                throw new validation.DataModelValidationError(
                    new validation.DataModelValidationFailure({
                        message: `value: must be null or omitted if mode is "${data.mode}"`,
                    }),
                );
            }

            return true;
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data) || !(data.item instanceof ItemPF2e)) {
                return;
            }

            const item = data.item;
            const mode = data.alteration.mode;
            if (!item.system.damage.die) return;
            if (mode === "upgrade" && !item.flags.pf2e.damageFacesUpgraded) {
                item.system.damage.die = nextDamageDieSize({ upgrade: item.system.damage.die });
                item.flags.pf2e.damageFacesUpgraded = true;
            } else if (mode === "downgrade") {
                item.system.damage.die = nextDamageDieSize({ downgrade: item.system.damage.die });
            } else if (mode === "override" && typeof data.alteration.value === "number") {
                if (data.alteration.value > Number(item.system.damage.die.replace("d", ""))) {
                    item.flags.pf2e.damageFacesUpgraded = true;
                }
                item.system.damage.die = `d${data.alteration.value}`;
            }
        },
    }),
    "damage-dice-number": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["weapon"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"],
            }),
            value: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                positive: true,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            const item = data.item;
            if (!item.system.damage.dice) return;
            const newValue = AELikeRuleElement.getNewValue(
                data.alteration.mode,
                item.system.damage.dice,
                data.alteration.value,
            );
            item.system.damage.dice = newValue;
        },
    }),
    "damage-type": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["weapon"] }),
            mode: new fields.StringField({ required: true, choices: ["override"] }),
            value: new fields.StringField({
                required: true,
                nullable: false,
                choices: () => CONFIG.PF2E.damageTypes,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data)) {
                data.item.system.damage.damageType = data.alteration.value;
            }
        },
    }),
    /** The passive defense targeted by an attack spell */
    "defense-passive": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["spell"] }),
            mode: new fields.StringField({ required: true, choices: ["override"] }),
            value: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["ac", "fortitude-dc", "reflex-dc", "will-dc"],
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data) && data.item instanceof ItemPF2e && data.item.system.defense?.passive) {
                data.item.system.defense.passive.statistic = data.alteration.value;
            }
        },
    }),
    description: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({
                required: true,
                nullable: false,
                choices: () => R.keys(CONFIG.PF2E.Item.documentClasses),
                initial: undefined,
            }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "override"],
            }),
            value: new fields.ArrayField<
                DescriptionElementField,
                fields.SourceFromDataField<DescriptionValueField>,
                fields.ModelPropFromDataField<DescriptionValueField>,
                true,
                false,
                false
            >(
                new fields.SchemaField({
                    title: new fields.StringField({
                        required: false,
                        nullable: true,
                        blank: false,
                        initial: null,
                    } as const),
                    text: new fields.StringField({
                        required: true,
                        nullable: false,
                        blank: false,
                        initial: undefined,
                    } as const),
                    divider: new fields.BooleanField({ required: false }),
                    predicate: new PredicateField({ required: false, initial: () => [] }),
                }) satisfies DescriptionElementField,
                { required: true, nullable: false, initial: undefined } as const,
            ) satisfies DescriptionValueField,
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            if (!(data.item instanceof ItemPF2e)) return;
            const contents = this.initialize(this.clean(data.alteration)).value;
            if (data.alteration.mode === "override") {
                data.item.system.description.override = contents;
            } else {
                data.item.system.description.addenda.push({ label: data.rule.label, contents });
            }
        },
    }),
    "dex-cap": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({
                required: true,
                choices: ["armor"],
            }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"],
            }),
            value: new StrictNumberField({
                required: true,
                nullable: false,
                integer: true,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            const mode = data.alteration.mode;
            const newValue = AELikeRuleElement.getNewValue(mode, data.item.system.dexCap, data.alteration.value);
            data.item.system.dexCap = Math.max(newValue, 0);
        },
    }),
    "focus-point-cost": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["spell"] } as const),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "override", "upgrade"],
            }),
            value: new StrictNumberField({
                required: true,
                nullable: false,
                integer: true,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            if (!(data.item instanceof ItemPF2e) || data.item.isRitual) return;
            const newValue = AELikeRuleElement.getNewValue(
                data.alteration.mode,
                data.item.system.cast.focusPoints,
                data.alteration.value,
            );
            data.item.system.cast.focusPoints = (Math.clamp(newValue, 0, 3) || 0) as ZeroToThree;
        },
    }),
    grade: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["armor", "weapon", "shield"] }),
            mode: new fields.StringField({ required: true, choices: ["override", "upgrade"] }),
            value: new fields.StringField<Grade, Grade, true, false>({
                required: true,
                nullable: false,
                choices: () => CONFIG.PF2E.grades,
            }),
        },
        handle: function (data: AlterationApplicationData) {
            const abpEnabled = game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(data.rule.actor);
            if ((abpEnabled && data.fromEquipment) || !this.isValid(data)) return;

            const item = data.item;
            const previousGrade = item.system.grade;
            if (!previousGrade) return; // do nothing on non-tech weapons without erroring

            // Get item, and exit early if there isn't a grade change.
            const mode = data.alteration.mode;
            const isGradeBetter =
                CONFIG.PF2E.weaponImprovements[data.alteration.value].level >
                CONFIG.PF2E.weaponImprovements[previousGrade].level;
            if (mode === "upgrade" && !isGradeBetter) return;

            item.system.grade = data.alteration.value;
            if (item instanceof ItemPF2e) {
                if (item.isOfType("weapon")) {
                    const { tracking, dice } = CONFIG.PF2E.weaponImprovements[data.alteration.value];
                    if (tracking) addOrUpgradeTrait(item.system.traits, `tracking-${tracking}`, { mode });
                    item.system.damage.dice = dice;
                } else if (item.isOfType("armor")) {
                    const { bonus: previousBonus } = CONFIG.PF2E.armorImprovements[previousGrade];
                    const { bonus, resilient } = CONFIG.PF2E.armorImprovements[data.alteration.value];
                    if (resilient) addOrUpgradeTrait(item.system.traits, `resilient-${resilient}`, { mode });
                    item.system.acBonus = Math.max(0, item.system.acBonus + bonus - previousBonus);
                } else if (item.isOfType("shield")) {
                    const { hardness: prevHardness, maxHP: prevMaxHP } = CONFIG.PF2E.shieldImprovements[previousGrade];
                    const { hardness, maxHP } = CONFIG.PF2E.shieldImprovements[data.alteration.value];
                    item.system.hardness = Math.max(0, item.system.hardness + hardness - prevHardness);
                    item.system.hp.max = Math.max(1, item.system.hp.max + maxHP - prevMaxHP);
                    item.system.hp.brokenThreshold = Math.floor(item.system.hp.max / 2);
                    adjustCreatureShieldData(item);
                }

                data.item.name = game.pf2e.system.generateItemName(item);
            }
        },
    }),
    group: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["armor", "weapon"] }),
            mode: new fields.StringField({ required: true, choices: ["override"] }),
            value: new fields.StringField({
                required: true,
                nullable: false,
                initial: undefined,
            } as const),
        },
        validateForItem: (item, alteration): validation.DataModelValidationFailure | void => {
            const group = alteration.value;
            if (item.type === "armor") {
                if (group !== null && !objectHasKey(CONFIG.PF2E.armorGroups, group)) {
                    return new validation.DataModelValidationFailure({
                        message: `${group} is not a valid armor group`,
                    });
                }
            } else if (item.type === "weapon") {
                if (group !== null && !objectHasKey(CONFIG.PF2E.weaponGroups, group)) {
                    return new validation.DataModelValidationFailure({
                        message: `${group} is not a valid weapon group`,
                    });
                }

                const weapon = item as WeaponPF2e;

                const rangedOnlyTraits = ["combination", "thrown"] as const;
                const hasRangedOnlyTraits =
                    rangedOnlyTraits.some((trait) => weapon.traits.has(trait)) ||
                    weapon.traits.some((trait) => /^volley-\d+$/.test(trait));
                const hasMeleeOnlyTraits = weapon.traits.some((trait) => /^thrown-\d+$/.test(trait));

                const alterIsMandatoryRanged = setHasElement(MANDATORY_RANGED_GROUPS, group) || hasRangedOnlyTraits;
                const originalIsMandatoryRanged =
                    setHasElement(MANDATORY_RANGED_GROUPS, weapon.system.group) || hasRangedOnlyTraits;

                const alterIsMandatoryMelee = !alterIsMandatoryRanged && hasMeleeOnlyTraits;
                const originalIsMandatoryMelee = !originalIsMandatoryRanged && hasMeleeOnlyTraits;

                if (alterIsMandatoryMelee !== originalIsMandatoryMelee) {
                    return new validation.DataModelValidationFailure({
                        message: `Cannot alter ${weapon.system.group} into ${group} because of melee only traits.`,
                    });
                } else if (alterIsMandatoryRanged !== originalIsMandatoryRanged) {
                    return new validation.DataModelValidationFailure({
                        message: `Cannot alter ${weapon.system.group} into ${group} because one is ranged only.`,
                    });
                }
            }
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data)) {
                const system: { group: string | null } = data.item.system;
                system.group = data.alteration.value;
            }
        },
    }),
    hardness: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "multiply", "override", "remove", "subtract", "upgrade"],
            }),
            value: new fields.NumberField({ required: true, nullable: false, min: -100, max: 100 } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data)) {
                const system = data.item.system;
                const value = data.alteration.value;
                const newValue = AELikeRuleElement.getNewValue(data.alteration.mode, system.hardness, value);
                system.hardness = Math.max(Math.trunc(newValue), 0);
                adjustCreatureShieldData(data.item);
            }
        },
    }),
    "hp-max": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "multiply", "override", "remove", "subtract", "upgrade"],
            }),
            value: new fields.NumberField({
                required: true,
                nullable: false,
                positive: true,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data)) {
                const hp = data.item.system.hp;
                const value = data.alteration.value;
                const newValue = AELikeRuleElement.getNewValue(data.alteration.mode, hp.max, value);
                hp.max = Math.max(Math.trunc(newValue), 1);
                if ("brokenThreshold" in hp) {
                    hp.brokenThreshold = Math.floor(hp.max / 2);
                }
                adjustCreatureShieldData(data.item);
            }
        },
    }),
    "material-type": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
            mode: new fields.StringField({ required: true, choices: ["override"] }),
            value: new fields.StringField({
                required: true,
                nullable: false,
                choices: Array.from(PRECIOUS_MATERIAL_TYPES),
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data)) {
                data.item.system.material.type = data.alteration.value;
                data.item.system.material.grade = "standard";
                // If this is a constructed item, have the displayed name reflect the new material
                if ("_source" in data.item) {
                    data.item.name = game.pf2e.system.generateItemName(data.item);
                }
            }
        },
    }),
    "pd-recovery-dc": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["condition"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"],
            }),
            value: new fields.NumberField({
                required: true,
                integer: true,
                nullable: false,
                positive: true,
                initial: undefined,
            } as const),
        },
        validateForItem(item): validation.DataModelValidationFailure | void {
            if (item.system.slug !== "persistent-damage") {
                return new validation.DataModelValidationFailure({
                    message: "item must be a persistent damage condition",
                });
            }
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data) && data.item.system.persistent) {
                const persistent = data.item.system.persistent;
                const mode = data.alteration.mode;
                const newValue = AELikeRuleElement.getNewValue(mode, persistent.dc, data.alteration.value);
                persistent.dc = Math.max(newValue, 0);
            }
        },
    }),
    "persistent-damage": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["condition"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["override"],
            }),
            value: new fields.SchemaField<PersistentDamageValueSchema>(
                {
                    formula: new fields.StringField({
                        required: true,
                        blank: false,
                        validate: (value: unknown) => DamageRoll.validate(String(value)),
                    }),
                    damageType: new fields.StringField({
                        required: true,
                        choices: () => CONFIG.PF2E.damageTypes,
                    }),
                    dc: new fields.NumberField({
                        required: true,
                        integer: true,
                        positive: true,
                        nullable: false,
                        initial: 15,
                    }),
                    criticalHit: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                },
                { nullable: false } as const,
            ),
        },
        validateForItem(item): validation.DataModelValidationFailure | void {
            if (item.system.slug !== "persistent-damage") {
                return new validation.DataModelValidationFailure({
                    message: "item must be a persistent damage condition",
                });
            }
        },
        handle: function (data: AlterationApplicationData) {
            const pdObject = R.isPlainObject(data.alteration.value) ? data.alteration.value : { dc: NaN };
            const dc = Math.trunc(Math.abs(Number(pdObject?.dc) || 15));
            data.alteration.value = { ...pdObject, dc };
            data.alteration = this.clean(data.alteration);
            if (this.isValid(data)) {
                data.item.system.persistent = this.initialize(data.alteration).value;
            }
        },
    }),
    rarity: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
            mode: new fields.StringField({ required: true, choices: ["override"] }),
            value: new fields.StringField({
                required: true,
                nullable: false,
                choices: RARITIES,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data)) {
                data.item.system.traits.rarity = data.alteration.value;
            }
        },
    }),
    "range-increment": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["weapon"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "multiply", "override", "remove", "subtract"],
            }),
            value: new fields.NumberField({
                required: true,
                nullable: false,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            if (!data.item.system.range) return;
            const rangeIncrement = data.item.system.range;
            const newValue = AELikeRuleElement.getNewValue(data.alteration.mode, rangeIncrement, data.alteration.value);
            data.item.system.range = newValue as WeaponRangeIncrement;
        },
    }),
    "range-max": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["weapon"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "multiply", "override", "remove", "subtract"],
            }),
            value: new fields.NumberField({
                required: true,
                nullable: false,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            if (!data.item.system.maxRange) return;
            const maxRange = data.item.system.maxRange;
            const newValue = AELikeRuleElement.getNewValue(data.alteration.mode, maxRange, data.alteration.value);
            data.item.system.maxRange = newValue;
        },
    }),
    "frequency-max": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["action", "feat"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "multiply", "override", "remove", "subtract", "upgrade"],
            }),
            value: new fields.NumberField({ required: true, integer: true, nullable: false, positive: true } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            data.item.system.frequency ??= { value: undefined, max: 1, per: "day" };
            const frequency = data.item.system.frequency;
            const mode = data.alteration.mode;
            const newValue = AELikeRuleElement.getNewValue(mode, frequency.max, data.alteration.value);
            frequency.max = newValue;
            frequency.value = Math.clamp(frequency.value ?? newValue, 0, newValue);
        },
    }),
    "frequency-per": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["action", "feat"] }),
            mode: new fields.StringField({
                required: true,
                choices: ["downgrade", "override", "upgrade"],
            }),
            value: new fields.StringField({
                required: true,
                nullable: false,
                choices: () => Object.keys(CONFIG.PF2E.frequencies),
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            data.item.system.frequency ??= { value: undefined, max: 1, per: "day" };
            const mode = data.alteration.mode;
            const newValue = getNewInterval(mode, data.item.system.frequency.per, data.alteration.value);
            if (newValue instanceof validation.DataModelValidationFailure) {
                throw newValue.asError();
            }
            data.item.system.frequency.per = newValue;
        },
    }),
    "other-tags": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({
                required: true,
                choices: () => R.keys(CONFIG.PF2E.Item.documentClasses),
            }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "subtract", "remove"],
            }),
            value: new SlugField({
                required: true,
                nullable: false,
                blank: false,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            const otherTags: string[] = data.item.system.traits.otherTags;
            const newValue = AELikeRuleElement.getNewValue(data.alteration.mode, otherTags, data.alteration.value);
            if (newValue instanceof validation.DataModelValidationFailure) {
                throw newValue.asError();
            }
            if (data.alteration.mode === "add") {
                if (!otherTags.includes(newValue)) otherTags.push(newValue);
            } else if (["subtract", "remove"].includes(data.alteration.mode)) {
                otherTags.splice(otherTags.indexOf(newValue), 1);
            }
        },
    }),
    name: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true }),
            mode: new fields.StringField({ required: true, choices: ["override"] }),
            value: new fields.StringField({ required: true, nullable: false, blank: false } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (this.isValid(data)) {
                data.item.name = game.i18n.localize(data.alteration.value);
            }
        },
    }),
    "runes-potency": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["weapon", "armor"] }),
            mode: new fields.StringField({ required: true, choices: ["upgrade", "override"] }),
            value: new fields.NumberField({ required: true, nullable: false, min: 0, max: 4, integer: true } as const),
        },
        handle: function (data: AlterationApplicationData) {
            const abpEnabled = game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(data.rule.actor);
            if ((abpEnabled && data.fromEquipment) || !this.isValid(data)) return;

            const mode = data.alteration.mode;
            const runes = data.item.system.runes;
            const previousValue = runes.potency;
            data.item.system.runes.potency = Math.clamp(
                AELikeRuleElement.getNewValue(mode, data.item.system.runes.potency, data.alteration.value),
                0,
                4,
            ) as ZeroToFour;

            if (data.item instanceof ItemPF2e && data.item.system.runes.potency !== previousValue) {
                // If a weapon or armor gains a potency rune, it becomes magical
                if (!data.item.isMagical && data.item.system.runes.potency > previousValue) {
                    data.item.system.traits.value.push("magical");
                }

                if (data.item.isOfType("armor") && data.item.isInvested !== false) {
                    data.item.system.acBonus += data.item.system.runes.potency - previousValue;
                }

                // If this is a constructed item, have the displayed name reflect the new rune
                data.item.name = game.pf2e.system.generateItemName(data.item);
            }
        },
    }),
    "runes-resilient": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["armor"] }),
            mode: new fields.StringField({ required: true, choices: ["upgrade", "override"] }),
            value: new fields.NumberField({ required: true, nullable: false, min: 0, max: 4, integer: true } as const),
        },
        handle: function (data: AlterationApplicationData) {
            const abpEnabled = game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(data.rule.actor);
            if ((abpEnabled && data.fromEquipment) || !this.isValid(data)) return;

            const previousValue = data.item.system.runes.resilient;
            data.item.system.runes.resilient = Math.clamp(
                AELikeRuleElement.getNewValue(data.alteration.mode, previousValue, data.alteration.value),
                0,
                4,
            ) as ZeroToFour;

            // If this is a constructed item, have the displayed name reflect the new rune
            if (data.item instanceof ItemPF2e && data.item.system.runes.resilient !== previousValue) {
                data.item.name = game.pf2e.system.generateItemName(data.item);
            }
        },
    }),
    "runes-striking": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({ required: true, choices: ["weapon"] }),
            mode: new fields.StringField({ required: true, choices: ["upgrade", "override"] }),
            value: new fields.NumberField({ required: true, nullable: false, min: 0, max: 4, integer: true } as const),
        },
        handle: function (data: AlterationApplicationData) {
            const abpEnabled = game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(data.rule.actor);
            if ((abpEnabled && data.fromEquipment) || !this.isValid(data)) return;

            const previousValue = data.item.system.runes.striking;
            data.item.system.runes.striking = Math.clamp(
                AELikeRuleElement.getNewValue(data.alteration.mode, previousValue, data.alteration.value),
                0,
                4,
            ) as ZeroToFour;

            // Update number of damage dice if the value changed
            // If this is a constructed item, have the displayed name reflect the new rune
            if (data.item instanceof ItemPF2e && data.item.system.runes.striking !== previousValue) {
                data.item.system.damage.dice = 1 + data.item.system.runes.striking;
                data.item.name = game.pf2e.system.generateItemName(data.item);
            }
        },
    }),
    "speed-penalty": new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({
                required: true,
                choices: ["armor", "shield"],
            }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"],
            }),
            value: new StrictNumberField({
                required: true,
                nullable: false,
                integer: true,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            const newValue = AELikeRuleElement.getNewValue(
                data.alteration.mode,
                data.item.system.speedPenalty,
                data.alteration.value,
            );
            data.item.system.speedPenalty = Math.min(newValue, 0);
        },
    }),
    strength: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({
                required: true,
                choices: ["armor"],
            }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"],
            }),
            value: new StrictNumberField({
                required: true,
                nullable: false,
                integer: true,
                positive: true,
                initial: undefined,
            } as const),
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data) || data.item.system.strength === null) {
                return;
            }
            const newValue = AELikeRuleElement.getNewValue(
                data.alteration.mode,
                data.item.system.strength,
                data.alteration.value,
            );
            data.item.system.strength = Math.max(newValue, -2);
        },
    }),
    traits: new ItemAlterationHandler({
        fields: {
            itemType: new fields.StringField({
                required: true,
                choices: () =>
                    Object.entries(CONFIG.PF2E.Item.documentClasses)
                        .filter(([, I]) => !R.isEmpty(I.validTraits))
                        .map(([t]) => t as Exclude<ItemType, "deity" | "lore" | "spellcastingEntry">),
            }),
            mode: new fields.StringField({
                required: true,
                choices: ["add", "remove", "subtract"],
            }),
            value: new DataUnionField<TraitsValueField, true, false>(
                [
                    new fields.SchemaField({
                        trait: new fields.StringField({ required: true, nullable: false }),
                        annotation: new ResolvableValueField({ required: true, nullable: false }),
                    }) satisfies TraitsValueConfigField,
                    new StrictStringField<string, string, true, false>({
                        required: true,
                        nullable: false,
                        initial: undefined,
                    }),
                ],
                { required: true, nullable: false },
            ),
        },
        validateForItem: (_item, alteration): validation.DataModelValidationFailure | void => {
            if (alteration.mode !== "add" && typeof alteration.value === "object") {
                return new validation.DataModelValidationFailure({
                    message: `cannot be an object when mode is ${alteration.mode}`,
                });
            }
        },
        handle: function (data: AlterationApplicationData) {
            if (!this.isValid(data)) return;
            const resolvedTrait = R.isPlainObject(data.alteration.value)
                ? `${data.alteration.value.trait}-${data.rule.resolveValue(data.alteration.value.annotation)}`
                : data.alteration.value;
            const documentClasses: Record<string, typeof ItemPF2e> = CONFIG.PF2E.Item.documentClasses;
            const validTraits = documentClasses[data.item.type].validTraits;
            if (!objectHasKey(validTraits, resolvedTrait)) {
                throw new validation.DataModelValidationError(`${resolvedTrait} is not a valid choice`);
            }

            const newValue = AELikeRuleElement.getNewValue(
                data.alteration.mode,
                data.item.system.traits.value,
                resolvedTrait,
            );
            if (!newValue) return;
            if (newValue instanceof validation.DataModelValidationFailure) {
                throw newValue.asError();
            }
            if (data.item.system.traits.value) {
                if (data.alteration.mode === "add") {
                    addOrUpgradeTrait(data.item.system.traits, newValue);
                } else if (["subtract", "remove"].includes(data.alteration.mode)) {
                    removeTrait(data.item.system.traits, newValue);
                }
            }
        },
    }),
};

interface AlterationFieldOptions<
    TSchema extends AlterationSchema,
    TSourceProp extends fields.SourceFromSchema<TSchema> = fields.SourceFromSchema<TSchema>,
> extends DataFieldOptions<TSourceProp, true, false, false> {
    validateForItem?: (
        item: ItemPF2e | ItemSourcePF2e,
        alteration: MaybeAlterationData,
    ) => validation.DataModelValidationFailure | void;
    /** Whether this alteration can be used with an `ItemPF2e` instance */
    operableOnInstances?: boolean;
    /** Whether this alteration can be used with item source data */
    operableOnSource?: boolean;
    handle: (this: ItemAlterationHandler<TSchema>, data: AlterationApplicationData) => void;
}

type AlterationSchema = {
    itemType: fields.StringField<ItemType, ItemType, true, false, false>;
    mode: fields.StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    value: fields.DataField<Exclude<JSONValue, undefined>, Exclude<JSONValue, undefined>, true, boolean, boolean>;
};

type DescriptionValueField = fields.ArrayField<
    DescriptionElementField,
    fields.SourceFromDataField<DescriptionElementField>[],
    fields.ModelPropFromDataField<DescriptionElementField>[],
    true,
    false,
    false
>;
type DescriptionElementField = fields.SchemaField<{
    title: fields.StringField<string, string, false, true, true>;
    text: fields.StringField<string, string, true, false, false>;
    divider: fields.BooleanField<boolean, boolean, false, false, true>;
    predicate: PredicateField<false>;
}>;

type TraitsValueField = TraitsValueConfigField | StrictStringField<string, string, true, false>;

type TraitsValueConfigField = fields.SchemaField<{
    trait: fields.StringField<string, string, true, false>;
    annotation: ResolvableValueField<true, false>;
}>;
export { ITEM_ALTERATION_HANDLERS, ItemAlterationHandler };
export type { AlterationApplicationData, AlterationFieldOptions, AlterationSchema };
