import type { ActorPF2e } from "@actor";
import type { MigrationDataField } from "@module/data.ts";
import type { AutoChangeEntry } from "@module/rules/rule-element/ae-like.ts";

abstract class ActorSystemModel<TParent extends ActorPF2e, TSchema extends ActorSystemSchema> extends foundry.abstract
    .TypeDataModel<TParent, TSchema> {
    declare autoChanges: Record<string, AutoChangeEntry[] | undefined>;

    static override defineSchema(): ActorSystemSchema {
        const fields = foundry.data.fields;
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
    _migration: MigrationDataField;
};

export { ActorSystemModel, type ActorSystemSchema };
