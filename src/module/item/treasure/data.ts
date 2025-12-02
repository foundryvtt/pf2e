import type { ImageFilePath } from "@common/constants.d.mts";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/model.ts";
import type { ItemDescriptionData } from "@item/base/data/system.ts";
import { ITEM_CARRY_TYPES } from "@item/base/data/values.ts";
import type {
    BasePhysicalItemSource,
    BulkData,
    EquippedData,
    IdentificationData,
    IdentificationStatus,
    ItemCarryType,
    ItemMaterialData,
    PhysicalItemHitPoints,
    Price,
} from "@item/physical/data.ts";
import { PriceField } from "@item/physical/schema.ts";
import type { PreciousMaterialGrade, PreciousMaterialType } from "@item/physical/types.ts";
import type { CarriedUsage } from "@item/physical/usage.ts";
import { PRECIOUS_MATERIAL_TYPES } from "@item/physical/values.ts";
import { ItemSize } from "@item/types.ts";
import { RarityField } from "@module/model.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { TreasurePF2e } from "./document.ts";
import { TreasureCategory } from "./types.ts";
import { TREASURE_CATEGORIES } from "./values.ts";
import fields = foundry.data.fields;

class TreasureSystemData extends ItemSystemModel<TreasurePF2e, TreasureSystemSchema> {
    static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "PF2E.Item.Treasure"];

    static override defineSchema(): TreasureSystemSchema {
        const unidentifiedImg: ImageFilePath = `${SYSTEM_ROOT}/icons/unidentified_item_icons/adventuring_gear.webp`;
        return {
            ...super.defineSchema(),
            baseItem: new fields.StringField({ required: true, nullable: true, blank: false }),
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
            category: new fields.StringField({ required: true, nullable: true, choices: TREASURE_CATEGORIES }),
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
            traits: new fields.SchemaField({
                value: new LaxArrayField(new fields.StringField({ required: true, choices: ["precious"] } as const)),
                rarity: new RarityField(),
                otherTags: new fields.ArrayField(new SlugField({ required: true, initial: undefined })),
            }),
        };
    }

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        const migrated = super.migrateData(source);
        if (migrated.size === "sm") migrated.size = "med";
        if (migrated.stackGroup === "coins") migrated.category = "coin";
        else if (migrated.stackGroup === "gems") migrated.category = "gem";
        return migrated;
    }

    get stackGroup(): "coins" | "gems" | "upb" | null {
        if (this.slug === "upb") return "upb";

        switch (this.category) {
            case "coin":
                return "coins";
            case "gem":
                return "gems";
            default:
                return null;
        }
    }

    /** Treasure need only be on one's person. */
    declare usage: CarriedUsage;

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.price.sizeSensitive = false;
        if (this.category === "coin") this.size = "med";
    }
}

interface TreasureSystemData
    extends ItemSystemModel<TreasurePF2e, TreasureSystemSchema>,
        fields.ModelPropsFromSchema<TreasureSystemSchema> {
    bulk: BulkData;
    description: ItemDescriptionData;
    equipped: TreasureEquippedData;
    hp: PhysicalItemHitPoints;
    identification: IdentificationData;
    material: ItemMaterialData;
    price: Price;
    temporary: boolean;

    apex?: never;
    subitems?: never;
}

interface TreasureSystemSource extends fields.SourceFromSchema<TreasureSystemSchema> {
    equipped: {
        carryType: ItemCarryType;
        invested?: never;
    };
    apex?: never;
    schema?: never;
    subitems?: never;
    usage?: never;
}

type TreasureSystemSchema = Omit<ItemSystemSchema, "traits"> & {
    baseItem: fields.StringField<string, string, true, true>;
    category: fields.StringField<TreasureCategory, TreasureCategory, true, true, true>;
    bulk: fields.SchemaField<{ value: fields.NumberField<number, number, true, false, true> }>;
    containerId: fields.StringField<string, string, true, true>;
    hardness: fields.NumberField<number, number, true, false, true>;
    hp: fields.SchemaField<{
        max: fields.NumberField<number, number, true, false, true>;
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    equipped: fields.SchemaField<{
        carryType: fields.StringField<ItemCarryType, ItemCarryType, true, false, true>;
    }>;
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
    level: fields.SchemaField<{ value: fields.NumberField<number, number, true, false, true> }>;
    material: fields.SchemaField<{
        type: fields.StringField<PreciousMaterialType, PreciousMaterialType, true, true>;
        grade: fields.StringField<PreciousMaterialGrade, PreciousMaterialGrade, true, true>;
    }>;
    price: PriceField;
    quantity: fields.NumberField<number, number, true, false, true>;
    size: fields.StringField<ItemSize, ItemSize, true, false, true>;
    temporary: fields.BooleanField<boolean, boolean, false, false, false>;
    traits: fields.SchemaField<{
        value: fields.ArrayField<fields.StringField<"precious", "precious", true, false, false>>;
        rarity: RarityField;
        otherTags: fields.ArrayField<SlugField<true, false, false>>;
    }>;
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

interface TreasureSource extends BasePhysicalItemSource<"treasure", TreasureSystemSource> {}

interface TreasureEquippedData extends EquippedData {
    invested?: never;
}

export { TreasureSystemData };
export type { TreasureSource, TreasureSystemSchema, TreasureSystemSource };
