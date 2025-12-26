import type { SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import type { ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.d.mts";
import type { ItemUUID } from "@common/documents/_module.d.mts";
import { type DurationDataSchema, EffectContextField } from "@item/abstract-effect/data.ts";
import type { EffectAuraData } from "@item/abstract-effect/index.ts";
import type { EffectTrait, TimeUnit } from "@item/abstract-effect/types.ts";
import { EFFECT_TIME_UNITS } from "@item/abstract-effect/values.ts";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/model.ts";
import type {
    BaseItemSourcePF2e,
    ItemFlagsPF2e,
    ItemSourceFlagsPF2e,
    ItemSystemSource,
} from "@item/base/data/system.ts";
import type { ConditionSlug } from "@item/condition/index.ts";
import { CONDITION_SLUGS } from "@item/condition/values.ts";
import type { DamageCategoryUnique, DamageType } from "@system/damage/types.ts";
import { DAMAGE_CATEGORIES_UNIQUE } from "@system/damage/values.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { AfflictionPF2e } from "./document.ts";
import fields = foundry.data.fields;

type AfflictionSource = BaseItemSourcePF2e<"affliction", AfflictionSystemSource> & {
    flags: ItemSourceFlagsPF2e & {
        [SYSTEM_ID]?: {
            aura?: EffectAuraData;
        };
    };
};

class AfflictionSystemData extends ItemSystemModel<AfflictionPF2e, AfflictionSystemSchema> {
    /** Whether or not the current affliction is expired */
    declare expired?: boolean;

    static override defineSchema(): AfflictionSystemSchema {
        const effectTraits: Record<EffectTrait, string> = CONFIG.PF2E.effectTraits;
        const damageTypes: Record<DamageType, string> = CONFIG.PF2E.damageTypes;

        return {
            ...super.defineSchema(),
            level: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
            }),
            traits: new fields.SchemaField({
                otherTags: new fields.ArrayField(
                    new SlugField({ required: true, nullable: false, initial: undefined }),
                ),
                value: new LaxArrayField(
                    new fields.StringField({
                        required: true,
                        nullable: false,
                        choices: effectTraits,
                        initial: undefined,
                    }),
                ),
            }),
            save: new fields.SchemaField({
                type: new fields.StringField({
                    choices: SAVE_TYPES,
                    required: true,
                    nullable: false,
                    initial: "fortitude",
                }),
                value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            }),
            status: new fields.SchemaField({
                onset: new fields.BooleanField({
                    required: true,
                    nullable: false,
                    initial: (source: DeepPartial<AfflictionSystemSource>) => !!source.onset,
                }),
                stage: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1 }),
                progress: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
            }),
            onset: new fields.SchemaField(
                {
                    value: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
                    unit: new fields.StringField({
                        choices: EFFECT_TIME_UNITS,
                        required: true,
                        nullable: false,
                        initial: "rounds",
                    }),
                },
                { required: false, nullable: true, initial: null },
            ),
            /** Data for all stages. This is 0 indexed, so you have to subtract 1 from the current stage */
            stages: new fields.ArrayField(
                new fields.SchemaField({
                    damage: new fields.ArrayField(
                        new fields.SchemaField({
                            formula: new fields.StringField({ required: true, nullable: false }),
                            damageType: new fields.StringField({
                                choices: damageTypes,
                                required: true,
                                nullable: false,
                                initial: "untyped" as DamageType,
                            }),
                            category: new fields.StringField({
                                choices: DAMAGE_CATEGORIES_UNIQUE,
                                required: false,
                                nullable: true,
                                initial: null,
                            }),
                        }),
                    ),
                    conditions: new fields.ArrayField(
                        new fields.SchemaField({
                            slug: new fields.StringField({
                                choices: [...CONDITION_SLUGS],
                                required: true,
                                nullable: false,
                            }),
                            value: new fields.NumberField({ required: false, nullable: true, initial: null }),
                            linked: new fields.BooleanField({ required: false, nullable: false, initial: true }),
                        }),
                    ),
                    effects: new fields.ArrayField(
                        new fields.SchemaField({
                            uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
                        }),
                    ),
                    duration: new fields.SchemaField({
                        value: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0 }),
                        unit: new fields.StringField({
                            choices: [...EFFECT_TIME_UNITS, "unlimited", "encounter"],
                            required: true,
                            nullable: false,
                            initial: "rounds",
                        }),
                    }),
                }),
            ),
            duration: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, initial: -1, min: -1 }),
                unit: new fields.StringField({
                    choices: [...EFFECT_TIME_UNITS, "unlimited", "encounter"],
                    initial: "unlimited",
                }),
                expiry: new fields.StringField({
                    choices: ["turn-start", "turn-end", "round-end"],
                    required: true,
                    nullable: true,
                    initial: null,
                }),
            }),
            start: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                initiative: new fields.NumberField({ required: true, nullable: true, initial: null }),
            }),
            fromSpell: new fields.BooleanField({ required: true, nullable: false }),
            context: new EffectContextField(),
        };
    }

    override prepareBaseData(): void {
        const maxStage = this.stages.length || 1;
        this.status.stage = Math.clamp(this.status.stage, 1, maxStage);
    }
}

interface AfflictionSystemData
    extends ItemSystemModel<AfflictionPF2e, AfflictionSystemSchema>,
        Omit<ModelPropsFromSchema<AfflictionSystemSchema>, "description"> {}

type AfflictionSystemSchema = Omit<ItemSystemSchema, "traits"> & {
    level: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
    }>;
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
    save: fields.SchemaField<{
        type: fields.StringField<SaveType, SaveType, true, false, true>;
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    /** The current status of the affliction, including the current stage and whether it is currently in the onset phase */
    status: fields.SchemaField<{
        /** If true, this affliction is in the onset stage */
        onset: fields.BooleanField<boolean, boolean, true, false, true>;
        /** The current affliction stage, starting from 1. */
        stage: fields.NumberField<number, number, true, false, true>;
        /** Current progress towards recovering. Only relevant for virulent */
        progress: fields.NumberField<number, number, true, false, true>;
    }>;
    /** The onset time for this affliction */
    onset: fields.SchemaField<
        AfflictionOnsetSchema,
        SourceFromSchema<AfflictionOnsetSchema>,
        ModelPropsFromSchema<AfflictionOnsetSchema>,
        false,
        true,
        true
    >;
    /** The list of stages and what each stage does */
    stages: fields.ArrayField<fields.SchemaField<AfflictionStageSchema>>;
    /** The maximum duration of the affliction */
    duration: fields.SchemaField<DurationDataSchema>;
    /** When this data was applied during initiative */
    start: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        initiative: fields.NumberField<number, number, true, true, true>;
    }>;
    fromSpell: fields.BooleanField<boolean, boolean, true, false, true>;
    /** Origin, target, and roll context of the action that spawned this affliction */
    context: EffectContextField;
};

type AfflictionOnsetSchema = {
    value: fields.NumberField<number, number, true, false, true>;
    unit: fields.StringField<TimeUnit, TimeUnit, true, false>;
};

type AfflictionStageSchema = {
    damage: fields.ArrayField<fields.SchemaField<AfflictionDamageSchema>>;
    conditions: fields.ArrayField<fields.SchemaField<AfflictionConditionSchema>>;
    effects: fields.ArrayField<fields.SchemaField<{ uuid: fields.DocumentUUIDField<ItemUUID, true, false> }>>;
    duration: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        unit: fields.StringField<
            TimeUnit | "unlimited" | "encounter",
            TimeUnit | "unlimited" | "encounter",
            true,
            false,
            true
        >;
    }>;
};

// todo: compare with other damage schemas
type AfflictionDamageSchema = {
    formula: fields.StringField<string, string, true, false, false>;
    damageType: fields.StringField<DamageType, DamageType, true, false, true>;
    category: fields.StringField<DamageCategoryUnique, DamageCategoryUnique, false, true>;
};

type AfflictionConditionSchema = {
    slug: fields.StringField<ConditionSlug, ConditionSlug, true, false>;
    value: fields.NumberField<number, number, false, true, true>;
    /** Whether the condition should disappear when the stage changes. Defaults to true */
    linked: fields.BooleanField<boolean, boolean, false, false, true>;
};

type AfflictionSystemSource = SourceFromSchema<AfflictionSystemSchema> & {
    schema?: ItemSystemSource["schema"];
};

type AfflictionFlags = ItemFlagsPF2e & {
    [SYSTEM_ID]: { aura?: EffectAuraData };
};

type AfflictionDamage = ModelPropsFromSchema<AfflictionDamageSchema>;
type AfflictionStageData = ModelPropsFromSchema<AfflictionStageSchema>;
type AfflictionConditionData = ModelPropsFromSchema<AfflictionConditionSchema>;

type AfflictionExpiryType = "turn-end";

export { AfflictionSystemData };

export type {
    AfflictionConditionData,
    AfflictionDamage,
    AfflictionExpiryType,
    AfflictionFlags,
    AfflictionSource,
    AfflictionStageData,
    AfflictionSystemSource,
};
