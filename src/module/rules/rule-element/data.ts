import { PredicateField, SlugField } from "@system/schema-data-fields.ts";
import { isObject } from "@util";
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

type RuleValue = string | number | boolean | object | BracketedValue;

interface Bracket<T extends object | number | string> {
    start?: number;
    end?: number;
    value: T;
}

interface BracketedValue<T extends object | number | string = object | number | string> {
    field?: string;
    brackets: Bracket<T>[];
}

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
    ignored: fields.BooleanField<boolean, boolean, false, false, true>;
    /** Whether the rule element requires that the parent item (if physical) be equipped */
    requiresEquipped: fields.BooleanField<boolean, boolean, false, true, false>;
    /** Whether the rule element requires that the parent item (if physical) be invested */
    requiresInvestment: fields.BooleanField<boolean, boolean, false, true, false>;
    /** A grouping slug to mark a rule as a part of a spinoff effect, which some item types can compose */
    spinoff: SlugField<false, false, false>;
};

class ResolvableValueField<
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean = false,
> extends fields.DataField<RuleValue, RuleValue, TRequired, TNullable, THasInitial> {
    protected override _validateType(value: JSONValue): boolean {
        return value !== null && ["string", "number", "object", "boolean"].includes(typeof value);
    }

    /** No casting is applied to this value */
    protected override _cast(value: JSONValue): JSONValue {
        return value;
    }

    /** Coerce a string value that looks like a number into a number. */
    #coerceNumber(value: string): number | string {
        const trimmed = value.trim();
        return /^-?\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : trimmed || 0;
    }

    protected override _cleanType(value: RuleValue): RuleValue {
        if (typeof value === "string") {
            return this.#coerceNumber(value);
        }

        if (isObject<BracketedValue>(value) && "brackets" in value) {
            value.field ||= "actor|level";
            const brackets = (value.brackets = Object.values(value.brackets ?? {}).filter(R.isTruthy));
            for (const bracket of brackets) {
                if (bracket.start === null) delete bracket.start;
                if (bracket.end === null) delete bracket.end;
                bracket.value = typeof bracket.value === "string" ? this.#coerceNumber(bracket.value) : bracket.value;
            }
        }

        return value;
    }
}

type ModelPropsFromRESchema<TSchema extends RuleElementSchema> = Omit<fields.ModelPropsFromSchema<TSchema>, "label">;

export { ResolvableValueField };
export type { Bracket, BracketedValue, ModelPropsFromRESchema, RuleElementSchema, RuleElementSource, RuleValue };
