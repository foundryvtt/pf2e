import { RawPredicate } from "@system/predication";

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

export { Bracket, BracketedValue, RuleElementData, RuleElementSource, RuleValue };
