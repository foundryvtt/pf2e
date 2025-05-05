import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type { ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.mjs";
import type { ActorUUID, ItemUUID, TokenDocumentUUID } from "@common/documents/_module.mjs";
import type { MagicTradition } from "@item/spell/types.ts";
import type { DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import type { EffectContextData } from "./data.ts";
import fields = foundry.data.fields;

class EffectContextField extends fields.SchemaField<
    EffectContextDataSchema,
    SourceFromSchema<EffectContextDataSchema>,
    EffectContextData,
    false,
    true,
    true
> {
    constructor() {
        super(
            {
                origin: new fields.SchemaField({
                    actor: new fields.DocumentUUIDField({ required: true, nullable: false }),
                    token: new fields.DocumentUUIDField({ required: false, nullable: true, initial: null }),
                    item: new fields.DocumentUUIDField({ required: false, nullable: true, initial: null }),
                    spellcasting: new fields.SchemaField(
                        {
                            attribute: new fields.SchemaField({
                                type: new fields.StringField({
                                    choices: [...ATTRIBUTE_ABBREVIATIONS],
                                    required: true,
                                    nullable: false,
                                }),
                                mod: new fields.NumberField({ required: true, nullable: false }),
                            }),
                            tradition: new fields.StringField(),
                        },
                        { required: false, nullable: true, initial: null },
                    ),
                    rollOptions: new fields.ArrayField(new fields.StringField(), { required: false, nullable: false }),
                }),
                target: new fields.SchemaField(
                    {
                        actor: new fields.DocumentUUIDField({ required: true, nullable: false }),
                        token: new fields.DocumentUUIDField({ required: false, nullable: true, initial: null }),
                    },
                    { required: false, nullable: true, initial: null },
                ),
                roll: new fields.SchemaField(
                    {
                        total: new fields.NumberField({ required: true, nullable: false }),
                        degreeOfSuccess: new fields.NumberField<
                            DegreeOfSuccessIndex,
                            DegreeOfSuccessIndex,
                            false,
                            true,
                            true
                        >({
                            required: false,
                            nullable: true,
                            initial: null,
                            min: 0,
                            max: 3,
                        }),
                    },
                    { required: true, nullable: true, initial: null },
                ),
            },
            { required: false, nullable: true, initial: null },
        );
    }
}

type EffectContextDataSchema = {
    origin: fields.SchemaField<{
        actor: fields.DocumentUUIDField<ActorUUID, true, false>;
        token: fields.DocumentUUIDField<TokenDocumentUUID, false, true, true>;
        item: fields.DocumentUUIDField<ItemUUID, false, true, true>;
        spellcasting: fields.SchemaField<
            EffectContextSpellcastingSchema,
            SourceFromSchema<EffectContextSpellcastingSchema>,
            ModelPropsFromSchema<EffectContextSpellcastingSchema>,
            false,
            true,
            true
        >;
        rollOptions: fields.ArrayField<fields.StringField, string[], string[], false, false>;
    }>;
    target: fields.SchemaField<
        EffectContextTargetSchema,
        SourceFromSchema<EffectContextTargetSchema>,
        ModelPropsFromSchema<EffectContextTargetSchema>,
        false,
        true,
        true
    >;
    roll: fields.SchemaField<
        EffectContextRollSchema,
        SourceFromSchema<EffectContextRollSchema>,
        ModelPropsFromSchema<EffectContextRollSchema>,
        true,
        true
    >;
};

type EffectContextSpellcastingSchema = {
    attribute: fields.SchemaField<{
        type: fields.StringField<AttributeString, AttributeString, true, false>;
        mod: fields.NumberField<number, number, true, false>;
    }>;
    tradition: fields.StringField<MagicTradition, MagicTradition, false, true, true>;
};

type EffectContextTargetSchema = {
    actor: fields.DocumentUUIDField<ActorUUID, true, false>;
    token: fields.DocumentUUIDField<TokenDocumentUUID, false, true, true>;
};

type EffectContextRollSchema = {
    total: fields.NumberField<number, number, true, false, false>;
    degreeOfSuccess: fields.NumberField<DegreeOfSuccessIndex, DegreeOfSuccessIndex, false, true, true>;
};

export { EffectContextField };
