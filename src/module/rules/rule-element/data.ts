import { PredicateField, SlugField } from "@system/schema-data-fields";
import { RawPredicate } from "@system/predication";
import { BooleanField, NumberField, StringField } from "types/foundry/common/data/fields.mjs";

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
    value?: RuleValue | BracketedValue;
    label: string;
    slug?: string | null;
    predicate?: RawPredicate;
    priority: number;
    ignored: boolean;
    removeUponCreate?: boolean;
}

type RuleValue = string | number | boolean | object | null;

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
    key: StringField<string, string, true>;
    /** An identifying slug for the rule element: its significance and restrictions are determined per RE type */
    slug: SlugField;
    /** A label for use by any rule element for display in an interface */
    label: StringField;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority: NumberField<number, number, false, false, true>;
    /** A test of whether the rules element is to be applied */
    predicate: PredicateField;
    /** Whether the rule element is ignored and deactivated */
    ignored: BooleanField;
    /** Whether the rule element requires that the parent item (if physical) be equipped */
    requiresEquipped: BooleanField<boolean, boolean, false, true, false>;
    /** Whether the rule element requires that the parent item (if physical) be invested */
    requiresInvestment: BooleanField<boolean, boolean, false, true, false>;
};

export { Bracket, BracketedValue, RuleElementData, RuleElementSchema, RuleElementSource, RuleValue };
