import { PredicateField, SlugField } from "@system/schema-data-fields.ts";
import { isObject } from "@util";
import * as R from "remeda";
import type { BooleanField, NumberField, StringField } from "types/foundry/common/data/fields.d.ts";

type RuleElementSource = {
    key?: JSONValue;
    data?: JSONValue;
    value?: JSONValue;
    label?: JSONValue;
    slug?: JSONValue;
    predicate?: JSONValue;
    priority?: JSONValue;
    ignored?: JSONValue;
    requiresInvestment?: JSONValue;
    requiresEquipped?: JSONValue;
    removeUponCreate?: JSONValue;
};

type RuleValue = string | number | boolean | object | BracketedValue | null;

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
    key: StringField<string, string, true, false, false>;
    /** An identifying slug for the rule element: its significance and restrictions are determined per RE type */
    slug: SlugField;
    /** A label for use by any rule element for display in an interface */
    label: StringField<string, string, true, false, false>;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority: NumberField<number, number, true, false, true>;
    /** A test of whether the rules element is to be applied */
    predicate: PredicateField;
    /** Whether the rule element is ignored and deactivated */
    ignored: BooleanField<boolean, boolean, false, false, true>;
    /** Whether the rule element requires that the parent item (if physical) be equipped */
    requiresEquipped: BooleanField<boolean, boolean, false, true, false>;
    /** Whether the rule element requires that the parent item (if physical) be invested */
    requiresInvestment: BooleanField<boolean, boolean, false, true, false>;
};

class ResolvableValueField<
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean = false,
> extends foundry.data.fields.DataField<RuleValue, RuleValue, TRequired, TNullable, THasInitial> {
    protected override _validateType(value: unknown): boolean {
        return value !== null && ["string", "number", "object", "boolean"].includes(typeof value);
    }

    /** No casting is applied to this value */
    protected _cast(value: unknown): unknown {
        return value;
    }

    /** Coerce a string value that looks like a number into a number. */
    #coerceNumber(value: string): number | string {
        const trimmed = value.trim();
        return /^\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : trimmed || 0;
    }

    protected override _cleanType(value: RuleValue): RuleValue {
        if (typeof value === "string") {
            return this.#coerceNumber(value);
        }

        if (isObject<BracketedValue>(value) && "brackets" in value) {
            value.field ||= "actor|level";
            const brackets = (value.brackets = R.compact(Object.values(value.brackets ?? {})));
            for (const bracket of brackets) {
                if (bracket.start === null) delete bracket.start;
                if (bracket.end === null) delete bracket.end;
                bracket.value = typeof bracket.value === "string" ? this.#coerceNumber(bracket.value) : bracket.value;
            }
        }

        return value;
    }
}

export { ResolvableValueField };
export type { Bracket, BracketedValue, RuleElementSchema, RuleElementSource, RuleValue };
