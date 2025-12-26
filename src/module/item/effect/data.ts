import type { ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.d.mts";
import {
    DurationDataSchema,
    EffectBadgeCounterSchema,
    EffectBadgeFormulaSchema,
    EffectBadgeValueSchema,
    EffectContextField,
} from "@item/abstract-effect/data.ts";
import type { AbstractEffectSchema, EffectAuraData, EffectBadge } from "@item/abstract-effect/index.ts";
import type { BadgeReevaluationEventType, EffectTrait } from "@item/abstract-effect/types.ts";
import { EFFECT_TIME_UNITS } from "@item/abstract-effect/values.ts";
import { ItemSystemModel } from "@item/base/data/model.ts";
import type {
    BaseItemSourcePF2e,
    ItemFlagsPF2e,
    ItemSourceFlagsPF2e,
    ItemSystemSource,
} from "@item/base/data/system.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { EffectPF2e } from "./document.ts";
import fields = foundry.data.fields;

type EffectSource = BaseItemSourcePF2e<"effect", EffectSystemSource> & {
    flags: ItemSourceFlagsPF2e & {
        [SYSTEM_ID]?: {
            aura?: EffectAuraData;
        };
    };
};

class EffectSystemData extends ItemSystemModel<EffectPF2e, EffectSystemSchema> {
    static override defineSchema(): EffectSystemSchema {
        const effectTraits: Record<EffectTrait, string> = CONFIG.PF2E.effectTraits;

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
                sustained: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            }),
            tokenIcon: new fields.SchemaField({
                show: new fields.BooleanField({ required: true, nullable: false, initial: true }),
            }),
            unidentified: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            start: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                initiative: new fields.NumberField({ required: true, nullable: true, initial: null }),
            }),
            badge: new EffectBadgeField(),
            fromSpell: new fields.BooleanField({ required: true, nullable: false }),
            context: new EffectContextField(),
        };
    }

    override prepareBaseData(): void {
        if (["unlimited", "encounter"].includes(this.duration.unit)) {
            this.duration.expiry = null;
        } else {
            this.duration.expiry ||= "turn-start";
        }

        // Prepare badge data
        const badge = this.badge;
        if (badge?.type === "formula") {
            badge.label = null;
        } else if (badge) {
            badge.min = badge.labels ? 1 : (badge.min ?? 1);
            badge.max = badge.labels?.length ?? badge.max ?? Infinity;
            badge.value = Math.clamp(badge.value, badge.min, badge.max);
            badge.label = badge.labels?.at(badge.value - 1)?.trim() || null;

            if (badge.type === "value" && badge.reevaluate) {
                badge.reevaluate.initial ??= badge.value;
            }
        }
    }
}

interface EffectSystemData
    extends ItemSystemModel<EffectPF2e, EffectSystemSchema>,
        Omit<ModelPropsFromSchema<EffectSystemSchema>, "description" | "badge"> {
    expired: boolean;
    badge: EffectBadge | null;
    _source: EffectSystemSource;
}

class EffectBadgeField extends fields.TypedSchemaField<
    {
        counter: fields.SchemaField<EffectBadgeCounterSchema>;
        value: fields.SchemaField<EffectBadgeValueSchema>;
        formula: fields.SchemaField<EffectBadgeFormulaSchema>;
    },
    true,
    true,
    true
> {
    constructor() {
        const reevaluationEvent: BadgeReevaluationEventType[] = ["initiative-roll", "turn-start", "turn-end"] as const;

        const createLabelsField = (): fields.ArrayField<
            fields.StringField<string, string, true, false>,
            string[],
            string[],
            false,
            true,
            true
        > =>
            new fields.ArrayField(new fields.StringField({ required: true, blank: true }), {
                required: false,
                nullable: true,
                initial: null,
            });

        super(
            {
                counter: new fields.SchemaField({
                    type: new fields.StringField({ choices: ["counter"], required: true }),
                    labels: createLabelsField(),
                    min: new fields.NumberField({ required: false, nullable: true, integer: true }),
                    max: new fields.NumberField({ required: false, nullable: true, integer: true }),
                    value: new fields.NumberField({ required: true, nullable: false }),
                    loop: new fields.BooleanField({ required: false, nullable: false }),
                }),
                value: new fields.SchemaField({
                    type: new fields.StringField({ choices: ["value"], required: true }),
                    labels: createLabelsField(),
                    value: new fields.NumberField({ required: true, nullable: false }),
                    reevaluate: new fields.SchemaField(
                        {
                            event: new fields.StringField({
                                choices: reevaluationEvent,
                                required: true,
                                nullable: false,
                            }),
                            formula: new fields.StringField({ required: true, nullable: false }),
                            initial: new fields.NumberField({ required: false, nullable: false }),
                        },
                        { required: true, nullable: true, initial: null },
                    ),
                }),
                formula: new fields.SchemaField({
                    type: new fields.StringField({ choices: ["formula"], required: true }),
                    labels: createLabelsField(),
                    value: new fields.StringField({ required: true, nullable: false, blank: true }),
                    evaluate: new fields.BooleanField({ required: false, nullable: false }),
                    reevaluate: new fields.StringField({
                        choices: reevaluationEvent,
                        required: true,
                        nullable: true,
                        initial: null,
                    }),
                }),
            },
            { required: true, nullable: true, initial: null },
        );
    }
}

type EffectSystemSchema = AbstractEffectSchema & {
    level: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    duration: fields.SchemaField<
        DurationDataSchema & {
            sustained: fields.BooleanField<boolean, boolean, true, false, true>;
        }
    >;
    tokenIcon: fields.SchemaField<{
        show: fields.BooleanField<boolean, boolean, true, false, true>;
    }>;
    unidentified: fields.BooleanField<boolean, boolean, true, false, true>;
    /** When this data was applied during initiative */
    start: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        initiative: fields.NumberField<number, number, true, true, true>;
    }>;
    /** A numeric value or dice expression of some rules significance to the effect */
    badge: EffectBadgeField;
    /** Origin, target, and roll context of the action that spawned this effect */
    context: EffectContextField;
};

type EffectFlags = ItemFlagsPF2e & {
    [SYSTEM_ID]: {
        aura?: EffectAuraData;
    };
};

type EffectSystemSource = SourceFromSchema<EffectSystemSchema> & {
    schema?: ItemSystemSource["schema"];
};

export { EffectSystemData };
export type { EffectFlags, EffectSource };
