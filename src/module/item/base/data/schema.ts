import { RuleElementSource } from "@module/rules/index.ts";
import { SlugField } from "@system/schema-data-fields.ts";
import type {
    ArrayField,
    BooleanField,
    NumberField,
    ObjectField,
    SchemaField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import type { ItemPF2e } from "../document.ts";
import { ItemDescriptionData } from "./system.ts";

abstract class ItemSystemModel<TParent extends ItemPF2e, TSchema extends ItemSystemSchema> extends foundry.abstract
    .TypeDataModel<TParent, TSchema> {
    static override LOCALIZATION_PREFIXES = ["PF2E.Item"];

    static override defineSchema(): ItemSystemSchema {
        const fields = foundry.data.fields;

        const anyStringField = (): StringField<string, string, true, false, true> =>
            new fields.StringField({ required: true, nullable: false, initial: "" });

        return {
            description: new fields.SchemaField({
                value: anyStringField(),
                gm: anyStringField(),
            }),
            publication: new fields.SchemaField({
                title: anyStringField(),
                authors: anyStringField(),
                license: new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: ["OGL", "ORC"],
                    initial: "OGL",
                }),
                remaster: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            }),
            rules: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
                required: true,
                nullable: false,
            }),
            slug: new SlugField({ required: true, nullable: true, initial: null }),
            traits: new fields.SchemaField({
                otherTags: new fields.ArrayField(
                    new SlugField({ required: true, nullable: false, initial: undefined }),
                ),
            }),
            _migration: new fields.SchemaField({
                version: new fields.NumberField({
                    required: true,
                    nullable: true,
                    positive: true,
                    initial: null,
                }),
                previous: new fields.SchemaField(
                    {
                        foundry: new fields.StringField({ required: true, nullable: true, initial: null }),
                        system: new fields.StringField({ required: true, nullable: true, initial: null }),
                        schema: new fields.NumberField({
                            required: true,
                            nullable: true,
                            positive: true,
                            initial: null,
                        }),
                    },
                    { required: true, nullable: true, initial: null },
                ),
            }),
        };
    }
}

interface ItemSystemModel<TParent extends ItemPF2e, TSchema extends ItemSystemSchema>
    extends foundry.abstract.TypeDataModel<TParent, TSchema> {
    description: ItemDescriptionData;
}

type ItemSystemSchema = {
    description: SchemaField<{
        value: StringField<string, string, true, false, true>;
        gm: StringField<string, string, true, false, true>;
    }>;
    publication: SchemaField<{
        title: StringField<string, string, true, false, true>;
        authors: StringField<string, string, true, false, true>;
        license: StringField<"OGL" | "ORC", "OGL" | "ORC", true, false, true>;
        remaster: BooleanField<boolean, boolean, true, false, true>;
    }>;
    rules: ArrayField<
        ObjectField<RuleElementSource, RuleElementSource, true, false, false>,
        RuleElementSource[],
        RuleElementSource[],
        true,
        false,
        true
    >;
    slug: SlugField<true, true, true>;
    traits: SchemaField<{
        otherTags: ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
    }>;
    _migration: SchemaField<{
        version: NumberField<number, number, true, true, true>;
        previous: SchemaField<
            {
                foundry: StringField<string, string, true, true, true>;
                system: StringField<string, string, true, true, true>;
                schema: NumberField<number, number, true, true, true>;
            },
            { foundry: string | null; system: string | null; schema: number | null },
            { foundry: string | null; system: string | null; schema: number | null },
            true,
            true,
            true
        >;
    }>;
};

export { ItemSystemModel, type ItemSystemSchema };
