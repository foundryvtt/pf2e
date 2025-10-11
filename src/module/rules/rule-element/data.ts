import { PredicateField, SlugField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import fields = foundry.data.fields;

type RuleElementSource = {
    key: string;
    label?: string;
    slug?: string | null;
    predicate?: JSONValue;
    priority?: JSONValue;
    ignored?: JSONValue;
    requiresInvestment?: JSONValue;
    requiresEquipped?: JSONValue;
    removeUponCreate?: JSONValue;
};

type RuleValue = Exclude<JSONValue, undefined>;

type RuleElementSchema = {
    key: fields.StringField<string, string, true, false, false>;
    /** An identifying slug for the rule element: its significance and restrictions are determined per RE type */
    slug: SlugField;
    /** A label for use by any rule element for display in an interface */
    label: fields.StringField<string, string, false, false, false>;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority: fields.NumberField<number, number, true, false, true>;
    /** A test of whether the rules element is to be applied */
    predicate: PredicateField;
    /** Whether the rule element is ignored and deactivated */
    ignored: fields.BooleanField<boolean, boolean, true, false, true>;
    /** Whether the rule element requires that the parent item (if physical) be equipped */
    requiresEquipped: fields.BooleanField<boolean, boolean, false, true, true>;
    /** Whether the rule element requires that the parent item (if physical) be invested */
    requiresInvestment: fields.BooleanField<boolean, boolean, false, true, true>;
    /** A grouping slug to mark a rule as a part of a spinoff effect, which some item types can compose */
    spinoff: SlugField<false, false, false>;
};

class ResolvableValueField<
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean = false,
> extends fields.DataField<RuleValue, RuleValue, TRequired, TNullable, THasInitial> {
    protected override _validateType(value: JSONValue): false | void {
        if (!["string", "number", "object", "boolean"].includes(typeof value)) return false;
    }

    /** No casting is applied to this value */
    protected override _cast(value: JSONValue): JSONValue {
        return value;
    }

    /** Coerce a string value that looks like a number into a number. */
    #coerceNumber(value: string): number | string | null {
        const trimmed = value.trim();
        return this.nullable && trimmed === ""
            ? null
            : /^-?\d+(?:\.\d+)?$/.test(trimmed)
              ? Number(trimmed)
              : trimmed || 0;
    }

    protected override _cleanType(value: JSONValue): RuleValue | undefined {
        if ((value === null && this.nullable) || (value === undefined && !this.required)) return value;
        if (typeof value === "number" || typeof value === "boolean") return value;
        if (typeof value === "string") return this.#coerceNumber(value);
        if (R.isPlainObject(value) && "brackets" in value) {
            value.field ||= "actor|level";
            const brackets = (value.brackets = Object.values(value.brackets ?? {}).filter(R.isTruthy));
            for (const bracket of brackets) {
                if (bracket.start === null) delete bracket.start;
                if (bracket.end === null) delete bracket.end;
                bracket.value =
                    typeof bracket.value === "string" ? (this.#coerceNumber(bracket.value) ?? 0) : bracket.value;
            }
        }
        if (R.isObjectType(value)) return value;
        return String(value);
    }

    protected override _toInput(config: foundry.data.FormInputConfig<string>): HTMLInputElement {
        return foundry.applications.fields.createTextInput(config);
    }
}

type ModelPropsFromRESchema<TSchema extends RuleElementSchema> = Omit<fields.ModelPropsFromSchema<TSchema>, "label">;

export { ResolvableValueField };
export type { ModelPropsFromRESchema, RuleElementSchema, RuleElementSource, RuleValue };
