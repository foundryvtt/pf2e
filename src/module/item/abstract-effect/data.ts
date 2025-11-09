import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type { ActorUUID, ItemUUID, TokenDocumentUUID } from "@client/documents/_module.d.mts";
import type { ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.d.mts";
import type { ItemSystemSchema } from "@item/base/data/model.ts";
import type { ItemDescriptionData } from "@item/base/data/system.ts";
import type { MagicTradition } from "@item/spell/index.ts";
import type { CheckRoll } from "@system/check/index.ts";
import type { DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import { SlugField } from "@system/schema-data-fields.ts";
import type { BadgeReevaluationEventType, EffectExpiryType, EffectTrait, TimeUnit } from "./types.ts";
import fields = foundry.data.fields;

type AbstractEffectSchema = Omit<ItemSystemSchema, "traits"> & {
    traits: fields.SchemaField<{
        otherTags: fields.ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
        value: fields.ArrayField<
            fields.StringField<EffectTrait, EffectTrait, true, false, false>,
            EffectTrait[],
            EffectTrait[],
            true,
            false,
            true
        >;
    }>;
    fromSpell: fields.BooleanField<boolean, boolean, true, false, true>;
};

type AbstractEffectSystemSource = SourceFromSchema<AbstractEffectSchema>;

interface AbstractEffectSystemData extends Omit<ModelPropsFromSchema<AbstractEffectSchema>, "description"> {
    level?: { value: number };
    description: ItemDescriptionData;
    duration: DurationData;
    expired?: boolean;
    context?: EffectContextData | null;
    start?: { value: number; initiative: number | null };
}

interface EffectContextData {
    origin: {
        actor: ActorUUID;
        token: TokenDocumentUUID | null;
        item: ItemUUID | null;
        spellcasting: EffectContextSpellcastingData | null;
        rollOptions: string[];
    };
    target: {
        actor: ActorUUID;
        token: TokenDocumentUUID | null;
    } | null;
    roll: Pick<foundry.dice.Rolled<CheckRoll>, "total" | "degreeOfSuccess"> | null;
}

interface EffectContextSpellcastingData {
    attribute: { type: AttributeString; mod: number };
    tradition: MagicTradition | null;
}

interface EffectAuraData {
    slug: string;
    origin: ActorUUID;
    removeOnExit: boolean;
}

interface DurationData {
    value: number;
    unit: TimeUnit | "unlimited" | "encounter";
    expiry: EffectExpiryType | null;
}

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
                    rollOptions: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
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
        rollOptions: fields.ArrayField<fields.StringField<string, string, true, false, false>>;
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

type DurationDataSchema = {
    value: fields.NumberField<number, number, true, false, true>;
    unit: fields.StringField<TimeUnit | "unlimited" | "encounter", TimeUnit | "unlimited" | "encounter", true, false>;
    expiry: fields.StringField<EffectExpiryType, EffectExpiryType, true, true>;
};

type EffectBadgeCounterSchema = {
    type: fields.StringField<"counter", "counter", true, false>;
    labels: fields.ArrayField<fields.StringField<string, string, true, false>, string[], string[], false, true, true>;
    value: fields.NumberField<number, number, true, false, true>;
    min: fields.NumberField<number, number, false, true>;
    max: fields.NumberField<number, number, false, true>;
    loop: fields.BooleanField<boolean, boolean, false, false>;
};

type EffectBadgeValueSchema = {
    type: fields.StringField<"value", "value", true, false>;
    labels: fields.ArrayField<fields.StringField<string, string, true, false>, string[], string[], false, true, true>;
    value: fields.NumberField<number, number, true, false, true>;
    reevaluate: fields.SchemaField<
        EffectBadgeValueReevaluateSchema,
        SourceFromSchema<EffectBadgeValueReevaluateSchema>,
        ModelPropsFromSchema<EffectBadgeValueReevaluateSchema>,
        true,
        true
    >;
};

type EffectBadgeValueReevaluateSchema = {
    /** The type of event that reevaluation should occur */
    event: fields.StringField<BadgeReevaluationEventType, BadgeReevaluationEventType, true, false>;
    /** The formula of this badge when it was of a "formula" type */
    formula: fields.StringField<string, string, true, false, true>;
    /** The initial value of this badge */
    initial: fields.NumberField<number, number, false, false>;
};

type EffectBadgeFormulaSchema = {
    type: fields.StringField<"formula", "formula", true, false>;
    labels: fields.ArrayField<fields.StringField<string, string, true, false>, string[], string[], false, true, true>;
    value: fields.StringField<string, string, true, false, true>;
    evaluate: fields.BooleanField<boolean, boolean, false, false, false>;
    reevaluate: fields.StringField<BadgeReevaluationEventType, BadgeReevaluationEventType, true, true, true>;
};

interface EffectBadgeCounterSource extends Omit<SourceFromSchema<EffectBadgeCounterSchema>, "loop"> {
    loop?: boolean;
}

/** A static value, including the result of a formula badge */
interface EffectBadgeValueSource extends SourceFromSchema<EffectBadgeValueSchema> {
    min?: never;
    max?: never;
}

interface EffectBadgeFormulaSource extends Omit<SourceFromSchema<EffectBadgeFormulaSchema>, "evaluate"> {
    evaluate?: boolean;
    min?: never;
    max?: never;
}

interface EffectBadgeCounter extends Omit<EffectBadgeCounterSource, "labels"> {
    labels?: string[] | null;
    label: string | null;
    min: number;
    max: number;
}

interface EffectBadgeValue extends Omit<EffectBadgeValueSource, "min" | "max"> {
    label: string | null;
    min: number;
    max: number;
}

interface EffectBadgeFormula extends Omit<EffectBadgeFormulaSource, "labels"> {
    labels?: string[] | null;
    label: string | null;
}

type EffectBadgeSource = EffectBadgeCounterSource | EffectBadgeValueSource | EffectBadgeFormulaSource;
type EffectBadge = EffectBadgeCounter | EffectBadgeValue | EffectBadgeFormula;

export { EffectContextField };

export type {
    AbstractEffectSchema,
    AbstractEffectSystemData,
    AbstractEffectSystemSource,
    DurationData,
    DurationDataSchema,
    EffectAuraData,
    EffectBadge,
    EffectBadgeCounter,
    EffectBadgeCounterSchema,
    EffectBadgeCounterSource,
    EffectBadgeFormulaSchema,
    EffectBadgeFormulaSource,
    EffectBadgeSource,
    EffectBadgeValueSchema,
    EffectBadgeValueSource,
    EffectContextData,
};
