import type { DataFieldOptions } from "@common/data/_types.d.mts";
import type { ItemPF2e } from "@item";
import type { ItemSourcePF2e, ItemType } from "@item/base/data/index.ts";
import type { ItemTrait } from "@item/base/types.ts";
import type { PersistentDamageValueSchema } from "@item/condition/data.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { PHYSICAL_ITEM_TYPES, PRECIOUS_MATERIAL_TYPES } from "@item/physical/values.ts";
import { MANDATORY_RANGED_GROUPS } from "@item/weapon/values.ts";
import { RARITIES } from "@module/data.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { DamageDiceFaces } from "@system/damage/types.ts";
import { DAMAGE_DICE_FACES } from "@system/damage/values.ts";
import { PredicateField, SlugField, StrictNumberField } from "@system/schema-data-fields.ts";
import { objectHasKey, setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";
import type { AELikeChangeMode } from "../ae-like.ts";
import fields = foundry.data.fields;
import validation = foundry.data.validation;

/** A `SchemaField` reappropriated for validation of specific item alterations */
class ItemAlterationValidator<TSchema extends AlterationSchema> extends fields.SchemaField<TSchema> {
    #validateForItem?: (
        item: ItemPF2e | ItemSourcePF2e,
        alteration: MaybeAlterationData,
    ) => validation.DataModelValidationFailure | void;

    operableOnInstances: boolean;

    operableOnSource: boolean;

    constructor(fields: TSchema, options: AlterationFieldOptions<fields.SourceFromSchema<TSchema>> = {}) {
        super(fields, options);
        if (options.validateForItem) this.#validateForItem = options.validateForItem;
        this.operableOnInstances = options.operableOnInstances ?? true;
        this.operableOnSource = options.operableOnSource ?? true;
    }

    /**
     * A type-safe affirmation of full validity of an alteration _and_ its applicable to a particular item
     * Errors will bubble all the way up to the originating parent rule element
     */
    isValid(data: { item: ItemPF2e | ItemSourcePF2e; alteration: MaybeAlterationData }): data is {
        item: ItemOrSource<fields.SourceFromSchema<TSchema>["itemType"]>;
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

const itemHasCounterBadge = (item: ItemPF2e | ItemSourcePF2e): validation.DataModelValidationFailure | void => {
    const hasBadge = itemIsOfType(item, "condition")
        ? typeof item.system.value.value === "number"
        : itemIsOfType(item, "effect")
          ? item.system.badge?.type === "counter"
          : false;
    if (!hasBadge) {
        return new validation.DataModelValidationFailure({ message: "effect lacks a badge" });
    }
};

const ITEM_ALTERATION_VALIDATORS = {
    "ac-bonus": new ItemAlterationValidator({
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
    }),
    "area-size": new ItemAlterationValidator({
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
    }),
    "badge-max": new ItemAlterationValidator(
        {
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
        { validateForItem: itemHasCounterBadge },
    ),
    "badge-value": new ItemAlterationValidator(
        {
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
        { validateForItem: itemHasCounterBadge },
    ),
    bulk: new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
        mode: new fields.StringField({ required: true, choices: ["override"] }),
        value: new StrictNumberField<number, number, true, false, false>({
            required: true,
            nullable: false,
            choices: [0, 0.1, ...Array.fromRange(100, 1)],
            initial: undefined,
        } as const),
    }),
    category: new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["armor"] }),
        mode: new fields.StringField({ required: true, choices: ["override"] }),
        value: new fields.StringField({
            required: true,
            nullable: false,
            choices: ["light", "heavy", "medium"] as const,
            initial: undefined,
        } as const),
    }),
    "check-penalty": new ItemAlterationValidator({
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
    }),
    "damage-dice-faces": new ItemAlterationValidator(
        {
            itemType: new fields.StringField({ required: true, choices: ["weapon"] }),
            mode: new fields.StringField({ required: true, choices: ["downgrade", "override", "upgrade"] }),
            value: new StrictNumberField<DamageDiceFaces, DamageDiceFaces, true, true, true>({
                required: true,
                nullable: true,
                choices: () => DAMAGE_DICE_FACES,
                initial: null,
            } as const),
        },
        {
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
        },
    ),
    "damage-dice-number": new ItemAlterationValidator({
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
    }),
    "damage-type": new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["weapon"] }),
        mode: new fields.StringField({ required: true, choices: ["override"] }),
        value: new fields.StringField({
            required: true,
            nullable: false,
            choices: () => CONFIG.PF2E.damageTypes,
        } as const),
    }),
    /** The passive defense targeted by an attack spell */
    "defense-passive": new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["spell"] }),
        mode: new fields.StringField({ required: true, choices: ["override"] }),
        value: new fields.StringField({
            required: true,
            nullable: false,
            choices: ["ac", "fortitude-dc", "reflex-dc", "will-dc"],
        } as const),
    }),
    description: new ItemAlterationValidator({
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
    }),
    "dex-cap": new ItemAlterationValidator({
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
    }),
    "focus-point-cost": new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["spell"] } as const),
        mode: new fields.StringField({
            required: true,
            choices: ["add", "override", "upgrade"],
        }),
        value: new StrictNumberField({ required: true, nullable: false, integer: true, initial: undefined } as const),
    }),
    group: new ItemAlterationValidator(
        {
            itemType: new fields.StringField({ required: true, choices: ["armor", "weapon"] }),
            mode: new fields.StringField({ required: true, choices: ["override"] }),
            value: new fields.StringField({
                required: true,
                nullable: false,
                initial: undefined,
            } as const),
        },
        {
            validateForItem: (item, alteration): validation.DataModelValidationFailure | void => {
                const group = alteration.value;
                if (itemIsOfType(item, "armor")) {
                    if (group !== null && !objectHasKey(CONFIG.PF2E.armorGroups, group)) {
                        return new validation.DataModelValidationFailure({
                            message: `${group} is not a valid armor group`,
                        });
                    }
                } else if (itemIsOfType(item, "weapon")) {
                    if (group !== null && !objectHasKey(CONFIG.PF2E.weaponGroups, group)) {
                        return new validation.DataModelValidationFailure({
                            message: `${group} is not a valid weapon group`,
                        });
                    }

                    const rangedOnlyTraits = ["combination", "thrown"] as const;
                    const hasRangedOnlyTraits =
                        rangedOnlyTraits.some((t) => item.system.traits.value.includes(t)) ||
                        item.system.traits.value.some((t) => /^volley-\d+$/.test(t));
                    const hasMeleeOnlyTraits = item.system.traits.value.some((t) => /^thrown-\d+$/.test(t));
                    const alterIsMandatoryRanged = setHasElement(MANDATORY_RANGED_GROUPS, group) || hasRangedOnlyTraits;
                    const originalIsMandatoryRanged =
                        setHasElement(MANDATORY_RANGED_GROUPS, item.system.group) || hasRangedOnlyTraits;
                    const alterIsMandatoryMelee = !alterIsMandatoryRanged && hasMeleeOnlyTraits;
                    const originalIsMandatoryMelee = !originalIsMandatoryRanged && hasMeleeOnlyTraits;

                    if (alterIsMandatoryMelee !== originalIsMandatoryMelee) {
                        return new validation.DataModelValidationFailure({
                            message: `Cannot alter ${item.system.group} into ${group} because of melee-only traits.`,
                        });
                    } else if (alterIsMandatoryRanged !== originalIsMandatoryRanged) {
                        return new validation.DataModelValidationFailure({
                            message: `Cannot alter ${item.system.group} into ${group} because one is ranged only.`,
                        });
                    }
                }
            },
        },
    ),
    hardness: new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
        mode: new fields.StringField({
            required: true,
            choices: ["add", "downgrade", "multiply", "override", "remove", "subtract", "upgrade"],
        }),
        value: new fields.NumberField({ required: true, nullable: false, min: -100, max: 100 } as const),
    }),
    "hp-max": new ItemAlterationValidator({
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
    }),
    "material-type": new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
        mode: new fields.StringField({ required: true, choices: ["override"] }),
        value: new fields.StringField({
            required: true,
            nullable: false,
            choices: Array.from(PRECIOUS_MATERIAL_TYPES),
            initial: undefined,
        } as const),
    }),
    "pd-recovery-dc": new ItemAlterationValidator(
        {
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
        {
            validateForItem(item): validation.DataModelValidationFailure | void {
                if (item.system.slug !== "persistent-damage") {
                    return new validation.DataModelValidationFailure({
                        message: "item must be a persistent damage condition",
                    });
                }
            },
        },
    ),
    "persistent-damage": new ItemAlterationValidator(
        {
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
        {
            validateForItem(item): validation.DataModelValidationFailure | void {
                if (item.system.slug !== "persistent-damage") {
                    return new validation.DataModelValidationFailure({
                        message: "item must be a persistent damage condition",
                    });
                }
            },
        },
    ),
    rarity: new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
        mode: new fields.StringField({ required: true, choices: ["override"] }),
        value: new fields.StringField({
            required: true,
            nullable: false,
            choices: RARITIES,
        } as const),
    }),
    "range-increment": new ItemAlterationValidator({
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
    }),
    "range-max": new ItemAlterationValidator({
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
    }),
    "frequency-max": new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["action", "feat"] }),
        mode: new fields.StringField({
            required: true,
            choices: ["add", "downgrade", "multiply", "override", "remove", "subtract", "upgrade"],
        }),
        value: new fields.NumberField({ required: true, integer: true, nullable: false, positive: true } as const),
    }),
    "frequency-per": new ItemAlterationValidator({
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
    }),
    "other-tags": new ItemAlterationValidator({
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
    }),
    name: new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true }),
        mode: new fields.StringField({ required: true, choices: ["override"] }),
        value: new fields.StringField({ required: true, nullable: false, blank: false } as const),
    }),
    potency: new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["weapon", "armor"] }),
        mode: new fields.StringField({ required: true, choices: ["upgrade", "override"] }),
        value: new fields.NumberField({ required: true, nullable: false, min: 0, max: 4, integer: true } as const),
    }),
    resilient: new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["armor"] }),
        mode: new fields.StringField({ required: true, choices: ["upgrade", "override"] }),
        value: new fields.NumberField({ required: true, nullable: false, min: 0, max: 4, integer: true } as const),
    }),
    "speed-penalty": new ItemAlterationValidator({
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
    }),
    strength: new ItemAlterationValidator({
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
    }),
    striking: new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["weapon"] }),
        mode: new fields.StringField({ required: true, choices: ["upgrade", "override"] }),
        value: new fields.NumberField({ required: true, nullable: false, min: 0, max: 4, integer: true } as const),
    }),
    traits: new ItemAlterationValidator(
        {
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
            value: new fields.StringField<ItemTrait, ItemTrait, true, false, false>({
                required: true,
                nullable: false,
                initial: undefined,
            }),
        },
        {
            validateForItem: (item, alteration): validation.DataModelValidationFailure | void => {
                const documentClasses: Record<string, typeof ItemPF2e> = CONFIG.PF2E.Item.documentClasses;
                const validTraits = documentClasses[item.type].validTraits;
                const value = alteration.value;
                if (typeof value !== "string" || !(value in validTraits)) {
                    return new validation.DataModelValidationFailure({
                        message: `${alteration.value} is not a valid choice`,
                    });
                }
            },
        },
    ),
};

interface AlterationFieldOptions<TSourceProp extends fields.SourceFromSchema<AlterationSchema>>
    extends DataFieldOptions<TSourceProp, true, false, false> {
    validateForItem?: (
        item: ItemPF2e | ItemSourcePF2e,
        alteration: MaybeAlterationData,
    ) => validation.DataModelValidationFailure | void;
    /** Whether this alteration can be used with an `ItemPF2e` instance */
    operableOnInstances?: boolean;
    /** Whether this alteration can be used with item source data */
    operableOnSource?: boolean;
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

export { ITEM_ALTERATION_VALIDATORS };
