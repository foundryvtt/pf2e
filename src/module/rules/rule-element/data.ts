import { PredicatePF2e, RawPredicate } from "@system/predication";

type RuleElementSource = {
    key: string;
    data?: unknown;
    selector?: string;
    value?: RuleValue | BracketedValue;
    label?: string;
    slug?: unknown;
    predicate?: RawPredicate;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority?: number;
    ignored?: unknown;
    requiresInvestment?: unknown;
    requiresEquipped?: unknown;
    removeUponCreate?: unknown;
};

interface RuleElementData extends RuleElementSource {
    key: string;
    data?: object;
    selector?: string;
    value?: RuleValue | BracketedValue;
    label: string;
    slug?: string | null;
    predicate?: PredicatePF2e;
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
