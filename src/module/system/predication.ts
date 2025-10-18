import * as R from "remeda";

/**
 * Encapsulates logic to determine if a modifier should be active or not for a specific roll based
 * on a list of string values. This will often be based on traits, but that is not required - sneak
 * attack could be an option that is not a trait.
 * @category PF2
 */
class Predicate extends Array<PredicateStatement> {
    /** Is the predicate data structurally valid? */
    readonly isValid: boolean;

    constructor(...statements: PredicateStatement[] | [PredicateStatement[]]) {
        super(...(Array.isArray(statements[0]) ? statements[0] : (statements as PredicateStatement[])));
        this.isValid = Predicate.isValid(this);
        Object.defineProperty(this, "isValid", { enumerable: false });
    }

    /** Structurally validate the predicates */
    static isValid(statements: unknown): statements is PredicateStatement[] {
        return this.isArray(statements);
    }

    /** Is this an array of predicatation statements? */
    static override isArray(statements: unknown): statements is PredicateStatement[] {
        return super.isArray(statements) && statements.every((s) => StatementValidator.isStatement(s));
    }

    /** Test if the given predicate passes for the given list of options. */
    static test(predicate: PredicateStatement[] = [], options: Set<string> | string[]): boolean {
        return predicate instanceof Predicate ? predicate.test(options) : new Predicate(...predicate).test(options);
    }

    /** Test this predicate against a domain of discourse */
    test(options: Set<string> | string[]): boolean {
        if (this.length === 0) {
            return true;
        } else if (!this.isValid) {
            console.warn("PF2e System | The provided predicate set is malformed.");
            return false;
        }

        const domain = options instanceof Set ? options : new Set(options);
        return this.every((s) => this.isTrue(s, domain));
    }

    toObject(): RawPredicate {
        return fu.deepClone([...this]);
    }

    clone(): Predicate {
        return new Predicate(this.toObject());
    }

    /** Is the provided statement true? */
    protected isTrue(statement: PredicateStatement, domain: Set<string>): boolean {
        return (
            (typeof statement === "string" && domain.has(statement)) ||
            (StatementValidator.isBinaryOp(statement) && this.testBinaryOp(statement, domain)) ||
            (StatementValidator.isCompound(statement) && this.testCompound(statement, domain))
        );
    }

    protected testBinaryOp(statement: BinaryOperation, domain: Set<string>): boolean {
        if ("eq" in statement) {
            return typeof statement.eq[1] === "string"
                ? statement.eq[0] === statement.eq[1]
                : domain.has(`${statement.eq[0]}:${statement.eq[1]}`);
        } else {
            const operator = Object.keys(statement)[0];

            // Allow for tests of partial statements against numeric values
            // E.g., `{ "gt": ["actor:level", 5] }` would match against "actor:level:6" and "actor:level:7"
            const [left, right] = Object.values(statement)[0];
            const domainArray = Array.from(domain);
            const getValues = (operand: string | number): number[] => {
                const maybeNumber = Number(operand);
                if (!Number.isNaN(maybeNumber)) return [maybeNumber];
                const pattern = new RegExp(String.raw`^${operand}:([^:]+)$`);
                const values = domainArray
                    .map((s) => Number(pattern.exec(s)?.[1] || NaN))
                    .filter((v) => !Number.isNaN(v));
                return values.length > 0 ? values : [NaN];
            };
            const leftValues = getValues(left);
            const rightValues = getValues(right);

            switch (operator) {
                case "gt":
                    return leftValues.some((l) => rightValues.every((r) => l > r));
                case "gte":
                    return leftValues.some((l) => rightValues.every((r) => l >= r));
                case "lt":
                    return leftValues.some((l) => rightValues.every((r) => l < r));
                case "lte":
                    return leftValues.some((l) => rightValues.every((r) => l <= r));
                default:
                    console.warn("PF2e System | Malformed binary operation encountered");
                    return false;
            }
        }
    }

    /** Is the provided compound statement true? */
    protected testCompound(statement: Exclude<PredicateStatement, Atom>, domain: Set<string>): boolean {
        return (
            ("and" in statement && statement.and.every((s) => this.isTrue(s, domain))) ||
            ("nand" in statement && !statement.nand.every((s) => this.isTrue(s, domain))) ||
            ("or" in statement && statement.or.some((s) => this.isTrue(s, domain))) ||
            ("xor" in statement && statement.xor.filter((s) => this.isTrue(s, domain)).length === 1) ||
            ("nor" in statement && !statement.nor.some((s) => this.isTrue(s, domain))) ||
            ("not" in statement && !this.isTrue(statement.not, domain)) ||
            ("if" in statement && !(this.isTrue(statement.if, domain) && !this.isTrue(statement.then, domain))) ||
            ("iff" in statement &&
                (statement.iff.every((s) => this.isTrue(s, domain)) ||
                    statement.iff.every((s) => !this.isTrue(s, domain))))
        );
    }
}

/** A `Predicate` that caches the test method for all contained `PredicateStatements`.
 *  This is a 4-5x speed increase for cases where the same predicate is tested against 1000+
 *  different domains.
 */
class CachedPredicate extends Predicate {
    #statementCache = new Map<PredicateStatement, (d: Set<string>) => boolean>();

    protected override isTrue(statement: PredicateStatement, domain: Set<string>): boolean {
        if (typeof statement === "string") return domain.has(statement);

        if (!this.#statementCache.has(statement)) {
            if (StatementValidator.isBinaryOp(statement)) {
                this.#statementCache.set(statement, (d) => this.testBinaryOp(statement, d));
            } else if (StatementValidator.isCompound(statement)) {
                this.#statementCache.set(statement, (d) => this.testCompound(statement, d));
            }
        }

        return !!this.#statementCache.get(statement)?.(domain);
    }
}

class StatementValidator {
    static isStatement(statement: unknown): statement is PredicateStatement {
        return R.isPlainObject(statement)
            ? this.isCompound(statement) || this.isBinaryOp(statement)
            : typeof statement === "string"
              ? this.isAtomic(statement)
              : false;
    }

    static isAtomic(statement: unknown): statement is Atom {
        return (typeof statement === "string" && statement.length > 0) || this.isBinaryOp(statement);
    }

    static #binaryOperators = new Set(["eq", "gt", "gte", "lt", "lte"]);

    static isBinaryOp(statement: unknown): statement is BinaryOperation {
        if (!R.isPlainObject(statement)) return false;
        const entries = Object.entries(statement);
        if (entries.length > 1) return false;
        const [operator, operands]: [string, unknown] = entries[0];
        return (
            this.#binaryOperators.has(operator) &&
            Array.isArray(operands) &&
            operands.length === 2 &&
            typeof operands[0] === "string" &&
            ["string", "number"].includes(typeof operands[1])
        );
    }

    static isCompound(statement: unknown): statement is CompoundStatement {
        return (
            R.isPlainObject(statement) &&
            (this.#isAnd(statement) ||
                this.#isOr(statement) ||
                this.#isNand(statement) ||
                this.#isXor(statement) ||
                this.#isNor(statement) ||
                this.#isNot(statement) ||
                this.#isIf(statement) ||
                this.#isIff(statement))
        );
    }

    static #isAnd(statement: { and?: unknown }): statement is Conjunction {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.and) &&
            statement.and.every((subProp) => this.isStatement(subProp))
        );
    }

    static #isNand(statement: { nand?: unknown }): statement is AlternativeDenial {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.nand) &&
            statement.nand.every((subProp) => this.isStatement(subProp))
        );
    }

    static #isOr(statement: { or?: unknown }): statement is Disjunction {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.or) &&
            statement.or.every((subProp) => this.isStatement(subProp))
        );
    }

    static #isXor(statement: { xor?: unknown }): statement is ExclusiveDisjunction {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.xor) &&
            statement.xor.every((subProp) => this.isStatement(subProp))
        );
    }

    static #isNor(statement: { nor?: unknown }): statement is JointDenial {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.nor) &&
            statement.nor.every((subProp) => this.isStatement(subProp))
        );
    }

    static #isNot(statement: { not?: unknown }): statement is Negation {
        return Object.keys(statement).length === 1 && !!statement.not && this.isStatement(statement.not);
    }

    static #isIf(statement: { if?: unknown; then?: unknown }): statement is Conditional {
        return (
            Object.keys(statement).length === 2 && this.isStatement(statement.if) && this.isStatement(statement.then)
        );
    }

    static #isIff(statement: { iff?: unknown }): statement is Biconditional {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.iff) &&
            statement.iff.every((s) => this.isStatement(s))
        );
    }
}

type EqualTo = { eq: [string, string | number] };
type GreaterThan = { gt: [string, string | number] };
type GreaterThanEqualTo = { gte: [string, string | number] };
type LessThan = { lt: [string, string | number] };
type LessThanEqualTo = { lte: [string, string | number] };
type BinaryOperation = EqualTo | GreaterThan | GreaterThanEqualTo | LessThan | LessThanEqualTo;
type Atom = string | BinaryOperation;

type Conjunction = { and: PredicateStatement[] };
type Disjunction = { or: PredicateStatement[] };
type ExclusiveDisjunction = { xor: PredicateStatement[] };
type Negation = { not: PredicateStatement };
type AlternativeDenial = { nand: PredicateStatement[] };
type JointDenial = { nor: PredicateStatement[] };
type Conditional = { if: PredicateStatement; then: PredicateStatement };
type Biconditional = { iff: PredicateStatement[] };
type CompoundStatement =
    | Conjunction
    | Disjunction
    | ExclusiveDisjunction
    | AlternativeDenial
    | JointDenial
    | Negation
    | Conditional
    | Biconditional;

type PredicateStatement = Atom | CompoundStatement;

type RawPredicate = PredicateStatement[];

export { CachedPredicate, Predicate, StatementValidator };
export type { PredicateStatement, RawPredicate };
