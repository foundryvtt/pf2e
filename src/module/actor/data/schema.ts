import { ActorPF2e } from "@actor";
import { ArrayField, NumberField, SchemaField, StringField } from "types/foundry/common/data/fields.js";

const fields = foundry.data.fields;

abstract class ActorSystemModel<TParent extends ActorPF2e, TSchema extends ActorSystemSchema> extends foundry.abstract
    .TypeDataModel<TParent, TSchema> {
    static override defineSchema(): ActorSystemSchema {
        return {
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

type ActorSystemSchema = {
    /** The currently selected initiative, as well as initiative trace data */
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

type ActorTraitsSchema<T extends string> = {
    value: ArrayField<StringField<T, string, true, false>>;
};

export { ActorSystemModel };
export type { ActorSystemSchema, ActorTraitsSchema };
