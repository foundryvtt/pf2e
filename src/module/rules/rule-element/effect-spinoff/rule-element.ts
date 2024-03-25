import type { ActorPF2e } from "@actor";
import type { PhysicalItemPF2e } from "@item";
import { SlugField } from "@system/schema-data-fields.ts";
import type { ArrayField, NumberField, SchemaField, StringField } from "types/foundry/common/data/fields.d.ts";
import { RuleElementOptions, RuleElementPF2e } from "../base.ts";
import type { ModelPropsFromRESchema, RuleElementSchema, RuleElementSource } from "../data.ts";
import { EffectSpinoff } from "./spinoff.ts";

class EffectSpinoffRuleElement extends RuleElementPF2e<EffectSpinoffSchema> {
    constructor(source: RuleElementSource, options: RuleElementOptions) {
        super(source, options);

        if (!this.parent.isOfType("physical")) {
            this.failValidation("parent: must be a physical item");
        }
    }

    static override defineSchema(): EffectSpinoffSchema {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            slug: new SlugField({ required: true, nullable: false, initial: undefined }),
            activation: new fields.SchemaField(
                {
                    label: new fields.StringField({ required: true, blank: false, nullable: true, initial: null }),
                    time: new fields.SchemaField({
                        value: new fields.NumberField({
                            required: true,
                            integer: true,
                            positive: true,
                            min: 1,
                            nullable: false,
                            initial: 1,
                        }),
                        unit: new fields.StringField({
                            required: true,
                            choices: ["actions", "reaction", "minutes", "hours"],
                            initial: undefined,
                        }),
                    }),
                    traits: new fields.ArrayField(
                        new fields.StringField({
                            required: true,
                            nullable: false,
                            choices: ["concentrate", "manipulate"],
                            initial: undefined,
                        }),
                        { initial: ["manipulate"] },
                    ),
                    details: new fields.StringField({ required: false, blank: false, nullable: true, initial: null }),
                },
                {
                    required: true,
                    nullable: true,
                    initial: {
                        label: null,
                        time: { value: 1, unit: "actions" },
                        traits: ["manipulate"],
                        details: null,
                    },
                },
            ),
            description: new fields.StringField({ required: false, blank: false, nullable: true, initial: null }),
        };
    }

    /** Allow an effect spinoff to be available even if its parent is an unequipped physical item. */
    protected override _initialize(options?: Record<string, unknown> | undefined): void {
        super._initialize(options);

        if (this.parent.isOfType("physical")) {
            this.requiresEquipped = false;
        }
    }

    override afterPrepareData(): void {
        if (!this.test()) return;
        const item = this.item;

        if (this.label === item.name) {
            this.label = `Effect: ${this.label}`;
        }

        if (item.isOfType("physical") && item.effectSpinoffs) {
            item.effectSpinoffs.set(this.slug, new EffectSpinoff(this));
        }
    }
}

interface EffectSpinoffRuleElement
    extends RuleElementPF2e<EffectSpinoffSchema>,
        ModelPropsFromRESchema<EffectSpinoffSchema> {
    slug: string;

    get item(): PhysicalItemPF2e<ActorPF2e>;
}

type ActivateTimeUnit = "actions" | "reaction" | "minutes" | "hours";
type ActivationTrait = "concentrate" | "manipulate";

type ActivationSchema = SchemaField<
    {
        label: StringField<string, string, true, true, true>;
        time: SchemaField<{
            value: NumberField<number, number, true, false, true>;
            unit: StringField<ActivateTimeUnit, ActivateTimeUnit, true, false, false>;
        }>;
        traits: ArrayField<StringField<"concentrate" | "manipulate", "concentrate" | "manipulate", true, false, false>>;
        details: StringField<string, string, false, true, true>;
    },
    {
        label: string | null;
        time: { value: number; unit: ActivateTimeUnit };
        details: string | null;
        traits: ActivationTrait[];
    },
    {
        label: string | null;
        time: { value: number; unit: ActivateTimeUnit };
        details: string | null;
        traits: ActivationTrait[];
    },
    true,
    true,
    true
>;

type EffectSpinoffSchema = Omit<RuleElementSchema, "slug"> & {
    slug: SlugField<true, false, false>;
    activation: ActivationSchema;
    description: StringField<string, string, false, true, true>;
};

export { EffectSpinoffRuleElement };
