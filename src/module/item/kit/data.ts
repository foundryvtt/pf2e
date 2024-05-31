import type { ItemPF2e } from "@item";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/schema.ts";
import type { BaseItemSourcePF2e, ItemSystemSource } from "@item/base/data/system.ts";
import type { ClassTrait } from "@item/class/types.ts";
import { PriceField } from "@item/physical/schema.ts";
import type { RuleElementSource } from "@module/rules/index.ts";
import { NullField, RecordField, SlugField } from "@system/schema-data-fields.ts";
import type {
    ArrayField,
    BooleanField,
    DocumentUUIDField,
    FilePathField,
    NumberField,
    SchemaField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";

class KitEntriesField extends RecordField<
    StringField<string, string, true, false, false>,
    SchemaField<KitEntryValueSchema>,
    true,
    false,
    true,
    true
> {
    /**
     * @param depth The recursion depth of this field:must be between 0 and 2
     */
    constructor(depth = 0) {
        const fields = foundry.data.fields;

        type KitEntryValueSchema = {
            uuid: DocumentUUIDField<ItemUUID, true, false, false>;
            img: FilePathField<ImageFilePath, ImageFilePath, true, false, false>;
            quantity: NumberField<number, number, true, false, false>;
            name: StringField<string, string, true, false, false>;
            isContainer: BooleanField<boolean, boolean, true, false, false>;
            items: KitEntriesField | NullField;
        };
        const hasNestedItems = depth <= 2;
        const valueSchemaData = (): KitEntryValueSchema => ({
            uuid: new fields.DocumentUUIDField<ItemUUID, true, false, false>({
                required: true,
                nullable: false,
                initial: undefined,
            }),
            img: new fields.FilePathField<ImageFilePath, ImageFilePath, true, false, false>({
                categories: ["IMAGE"],
                base64: false,
                required: true,
                nullable: false,
                initial: undefined,
            }),
            quantity: new fields.NumberField({
                required: true,
                integer: true,
                positive: true,
                nullable: false,
                initial: undefined,
            }),
            name: new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
            isContainer: new fields.BooleanField({
                required: true,
                nullable: false,
                initial: undefined,
            }),
            items: hasNestedItems ? new KitEntriesField(depth + 1) : new NullField(),
        });

        super(
            new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
            new fields.SchemaField(valueSchemaData(), {
                required: true,
                nullable: false,
                initial: undefined,
            }),
        );
    }
}

class KitSystemData extends ItemSystemModel<ItemPF2e, KitSystemSchema> {
    static override defineSchema(): KitSystemSchema {
        const fields = foundry.data.fields;

        const traitChoices: Record<ClassTrait, string> = {
            ...CONFIG.PF2E.classTraits,
        };

        return {
            ...super.defineSchema(),
            traits: new fields.SchemaField({
                otherTags: new fields.ArrayField(
                    new SlugField({ required: true, nullable: false, initial: undefined }),
                ),
                value: new fields.ArrayField(
                    new fields.StringField({
                        required: true,
                        nullable: false,
                        choices: traitChoices,
                        initial: undefined,
                    }),
                ),
            }),
            items: new KitEntriesField(),
            price: new PriceField(),
        };
    }
}

interface KitSystemData
    extends ItemSystemModel<ItemPF2e, KitSystemSchema>,
        Omit<ModelPropsFromSchema<KitSystemSchema>, "description"> {}

type KitEntryData = NonNullable<KitSystemData["items"][string]>;

type KitEntryValueSchema = {
    uuid: DocumentUUIDField<ItemUUID, true, false, false>;
    img: FilePathField<ImageFilePath, ImageFilePath, true, false, false>;
    quantity: NumberField<number, number, true, false, false>;
    name: StringField<string, string, true, false, false>;
    isContainer: BooleanField<boolean, boolean, true, false, false>;
    items: KitEntriesField | NullField;
};

type KitSystemSchema = Omit<ItemSystemSchema, "traits"> & {
    traits: SchemaField<{
        otherTags: ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
        value: ArrayField<
            StringField<ClassTrait, ClassTrait, true, false, false>,
            ClassTrait[],
            ClassTrait[],
            true,
            false,
            true
        >;
    }>;
    items: KitEntriesField;
    price: PriceField;
};

type KitSystemSource = Omit<SourceFromSchema<KitSystemSchema>, "rules"> & {
    level?: never;
    schema?: ItemSystemSource["schema"];
    rules: RuleElementSource[];
};

type KitSource = BaseItemSourcePF2e<"kit", KitSystemSource>;

export { KitSystemData };
export type { KitEntryData, KitSource };
