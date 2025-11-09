import type { DataSchema } from "@common/abstract/_types.d.mts";
import {
    DataUnionField,
    PredicateField,
    StrictArrayField,
    StrictBooleanField,
    StrictStringField,
} from "@system/schema-data-fields.ts";
import type { AELikeDataPrepPhase } from "../ae-like.ts";
import type { ResolvableValueField, RuleElementSchema } from "../data.ts";
import type { RollOptionRuleElement } from "./rule-element.ts";
import fields = foundry.data.fields;

class Suboption extends foundry.abstract.DataModel<RollOptionRuleElement, SuboptionSchema> {
    static override defineSchema(): DataSchema {
        return {
            label: new fields.StringField({ required: true, nullable: false, blank: false }),
            value: new StrictStringField({ required: true, nullable: false, blank: false }),
            predicate: new PredicateField(),
        };
    }

    get rule(): RollOptionRuleElement {
        return this.parent;
    }

    get selected(): boolean {
        return this.rule.selection === this.value;
    }
}

interface Suboption
    extends foundry.abstract.DataModel<RollOptionRuleElement, SuboptionSchema>,
        fields.ModelPropsFromSchema<SuboptionSchema> {}

type RollOptionSchema = RuleElementSchema & {
    domain: fields.StringField<string, string, true, false, true>;
    phase: fields.StringField<AELikeDataPrepPhase, AELikeDataPrepPhase, false, false, true>;
    option: fields.StringField<string, string, true, false, false>;
    /** Suboptions for a toggle, appended to the option string */
    suboptions: DataUnionField<
        | fields.SchemaField<
              SuboptionConfigSchema,
              fields.SourceFromSchema<SuboptionConfigSchema>,
              fields.ModelPropsFromSchema<SuboptionConfigSchema>,
              false,
              false
          >
        | StrictArrayField<SuboptionField>,
        false,
        false,
        true
    >;
    /**
     * The value of the roll option: either a boolean or a string resolves to a boolean If omitted, it defaults to
     * `true` unless also `togglable`, in which case to `false`.
     */
    value: ResolvableValueField<false, false, true>;
    /** Whether this instance's suboptions are mergeable with an already-present, toggleable `RollOption` */
    mergeable: fields.BooleanField<boolean, boolean, false, false, true>;
    /** A suboption selection */
    selection: fields.StringField<string, string, false, false, false>;
    /** Whether the roll option is toggleable: a checkbox will appear in interfaces (usually actor sheets) */
    toggleable: DataUnionField<fields.StringField<"totm"> | StrictBooleanField<false>, false, false, true>;
    /** If toggleable, the location to be found in an interface */
    placement: fields.StringField<string, string, false, false, false>;
    /** An optional predicate to determine whether the toggle is interactable by the user */
    disabledIf: PredicateField<false, false, false>;
    /** The value of the roll option if its toggle is disabled: null indicates the pre-disabled value is preserved */
    disabledValue: fields.BooleanField<boolean, boolean, false, false, false>;
    /**
     * Whether this (toggleable and suboptions-containing) roll option always has a `value` of `true`, allowing only
     * suboptions to be changed
     */
    alwaysActive: fields.BooleanField<boolean, boolean, false, false, false>;
    /** Whether this roll option is countable: it will have a numeric value counting how many rules added this option */
    count: fields.BooleanField<boolean, boolean, false, false, false>;
    /** If the hosting item is an effect, remove or expire it after a matching roll is made */
    removeAfterRoll: fields.BooleanField<boolean, boolean, false, false, false>;
};

type SuboptionSchema = {
    label: fields.StringField<string, string, true, false, false>;
    value: fields.StringField<string, string, true, false, false>;
    predicate: PredicateField;
};
type SuboptionSource = fields.SourceFromSchema<SuboptionSchema>;
type SuboptionField = fields.EmbeddedDataField<Suboption, true, false, false>;

type SuboptionConfigSchema = {
    config: fields.StringField<string, string, true, false, false>;
    predicate: PredicateField;
};

export { Suboption };
export type { RollOptionSchema, SuboptionField, SuboptionSource };
