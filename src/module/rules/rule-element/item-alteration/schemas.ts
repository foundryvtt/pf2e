import type { ItemPF2e } from "@item";
import type { ItemSourcePF2e, ItemType } from "@item/base/data/index.ts";
import type { ItemTrait } from "@item/base/types.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { PHYSICAL_ITEM_TYPES, PRECIOUS_MATERIAL_TYPES } from "@item/physical/values.ts";
import { RARITIES } from "@module/data.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { DamageType } from "@system/damage/types.ts";
import { PredicateField, SlugField, StrictNumberField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import type {
    ArrayField,
    BooleanField,
    DataField,
    DataFieldOptions,
    ModelPropFromDataField,
    NumberField,
    SchemaField,
    SourcePropFromDataField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import type { DataModelValidationFailure } from "types/foundry/common/data/validation-failure.d.ts";
import type { AELikeChangeMode } from "../ae-like.ts";

const { fields, validation } = foundry.data;

/** A `SchemaField` reappropriated for validation of specific item alterations */
class ItemAlterationValidator<TSchema extends AlterationSchema> extends fields.SchemaField<TSchema> {
    #validateForItem?: (
        item: ItemPF2e | ItemSourcePF2e,
        alteration: MaybeAlterationData,
    ) => DataModelValidationFailure | void;

    operableOnInstances: boolean;

    operableOnSource: boolean;

    constructor(fields: TSchema, options: AlterationFieldOptions<SourceFromSchema<TSchema>> = {}) {
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
        item: ItemOrSource<SourceFromSchema<TSchema>["itemType"]>;
        alteration: SourceFromSchema<TSchema>;
    } {
        const { item, alteration } = data;
        const failure = this.validate(alteration);
        if (failure) throw new validation.DataModelValidationError(failure);
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
    | InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][TItemType]>
    | InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][TItemType]>["_source"];

type MaybeAlterationData = { mode: string; itemType: string; value: unknown };

const itemHasCounterBadge = (item: ItemPF2e | ItemSourcePF2e): DataModelValidationFailure | void => {
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
            choices: () => R.keys.strict(CONFIG.PF2E.Item.documentClasses),
            initial: undefined,
        }),
        mode: new fields.StringField({
            required: true,
            choices: ["add", "override"],
        }),
        value: new fields.ArrayField<
            DescriptionElementField,
            SourcePropFromDataField<DescriptionValueField>,
            ModelPropFromDataField<DescriptionValueField>,
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
                predicate: new PredicateField({ required: false }),
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
    hardness: new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
        mode: new fields.StringField({
            required: true,
            choices: ["add", "downgrade", "multiply", "override", "remove", "subtract", "upgrade"],
        }),
        value: new fields.NumberField({ required: true, integer: true, nullable: false, positive: true } as const),
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
            validateForItem(item): DataModelValidationFailure | void {
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
                },
                { nullable: false } as const,
            ),
        },
        {
            validateForItem(item): DataModelValidationFailure | void {
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
            choices: () => R.keys.strict(CONFIG.PF2E.Item.documentClasses),
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
            validateForItem: (item, alteration): DataModelValidationFailure | void => {
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

interface AlterationFieldOptions<TSourceProp extends SourceFromSchema<AlterationSchema>>
    extends DataFieldOptions<TSourceProp, true, false, false> {
    validateForItem?: (
        item: ItemPF2e | ItemSourcePF2e,
        alteration: MaybeAlterationData,
    ) => DataModelValidationFailure | void;
    /** Whether this alteration can be used with an `ItemPF2e` instance */
    operableOnInstances?: boolean;
    /** Whether this alteration can be used with item source data */
    operableOnSource?: boolean;
}

type AlterationSchema = {
    itemType: StringField<ItemType, ItemType, true, false, false>;
    mode: StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    value: DataField<JSONValue, unknown, true, boolean, boolean>;
};

type PersistentDamageValueSchema = {
    formula: StringField<string, string, true, false, false>;
    damageType: StringField<DamageType, DamageType, true, false, false>;
    dc: NumberField<number, number, true, false, true>;
};

type DescriptionValueField = ArrayField<
    DescriptionElementField,
    SourcePropFromDataField<DescriptionElementField>[],
    ModelPropFromDataField<DescriptionElementField>[],
    true,
    false,
    false
>;
type DescriptionElementField = SchemaField<{
    title: StringField<string, string, false, true, true>;
    text: StringField<string, string, true, false, false>;
    divider: BooleanField<boolean, boolean, false, false, true>;
    predicate: PredicateField<false>;
}>;

export { ITEM_ALTERATION_VALIDATORS };
