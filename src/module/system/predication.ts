type Atom = string;
type Conjunction = { and: PredicateStatement[] };
type Disjunction = { or: PredicateStatement[] };
type Negation = { not: PredicateStatement };
type JointDenial = { nor: PredicateStatement[] };
type Conditional = { if: PredicateStatement; then: PredicateStatement };
type PredicateStatement = Atom | Conjunction | Disjunction | JointDenial | Negation | Conditional;

interface RawPredicate {
    all?: PredicateStatement[];
    any?: PredicateStatement[];
    not?: PredicateStatement[];
    test?: (options?: string[]) => boolean;
}

/**
 * Encapsulates logic to determine if a modifier should be active or not for a specific roll based
 * on a list of string values. This will often be based on traits, but that is not required - sneak
 * attack could be an option that is not a trait.
 * @category PF2
 */
class PredicatePF2e implements RawPredicate {
    /** Every statement in the array is true */
    all: PredicateStatement[];
    /** At least one statement in the array is true */
    any: PredicateStatement[];
    /** None of the statements in the array are true */
    not: PredicateStatement[];
    /** Is the predicate data structurally valid? */
    isValid: boolean;

    /** Test if the given predicate passes for the given list of options. */
    static test(predicate: RawPredicate = {}, options: string[] = []): boolean {
        return predicate instanceof PredicatePF2e
            ? predicate.test(options)
            : new PredicatePF2e(predicate).test(options);
    }

    constructor(param: RawPredicate = { all: [], any: [], not: [] }) {
        this.all = deepClone(param.all ?? []);
        this.any = deepClone(param.any ?? []);
        this.not = deepClone(param.not ?? []);
        this.isValid = this.validate();
    }

    /** Structurally validate the predicates */
    private validate() {
        return (["all", "any", "not"] as const).every(
            (operator) =>
                Array.isArray(this[operator]) &&
                this[operator].every((statement) => StatementValidator.validate(statement))
        );
    }

    /** Test this predicate against a domain of discourse */
    test(options: string[] = []): boolean {
        if (!this.isValid) {
            console.error("PF2e System | The provided predicate set is malformed.");
            return false;
        }
        const domain = new Set(options);
        const { all, any, not } = this;
        return (
            all.every((p) => this.isTrue(p, domain)) &&
            !not.some((p) => this.isTrue(p, domain)) &&
            (any.length === 0 || any.some((p) => this.isTrue(p, domain)))
        );
    }

    /** Is the provided statement true? */
    private isTrue(statement: PredicateStatement, domain: Set<string>): boolean {
        return (
            (typeof statement === "string" && domain.has(statement)) ||
            (typeof statement !== "string" && this.testCompound(statement, domain))
        );
    }

    /** Is the provided compound statement true? */
    private testCompound(statement: Exclude<PredicateStatement, Atom>, domain: Set<string>): boolean {
        return (
            ("and" in statement && statement.and.every((subProp) => this.isTrue(subProp, domain))) ||
            ("or" in statement && statement.or.some((subProp) => this.isTrue(subProp, domain))) ||
            ("nor" in statement && !statement.nor.some((subProp) => this.isTrue(subProp, domain))) ||
            ("not" in statement && !this.isTrue(statement.not, domain)) ||
            ("if" in statement && !(this.isTrue(statement.if, domain) && !this.isTrue(statement.then, domain)))
        );
    }
}

class StatementValidator {
    static validate(statement: unknown): boolean {
        return this.isStatement(statement);
    }

    private static isStatement(statement: unknown): statement is PredicateStatement {
        return statement instanceof Object
            ? this.isCompound(statement)
            : typeof statement === "string"
            ? this.isAtomic(statement)
            : false;
    }

    private static isAtomic(statement: unknown): boolean {
        return typeof statement === "string" && statement.length > 0;
    }

    private static isCompound(statement: object): boolean {
        return (
            this.isAnd(statement) ||
            this.isOr(statement) ||
            this.isNor(statement) ||
            this.isNot(statement) ||
            this.isIf(statement)
        );
    }

    private static isAnd(statement: { and?: unknown }): boolean {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.and) &&
            statement.and.every((subProp) => this.isStatement(subProp))
        );
    }

    private static isOr(statement: { or?: unknown }): boolean {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.or) &&
            statement.or.every((subProp) => this.isStatement(subProp))
        );
    }

    private static isNor(statement: { nor?: unknown }): boolean {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.nor) &&
            statement.nor.every((subProp) => this.isStatement(subProp))
        );
    }

    private static isNot(statement: { not?: unknown }): boolean {
        return Object.keys(statement).length === 1 && !!statement.not && this.isStatement(statement.not);
    }

    private static isIf(statement: { if?: unknown; then?: unknown }): boolean {
        return (
            Object.keys(statement).length === 2 && this.isStatement(statement.if) && this.isStatement(statement.then)
        );
    }
}

export { PredicateStatement, PredicatePF2e, RawPredicate };
