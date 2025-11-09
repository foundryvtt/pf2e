import type { ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.d.mts";
import type { AbstractEffectSchema, DurationData } from "@item/abstract-effect/data.ts";
import type { EffectTrait } from "@item/abstract-effect/types.ts";
import { ItemSystemModel } from "@item/base/data/model.ts";
import type { BaseItemSourcePF2e, ItemSystemSource } from "@item/base/data/system.ts";
import type { ItemType } from "@item/types.ts";
import type { DamageType } from "@system/damage/index.ts";
import type { DamageRoll } from "@system/damage/roll.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { ConditionPF2e } from "./document.ts";
import type { ConditionSlug } from "./types.ts";
import fields = foundry.data.fields;

type ConditionSource = BaseItemSourcePF2e<"condition", ConditionSystemSource>;

class ConditionSystemData extends ItemSystemModel<ConditionPF2e, ConditionSystemSchema> {
    static override defineSchema(): ConditionSystemSchema {
        const effectTraits: Record<EffectTrait, string> = CONFIG.PF2E.effectTraits;
        const damageTypes: Record<DamageType, string> = CONFIG.PF2E.damageTypes;

        const createRefListSchema = (): fields.ArrayField<fields.SchemaField<ReferenceSchema<"condition">>> =>
            new fields.ArrayField(
                new fields.SchemaField({
                    id: new fields.StringField({ required: true, nullable: false }),
                    type: new fields.StringField({
                        choices: ["condition"] as const,
                        required: true,
                        initial: "condition",
                    }),
                }),
            );

        return {
            ...super.defineSchema(),
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
            fromSpell: new fields.BooleanField({ required: true, nullable: false }),
            group: new fields.StringField({ required: true, nullable: true, initial: null }),
            value: new fields.SchemaField({
                isValued: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                value: new fields.NumberField({ required: true, nullable: true, initial: null }),
            }),
            persistent: new fields.SchemaField(
                {
                    formula: new fields.StringField({ required: true, nullable: false }),
                    damageType: new fields.StringField({
                        choices: damageTypes,
                        required: true,
                        nullable: false,
                        initial: "untyped" as DamageType,
                    }),
                    dc: new fields.NumberField({ required: true, nullable: false, initial: 15 }),
                    criticalHit: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                },
                { required: true, nullable: true, initial: null },
            ),
            references: new fields.SchemaField({
                parent: new fields.SchemaField(
                    {
                        id: new fields.StringField({ required: true, nullable: false }),
                    },
                    { required: true, nullable: true, initial: null },
                ),
                children: createRefListSchema(),
                overrides: createRefListSchema(),
                overriddenBy: createRefListSchema(),
            }),
            overrides: new fields.ArrayField(new fields.StringField()),
        };
    }

    override prepareBaseData(): void {
        this.duration = {
            value: -1,
            unit: "unlimited",
            expiry: null,
        };
    }
}

interface ConditionSystemData
    extends ItemSystemModel<ConditionPF2e, ConditionSystemSchema>,
        Omit<ModelPropsFromSchema<ConditionSystemSchema>, "description" | "value"> {
    slug: ConditionSlug;
    duration: DurationData;
    value: ConditionValueData;
    persistent: PersistentDamageData | null;
}

type ConditionSystemSchema = AbstractEffectSchema & {
    group: fields.StringField<string, string, true, true, true>;
    value: fields.SchemaField<ConditionValueSchema>;
    persistent?: fields.SchemaField<
        PersistentDamageValueSchema,
        SourceFromSchema<PersistentDamageValueSchema>,
        ModelPropsFromSchema<PersistentDamageValueSchema>,
        true,
        true,
        true
    >;
    references: fields.SchemaField<{
        parent: fields.SchemaField<
            ConditionParentSchema,
            SourceFromSchema<ConditionParentSchema>,
            ModelPropsFromSchema<ConditionParentSchema>,
            true,
            true,
            true
        >;
        children: fields.ArrayField<fields.SchemaField<ReferenceSchema<"condition">>>;
        overrides: fields.ArrayField<fields.SchemaField<ReferenceSchema<"condition">>>;
        overriddenBy: fields.ArrayField<fields.SchemaField<ReferenceSchema<"condition">>>;
    }>;
    overrides: fields.ArrayField<fields.StringField>;
};

type ConditionParentSchema = {
    id: fields.StringField<string, string, true, false, true>;
};

type ReferenceSchema<T extends ItemType> = {
    id: fields.StringField<string, string, true, false, true>;
    type: fields.StringField<T, T, true, false, true>;
};

type ConditionValueSchema = {
    isValued: fields.BooleanField<boolean, boolean, true, false>;
    value: fields.NumberField<number, number, true, true>;
};

type ConditionSystemSource = SourceFromSchema<ConditionSystemSchema> & {
    slug: ConditionSlug;
    level?: never;
    schema?: ItemSystemSource["schema"];
};

type PersistentDamageValueSchema = {
    formula: fields.StringField<string, string, true, false, true>;
    damageType: fields.StringField<DamageType, DamageType, true, false, true>;
    dc: fields.NumberField<number, number, true, false, true>;
    /** Whether this damage was multiplied due to a critical hit */
    criticalHit: fields.BooleanField<boolean, boolean, true, false, true>;
};

interface PersistentDamageData extends SourceFromSchema<PersistentDamageValueSchema> {
    damage: DamageRoll;
    expectedValue: number;
}

type ConditionValueData = { isValued: true; value: number } | { isValued: false; value: null };

export { ConditionSystemData };
export type { ConditionSource, ConditionSystemSource, PersistentDamageData, PersistentDamageValueSchema };
