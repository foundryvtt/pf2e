import { ItemPF2e } from "@item";
import { ArmorTrait } from "@item/armor/types.ts";
import type { ItemSourcePF2e, ItemType } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { BulkValue } from "@item/physical/types.ts";
import { BULK_VALUES, PHYSICAL_ITEM_TYPES, PRECIOUS_MATERIAL_TYPES } from "@item/physical/values.ts";
import { RARITIES } from "@module/data.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { DamageType } from "@system/damage/types.ts";
import { SlugField, StrictNumberField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import type { DataField, DataFieldOptions, NumberField, StringField } from "types/foundry/common/data/fields.d.ts";
import type { DataModelValidationFailure } from "types/foundry/common/data/validation-failure.d.ts";
import type { AELikeChangeMode } from "../ae-like.ts";

const { fields, validation } = foundry.data;

/** A `SchemaField` reappropriated for validation of specific item alterations */
class ItemAlterationValidator<TDataSchema extends AlterationSchema> extends fields.SchemaField<TDataSchema> {
    #validateForItem?: (item: ItemPF2e | ItemSourcePF2e) => DataModelValidationFailure | void;

    operableOnInstances: boolean;

    operableOnSource: boolean;

    constructor(fields: TDataSchema, options: AlterationFieldOptions<SourceFromSchema<TDataSchema>> = {}) {
        super(fields, options);
        if (options.validateForItem) this.#validateForItem = options.validateForItem;
        this.operableOnInstances = options.operableOnInstances ?? true;
        this.operableOnSource = options.operableOnSource ?? true;
    }

    /**
     * A type-safe affirmation of full validity of an alteration _and_ its applicable to a particular item
     * Errors will bubble all the way up to the originating parent rule element
     */
    isValid(data: { item: ItemPF2e | ItemSourcePF2e; alteration: { itemType: string } }): data is {
        item: ItemOrSource<SourceFromSchema<TDataSchema>["itemType"]>;
        alteration: SourceFromSchema<TDataSchema>;
    } {
        const { item, alteration } = data;
        const failure = this.validate(alteration);
        if (failure) throw new validation.DataModelValidationError(failure);
        if (item.type !== alteration.itemType) return false;
        const forItemFailure = this.#validateForItem?.(item);
        if (forItemFailure) throw new validation.DataModelValidationError(forItemFailure);

        if (!this.operableOnInstances && item instanceof ItemPF2e) {
            throw new validation.DataModelValidationError("may only be applied to source data");
        }

        if (!this.operableOnSource && !(item instanceof ItemPF2e)) {
            throw new validation.DataModelValidationError("may only be applied to existing items");
        }

        return true;
    }
}

type ItemOrSource<TItemType extends ItemType> =
    | InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][TItemType]>
    | InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][TItemType]>["_source"];

const itemHasCounterBadge = (item: ItemPF2e | ItemSourcePF2e): void => {
    const hasBadge = itemIsOfType(item, "condition")
        ? typeof item.system.value.value === "number"
        : itemIsOfType(item, "effect")
        ? item.system.badge?.type === "counter"
        : false;
    if (!hasBadge) {
        throw new foundry.data.validation.DataModelValidationError("effect lacks a badge");
    }
};

const ITEM_ALTERATION_VALIDATORS = {
    "ac-bonus": new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["armor"] }),
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
    "bulk-held-or-stowed": new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: Array.from(PHYSICAL_ITEM_TYPES) }),
        mode: new fields.StringField({ required: true, choices: ["override"] }),
        value: new fields.StringField<BulkValue, BulkValue, true, false, false>({
            required: true,
            nullable: false,
            choices: BULK_VALUES,
            initial: undefined,
        } as const),
    }),
    "bulk-worn": new ItemAlterationValidator({
        itemType: new fields.StringField({ required: true, choices: ["armor", "backpack"] }),
        mode: new fields.StringField({ required: true, choices: ["override"] }),
        value: new fields.StringField<BulkValue, BulkValue, true, false, false>({
            required: true,
            nullable: false,
            choices: BULK_VALUES,
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
    "dex-cap": new ItemAlterationValidator({
        itemType: new fields.StringField({
            required: true,
            choices: ["armor"],
        }),
        mode: new fields.StringField({
            required: true,
            choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"] as const,
        }),
        value: new StrictNumberField({
            required: true,
            nullable: false,
            integer: true,
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
            choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"] as const,
        }),
        value: new StrictNumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: undefined,
        } as const),
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
                    return new foundry.data.validation.DataModelValidationFailure({
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
                    return new foundry.data.validation.DataModelValidationFailure({
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
            choices: ["downgrade", "override", "upgrade"] as const,
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
            choices: ["add", "subtract", "remove"] as const,
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
            choices: ["armor"],
        }),
        mode: new fields.StringField({
            required: true,
            choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"] as const,
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
            choices: ["add", "downgrade", "override", "remove", "subtract", "upgrade"] as const,
        }),
        value: new StrictNumberField({
            required: true,
            nullable: false,
            integer: true,
            positive: true,
            initial: undefined,
        } as const),
    }),
    traits: new ItemAlterationValidator({
        itemType: new fields.StringField({
            required: true,
            choices: ["armor"],
        }),
        mode: new fields.StringField({
            required: true,
            choices: ["add", "remove", "subtract"] as const,
        }),
        value: new fields.StringField<ArmorTrait, ArmorTrait, true, false, false>({
            required: true,
            nullable: false,
            choices: () => CONFIG.PF2E.armorTraits,
            initial: undefined,
        }),
    }),
};

interface AlterationFieldOptions<TSourceProp extends SourceFromSchema<AlterationSchema>>
    extends DataFieldOptions<TSourceProp, true, false, false> {
    validateForItem?: (
        item: ItemPF2e | ItemSourcePF2e,
    ) => asserts item is
        | InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][TSourceProp["itemType"]]>
        | InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][TSourceProp["itemType"]]>["_source"];
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

export { ITEM_ALTERATION_VALIDATORS };
