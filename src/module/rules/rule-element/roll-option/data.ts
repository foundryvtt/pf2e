import { DataUnionField, PredicateField, StrictBooleanField, StrictStringField } from "@system/schema-data-fields.ts";
import type {
    ArrayField,
    BooleanField,
    DataSchema,
    EmbeddedDataField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import type { AELikeDataPrepPhase } from "../ae-like.ts";
import type { ResolvableValueField, RuleElementSchema } from "../data.ts";
import type { RollOptionRuleElement } from "./rule-element.ts";

class Suboption extends foundry.abstract.DataModel<RollOptionRuleElement, SuboptionSchema> {
    static override defineSchema(): DataSchema {
        return {
            label: new foundry.data.fields.StringField({ required: true, nullable: false, blank: false }),
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
        ModelPropsFromSchema<SuboptionSchema> {}

type RollOptionSchema = RuleElementSchema & {
    domain: StringField<string, string, true, false, true>;
    phase: StringField<AELikeDataPrepPhase, AELikeDataPrepPhase, false, false, true>;
    option: StringField<string, string, true, false, false>;
    /** Suboptions for a toggle, appended to the option string */
    suboptions: ArrayField<SuboptionField>;
    /**
     * The value of the roll option: either a boolean or a string resolves to a boolean If omitted, it defaults to
     * `true` unless also `togglable`, in which case to `false`.
     */
    value: ResolvableValueField<false, false, true>;
    /** Whether this instance's suboptions are mergeable with an already-present, toggleable `RollOption` */
    mergeable: BooleanField<boolean, boolean, false, false, true>;
    /** A suboption selection */
    selection: StringField<string, string, false, false, false>;
    /** Whether the roll option is toggleable: a checkbox will appear in interfaces (usually actor sheets) */
    toggleable: DataUnionField<StrictStringField<"totm"> | StrictBooleanField, false, false, true>;
    /** If toggleable, the location to be found in an interface */
    placement: StringField<string, string, false, false, false>;
    /** An optional predicate to determine whether the toggle is interactable by the user */
    disabledIf: PredicateField<false, false, false>;
    /** The value of the roll option if its toggle is disabled: null indicates the pre-disabled value is preserved */
    disabledValue: BooleanField<boolean, boolean, false, false, false>;
    /**
     * Whether this (toggleable and suboptions-containing) roll option always has a `value` of `true`, allowing only
     * suboptions to be changed
     */
    alwaysActive: BooleanField<boolean, boolean, false, false, false>;
    /** Whether this roll option is countable: it will have a numeric value counting how many rules added this option */
    count: BooleanField<boolean, boolean, false, false, false>;
    /** If the hosting item is an effect, remove or expire it after a matching roll is made */
    removeAfterRoll: BooleanField<boolean, boolean, false, false, false>;
};

type SuboptionSchema = {
    label: StringField<string, string, true, false, false>;
    value: StringField<string, string, true, false, false>;
    predicate: PredicateField;
};
type SuboptionSource = SourceFromSchema<SuboptionSchema>;
type SuboptionField = EmbeddedDataField<Suboption, true, false, false>;

export { Suboption };
export type { RollOptionSchema, SuboptionField, SuboptionSource };
