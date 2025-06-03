import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type { ImageFilePath } from "@common/constants.d.mts";
import { ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.mjs";
import { ItemSystemModel, type ItemSystemSchema } from "@item/base/data/model.ts";
import type { ItemDescriptionData, ItemSystemSource } from "@item/base/data/system.ts";
import { ITEM_CARRY_TYPES } from "@item/base/data/values.ts";
import { ItemSize } from "@item/types.ts";
import { type ZeroToTwo } from "@module/data.ts";
import { RarityField } from "@module/model.ts";
import { PrunedSchemaField, SlugField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import {
    Coins,
    EquippedData,
    type BulkData,
    type IdentificationData,
    type IdentificationStatus,
    type ItemCarryType,
    type ItemMaterialData,
    type PhysicalItemHitPoints,
    type PhysicalItemPF2e,
    type PhysicalItemTrait,
    type PhysicalItemTraits,
    type PreciousMaterialGrade,
    type PreciousMaterialType,
    type Price,
    type UsageDetails,
} from "./index.ts";
import { COIN_DENOMINATIONS, PRECIOUS_MATERIAL_TYPES } from "./values.ts";
import fields = foundry.data.fields;

class PriceField extends fields.SchemaField<PriceSchema, fields.SourceFromSchema<PriceSchema>, Price> {
    constructor() {
        const denominationField = (): fields.NumberField<number, number, false, false, false> =>
            new fields.NumberField({ required: false, nullable: false, integer: true, min: 0 });
        super({
            value: new PrunedSchemaField(
                R.mapToObj(COIN_DENOMINATIONS.toReversed(), (d) => [d, denominationField()]),
                { required: true, nullable: false },
            ),
            per: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                positive: true,
                initial: 1,
            }),
            sizeSensitive: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
        });
    }

    override initialize(source: fields.SourceFromSchema<PriceSchema>): Price {
        const initialized = super.initialize(source);
        initialized.value = new Coins(initialized.value);
        initialized.sizeSensitive ??= false;
        return initialized;
    }
}

class ApexField extends fields.SchemaField<
    ApexSchema,
    fields.SourceFromSchema<ApexSchema>,
    fields.ModelPropsFromSchema<ApexSchema>,
    true,
    true,
    true
> {
    constructor() {
        super(
            {
                attribute: new fields.StringField({
                    choices: [...ATTRIBUTE_ABBREVIATIONS],
                    required: true,
                    nullable: false,
                    initial: "str",
                }),
                selected: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            },
            { required: true, nullable: true, initial: null },
        );
    }
}

/** Base system model for physical items. */
abstract class PhysicalItemSystemModel<
    TItem extends PhysicalItemPF2e,
    TSchema extends PhysicalItemSystemSchema,
> extends ItemSystemModel<TItem, TSchema> {
    declare traits: PhysicalItemTraits<PhysicalItemTrait>;

    declare usage: UsageDetails;

    static override defineSchema(): PhysicalItemSystemSchema {
        const unidentifiedImg: ImageFilePath = `systems/${SYSTEM_ID}/icons/unidentified_item_icons/adventuring_gear.webp`;
        return {
            ...super.defineSchema(),
            baseItem: new fields.StringField({ required: true, nullable: true, initial: null }),
            bulk: new fields.SchemaField({
                value: new fields.NumberField({
                    required: true,
                    nullable: false,
                    min: 0,
                    max: 1000,
                    initial: 0.1,
                    validate: (v) => typeof v === "number" && (v === 0.1 || Number.isInteger(v)),
                }),
            }),
            containerId: new fields.StringField({
                required: true,
                nullable: true,
                blank: false,
                validate: (v) => typeof v === "string" && foundry.data.validators.isValidId(v),
            }),
            equipped: new fields.SchemaField({
                carryType: new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: ITEM_CARRY_TYPES,
                    initial: "worn",
                }),
                // todo: check if the below are required, treasure didn't have it
                inSlot: new fields.BooleanField({ required: false, nullable: false }),
                handsHeld: new fields.NumberField({ required: false, nullable: false, min: 0, max: 2, integer: true }),
                invested: new fields.BooleanField({ required: false, nullable: true, initial: null }),
            }),
            hardness: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
            hp: new fields.SchemaField({
                max: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
                value: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
            }),
            identification: new fields.SchemaField({
                status: new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: ["identified", "unidentified"],
                    initial: "identified",
                }),
                unidentified: new fields.SchemaField(
                    {
                        img: new fields.FilePathField({
                            required: true,
                            categories: ["IMAGE"],
                            nullable: false,
                            initial: unidentifiedImg,
                        }),
                        name: new fields.StringField({ required: true, nullable: false }),
                        data: new fields.SchemaField({
                            description: new fields.SchemaField({ value: new fields.HTMLField() }),
                        }),
                    },
                    { required: true, nullable: true },
                ),
            }),
            level: new fields.SchemaField({
                value: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    min: 0,
                    max: 30,
                    initial: 0,
                }),
            }),
            material: new fields.SchemaField({
                type: new fields.StringField({
                    required: true,
                    nullable: true,
                    choices: PRECIOUS_MATERIAL_TYPES.values().toArray(),
                }),
                grade: new fields.StringField({ required: true, nullable: true, choices: ["low", "standard", "high"] }),
            }),
            price: new PriceField(),
            quantity: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                initial: 1,
            }),
            size: new fields.StringField({
                required: true,
                choices: ["tiny", "med", "lg", "huge", "grg"],
                initial: "med",
            }),
            temporary: new fields.BooleanField({ required: false }),
        };
    }
}

interface PhysicalItemSystemModel<TItem extends PhysicalItemPF2e, TSchema extends PhysicalItemSystemSchema>
    extends
        ItemSystemModel<TItem, TSchema>,
        Omit<ModelPropsFromSchema<PhysicalItemSystemSchema>, "description" | "equipped"> {
    bulk: BulkData;
    description: ItemDescriptionData;
    equipped: EquippedData;
    hp: PhysicalItemHitPoints;
    identification: IdentificationData;
    material: ItemMaterialData;
    price: Price;
    temporary: boolean;
}

type CoinsSchema = {
    cp: fields.NumberField<number, number, false, false, false>;
    sp: fields.NumberField<number, number, false, false, false>;
    gp: fields.NumberField<number, number, false, false, false>;
    pp: fields.NumberField<number, number, false, false, false>;
};

type PriceSchema = {
    value: PrunedSchemaField<CoinsSchema>;
    per: fields.NumberField<number, number, true, false, true>;
    sizeSensitive: fields.BooleanField<boolean, boolean, false, false, false>;
};

type EquippedDataSchema = {
    carryType: fields.StringField<ItemCarryType, ItemCarryType, true, false>;
    inSlot: fields.BooleanField<boolean, boolean, false, false, false>;
    handsHeld: fields.NumberField<ZeroToTwo, ZeroToTwo, false, false>;
    invested: fields.BooleanField<boolean, boolean, false, true>;
};

type ApexSchema = {
    attribute: fields.StringField<AttributeString, AttributeString, true, false>;
    selected: fields.BooleanField<boolean, boolean, true, false, true>;
};

type PhysicalItemTraitsSchema<T extends PhysicalItemTrait> = {
    value: fields.ArrayField<fields.StringField<T, T, true, false, false>>;
    rarity: RarityField;
    otherTags: fields.ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
};

type PhysicalItemSystemSchema = ItemSystemSchema & {
    baseItem: fields.StringField<string, string, true, true, true>;
    bulk: fields.SchemaField<{ value: fields.NumberField<number, number, true, false, true> }>;
    containerId: fields.StringField<string, string, true, true, true>;
    hardness: fields.NumberField<number, number, true, false, true>;
    hp: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        max: fields.NumberField<number, number, true, false, true>;
    }>;
    equipped: fields.SchemaField<EquippedDataSchema>;
    level: fields.SchemaField<{ value: fields.NumberField<number, number, true, false, true> }>;
    identification: fields.SchemaField<{
        status: fields.StringField<IdentificationStatus, IdentificationStatus, true, false, true>;
        unidentified: fields.SchemaField<
            UnidentifiedSchema,
            fields.SourceFromSchema<UnidentifiedSchema>,
            fields.ModelPropsFromSchema<UnidentifiedSchema>,
            true,
            true,
            true
        >;
    }>;
    material: fields.SchemaField<{
        grade: fields.StringField<PreciousMaterialGrade, PreciousMaterialGrade, true, true, true>;
        type: fields.StringField<PreciousMaterialType, PreciousMaterialType, true, true, true>;
    }>;
    price: PriceField;
    quantity: fields.NumberField<number, number, true, false, true>;
    size: fields.StringField<ItemSize, ItemSize, true, false, true>;
    temporary: fields.BooleanField<boolean, boolean, false, false, false>;
};

type UnidentifiedSchema = {
    name: fields.StringField<string, string, true, false, true>;
    img: fields.FilePathField<ImageFilePath, ImageFilePath, true, false, true>;
    data: fields.SchemaField<{
        description: fields.SchemaField<{
            value: fields.StringField<string, string, true, false, true>;
        }>;
    }>;
};

type PhysicalItemModelOmission =
    | "bulk"
    | "description"
    | "equipped"
    | "hp"
    | "identification"
    | "material"
    | "temporary"
    | "traits"
    | "usage";

type PhysicalItemSystemSource<T extends PhysicalItemSystemSchema = PhysicalItemSystemSchema> = SourceFromSchema<T> & {
    schema?: ItemSystemSource["schema"];
    usage?: { value: string };
};

export { ApexField, PhysicalItemSystemModel, PriceField };
export type { PhysicalItemModelOmission, PhysicalItemSystemSchema, PhysicalItemSystemSource, PhysicalItemTraitsSchema };
