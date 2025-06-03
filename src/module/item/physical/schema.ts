import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type { ImageFilePath } from "@common/constants.d.mts";
import { ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.mjs";
import type { PhysicalItemSource } from "@item/base/data/index.ts";
import { ItemSystemModel, type ItemSystemSchema } from "@item/base/data/model.ts";
import type { ItemSystemSource } from "@item/base/data/system.ts";
import { ITEM_CARRY_TYPES } from "@item/base/data/values.ts";
import { SIZES, type Size, type ZeroToTwo } from "@module/data.ts";
import { RarityField } from "@module/model.ts";
import { SlugField } from "@system/schema-data-fields.ts";
import { CoinsPF2e } from "./coins.ts";
import type {
    BulkData,
    IdentificationData,
    IdentificationStatus,
    ItemCarryType,
    ItemMaterialData,
    PhysicalItemHitPoints,
    PhysicalItemPF2e,
    PhysicalItemTrait,
    PhysicalItemTraits,
    PreciousMaterialGrade,
    PreciousMaterialType,
    Price,
    UsageDetails,
} from "./index.ts";
import { PRECIOUS_MATERIAL_GRADES, PRECIOUS_MATERIAL_TYPES } from "./values.ts";
import fields = foundry.data.fields;

class PriceField extends fields.SchemaField<PriceSchema, fields.SourceFromSchema<PriceSchema>, Price> {
    constructor() {
        const denominationField = (): fields.NumberField<number, number, false, false, false> =>
            new fields.NumberField({ required: false, nullable: false, initial: undefined });
        super(
            {
                value: new fields.SchemaField(
                    {
                        cp: denominationField(),
                        sp: denominationField(),
                        gp: denominationField(),
                        pp: denominationField(),
                    },
                    {
                        required: true,
                        nullable: false,
                    },
                ),
                per: new fields.NumberField({
                    required: true,
                    nullable: false,
                    positive: true,
                    integer: true,
                    initial: 1,
                }),
                sizeSensitive: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            },
            {
                required: true,
                nullable: false,
                initial: () => ({
                    value: {
                        cp: undefined,
                        sp: undefined,
                        gp: undefined,
                        pp: undefined,
                    },
                    per: 1,
                    sizeSensitive: undefined,
                }),
            },
        );
    }

    override initialize(source: fields.SourceFromSchema<PriceSchema>): Price {
        const initialized = super.initialize(source);
        initialized.value = new CoinsPF2e(initialized.value);
        initialized.sizeSensitive ??= false;
        return initialized;
    }
}

/** Base system model for physical items. */
abstract class PhysicalItemSystemModel<
    TItem extends PhysicalItemPF2e,
    TSchema extends PhysicalItemSystemSchema,
> extends ItemSystemModel<TItem, TSchema> {
    declare traits: PhysicalItemTraits<PhysicalItemTrait>;

    declare hp: PhysicalItemHitPoints;

    declare bulk: BulkData;

    declare material: ItemMaterialData;

    declare identification: IdentificationData;

    declare usage: UsageDetails;

    declare subitems: PhysicalItemSource[];

    static override defineSchema(): PhysicalItemSystemSchema {
        return {
            ...super.defineSchema(),
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
            quantity: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
            baseItem: new fields.StringField({ required: true, nullable: true, initial: null }),
            bulk: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
            }),
            material: new fields.SchemaField({
                grade: new fields.StringField({
                    choices: [...PRECIOUS_MATERIAL_GRADES],
                    required: true,
                    nullable: true,
                    initial: null,
                }),
                type: new fields.StringField({
                    choices: [...PRECIOUS_MATERIAL_TYPES],
                    required: true,
                    nullable: true,
                    initial: null,
                }),
            }),
            hp: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
                max: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
            }),
            hardness: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
            price: new PriceField(),
            equipped: new fields.SchemaField({
                carryType: new fields.StringField({
                    choices: ITEM_CARRY_TYPES,
                    required: true,
                    nullable: false,
                    initial: "worn",
                }),
                inSlot: new fields.BooleanField({ required: false, nullable: false }),
                handsHeld: new fields.NumberField({ required: false, nullable: false, min: 0, max: 2, integer: true }),
                invested: new fields.BooleanField({ required: false, nullable: true, initial: null }),
            }),
            identification: new fields.SchemaField({
                status: new fields.StringField({
                    choices: ["identified", "unidentified"],
                    required: true,
                    nullable: false,
                    initial: "identified",
                }),
                unidentified: new fields.SchemaField({
                    name: new fields.StringField({ required: true, blank: true, nullable: false, initial: "" }),
                    img: new fields.FilePathField<ImageFilePath, ImageFilePath, true, true, true>({
                        required: true,
                        categories: ["IMAGE"],
                        nullable: true,
                        initial: null,
                    }),
                    data: new fields.SchemaField({
                        description: new fields.SchemaField({
                            value: new fields.StringField({
                                required: true,
                                blank: true,
                                nullable: false,
                                initial: "",
                            }),
                        }),
                    }),
                }),
                misidentified: new fields.ObjectField({ required: true, nullable: false, initial: {} }),
            }),
            containerId: new fields.StringField({ required: true, nullable: true, blank: false, initial: null }),
            size: new fields.StringField({ choices: SIZES, required: true, nullable: false, initial: "med" }),
            apex: new fields.SchemaField(
                {
                    attribute: new fields.StringField({
                        choices: [...ATTRIBUTE_ABBREVIATIONS],
                        required: true,
                        nullable: false,
                        initial: "str",
                    }),
                    selected: new fields.BooleanField({ required: false, nullable: false, initial: false }),
                },
                { required: false, nullable: false },
            ),
        };
    }

    override prepareBaseData(): void {
        this.subitems ??= [];
    }
}

interface PhysicalItemSystemModel<TItem extends PhysicalItemPF2e, TSchema extends PhysicalItemSystemSchema>
    extends ItemSystemModel<TItem, TSchema>,
        Omit<ModelPropsFromSchema<PhysicalItemSystemSchema>, "description"> {}

type CoinsField = fields.SchemaField<CoinsSchema, fields.SourceFromSchema<CoinsSchema>, CoinsPF2e, true, false, true>;

type CoinsSchema = {
    cp: fields.NumberField<number, number, false, false, false>;
    sp: fields.NumberField<number, number, false, false, false>;
    gp: fields.NumberField<number, number, false, false, false>;
    pp: fields.NumberField<number, number, false, false, false>;
};

type PriceSchema = {
    value: CoinsField;
    per: fields.NumberField<number, number, true, false, true>;
    sizeSensitive: fields.BooleanField<boolean, boolean, false, false, false>;
};

type EquippedDataSchema = {
    carryType: fields.StringField<ItemCarryType, ItemCarryType, true, false, true>;
    inSlot: fields.BooleanField<boolean, boolean, false, false>;
    handsHeld: fields.NumberField<ZeroToTwo, ZeroToTwo, false, false>;
    invested: fields.BooleanField<boolean, boolean, false, true>;
};

type ApexSchema = {
    attribute: fields.StringField<AttributeString, AttributeString, true, false>;
    selected: fields.BooleanField<boolean, boolean, false, false, true>;
};

type PhysicalItemTraitsSchema<T extends PhysicalItemTrait> = {
    value: fields.ArrayField<fields.StringField<T, T, true, false, false>>;
    rarity: RarityField;
    otherTags: fields.ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
};

type PhysicalItemSystemSchema = ItemSystemSchema & {
    level: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    quantity: fields.NumberField<number, number, true, false, true>;
    baseItem: fields.StringField<string, string, true, true, true>;
    bulk: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    material: fields.SchemaField<{
        grade: fields.StringField<PreciousMaterialGrade, PreciousMaterialGrade, true, true, true>;
        type: fields.StringField<PreciousMaterialType, PreciousMaterialType, true, true, true>;
    }>;
    hp: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        max: fields.NumberField<number, number, true, false, true>;
    }>;
    hardness: fields.NumberField<number, number, true, false, true>;
    price: PriceField;
    equipped: fields.SchemaField<EquippedDataSchema>;
    identification: fields.SchemaField<{
        status: fields.StringField<IdentificationStatus, IdentificationStatus, true, false, true>;
        unidentified: fields.SchemaField<{
            name: fields.StringField<string, string, true, false, true>;
            img: fields.FilePathField<ImageFilePath, ImageFilePath, true, true, true>;
            data: fields.SchemaField<{
                description: fields.SchemaField<{
                    value: fields.StringField<string, string, true, false, true>;
                }>;
            }>;
        }>;
        misidentified: fields.ObjectField<object, object, true, false>;
    }>;
    size: fields.StringField<Size, Size, true, false, true>;
    containerId: fields.StringField<string, string, true, true, true>;
    apex: fields.SchemaField<
        ApexSchema,
        fields.SourceFromSchema<ApexSchema>,
        fields.ModelPropsFromSchema<ApexSchema>,
        false,
        false
    >;
};

type PhysicalItemModelOmission = "description" | "bulk" | "hp" | "identification" | "material" | "usage";

type PhysicalItemSystemSource<T extends PhysicalItemSystemSchema = PhysicalItemSystemSchema> = SourceFromSchema<T> & {
    schema?: ItemSystemSource["schema"];
    usage?: { value: string };
};

export { PhysicalItemSystemModel, PriceField };
export type { PhysicalItemModelOmission, PhysicalItemSystemSchema, PhysicalItemSystemSource, PhysicalItemTraitsSchema };
