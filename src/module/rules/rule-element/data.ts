import { RawPredicate } from "@system/predication.ts";
import { PredicateField, SlugField } from "@system/schema-data-fields.ts";
import { isObject } from "@util";
import type { BooleanField, NumberField, StringField } from "types/foundry/common/data/fields.d.ts";

type RuleElementSource = {
    key?: unknown;
    data?: unknown;
    value?: unknown;
    label?: unknown;
    slug?: unknown;
    predicate?: unknown;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority?: number;
    ignored?: unknown;
    requiresInvestment?: unknown;
    requiresEquipped?: unknown;
    removeUponCreate?: unknown;
};

interface RuleElementData extends RuleElementSource {
    key: string;
    value?: RuleValue;
    label: string;
    slug?: string | null;
    predicate?: RawPredicate;
    priority: number;
    ignored: boolean;
    removeUponCreate?: boolean;
}

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
    priority: NumberField<number, number, false, false, true>;
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
    THasInitial extends boolean = false
> extends foundry.data.fields.DataField<RuleValue, RuleValue, TRequired, TNullable, THasInitial> {
    protected override _validateType(value: unknown): boolean {
        return value !== null && ["string", "number", "object", "boolean"].includes(typeof value);
    }

    /** No casting is applied to this value */
    protected _cast(value: unknown): unknown {
        return value;
    }

    protected override _cleanType(value: RuleValue): RuleValue {
        if (typeof value === "string") return value.trim();
        if (isObject<BracketedValue>(value) && Array.isArray(value.brackets)) {
            value.field ??= "actor|level";
        }

        return value;
    }
}

export {
    Bracket,
    BracketedValue,
    ResolvableValueField,
    RuleElementData,
    RuleElementSchema,
    RuleElementSource,
    RuleValue,
};
