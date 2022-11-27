import { isObject } from "@util";

/**
 * Encapsulates logic to determine if a modifier should be active or not for a specific roll based
 * on a list of string values. This will often be based on traits, but that is not required - sneak
 * attack could be an option that is not a trait.
 * @category PF2
 */
class PredicatePF2e extends Array<PredicateStatement> {
    /** Is the predicate data structurally valid? */
    readonly isValid: boolean;

    constructor(...statements: PredicateStatement[] | [PredicateStatement[]]) {
        if (Array.isArray(statements[0])) {
            super(...statements[0]);
        } else {
            super(...(statements as PredicateStatement[]));
        }
        this.isValid = PredicatePF2e.isValid(this);
    }

    /** Structurally validate the predicates */
    static isValid(statements: unknown): statements is PredicateStatement[] {
        return this.isArray(statements);
    }

    /** Is this an array of predicatation statements? */
    static override isArray(statements: unknown): statements is PredicateStatement[] {
        return super.isArray(statements) && statements.every((s) => StatementValidator.validate(s));
    }

    /** Test if the given predicate passes for the given list of options. */
    static test(predicate: PredicateStatement[] = [], options: Set<string> | string[]): boolean {
        return predicate instanceof PredicatePF2e
            ? predicate.test(options)
            : new PredicatePF2e(...predicate).test(options);
    }

    /** Create a predicate from unknown data, with deprecation support for legacy objects */
    static create(data: unknown, warn = false): PredicatePF2e {
        if (data instanceof PredicatePF2e) return data.clone();
        if (Array.isArray(data)) return new PredicatePF2e(data);
        if (isObject<OldRawPredicate>(data)) {
            if (warn) {
                foundry.utils.logCompatibilityWarning("Predicate data must be an array", {
                    mode: CONST.COMPATIBILITY_MODES.WARNING,
                    since: "4.2.0",
                    until: "4.5.0",
                });
            }

            return new PredicatePF2e(convertLegacyData(data));
        }

        return new PredicatePF2e();
    }

    /** Test this predicate against a domain of discourse */
    test(options: Set<string> | string[]): boolean {
        if (!this.isValid) {
            console.error("PF2e System | The provided predicate set is malformed.");
            return false;
        }
        const domain = options instanceof Set ? options : new Set(options);
        return this.every((s) => this.isTrue(s, domain));
    }

    toObject(): RawPredicate {
        return deepClone([...this]);
    }

    clone(): PredicatePF2e {
        return new PredicatePF2e(this.toObject());
    }

    /** Is the provided statement true? */
    private isTrue(statement: PredicateStatement, domain: Set<string>): boolean {
        return (
            (typeof statement === "string" && domain.has(statement)) ||
            (StatementValidator.isBinaryOp(statement) && this.testBinaryOp(statement, domain)) ||
            (StatementValidator.isCompound(statement) && this.testCompound(statement, domain))
        );
    }

    private testBinaryOp(statement: BinaryOperation, domain: Set<string>): boolean {
        if ("eq" in statement) {
            return domain.has(`${statement.eq[0]}:${statement.eq[1]}`);
        } else {
            const operator = Object.keys(statement)[0];

            // Allow for tests of partial statements against numeric values
            // E.g., `{ "gt": ["actor:level", 5] }` would match against "actor:level:6" and "actor:level:7"
            const [left, right] = Object.values(statement)[0];
            const domainArray = Array.from(domain);
            const leftValues =
                typeof left === "number" || !Number.isNaN(Number(left))
                    ? [Number(left)]
                    : domainArray.flatMap((d) => (d.startsWith(left) ? Number(/:(-?\d+)$/.exec(d)?.[1]) : []));
            const rightValues =
                typeof right === "number" || !Number.isNaN(Number(right))
                    ? [Number(right)]
                    : domainArray.flatMap((d) => (d.startsWith(right) ? Number(/:(-?\d+)$/.exec(d)?.[1]) : []));

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
                    console.warn("PF2e System | Malformed binary operation encounter");
                    return false;
            }
        }
    }

    /** Is the provided compound statement true? */
    private testCompound(statement: Exclude<PredicateStatement, Atom>, domain: Set<string>): boolean {
        return (
            ("and" in statement && statement.and.every((subProp) => this.isTrue(subProp, domain))) ||
            ("nand" in statement && !statement.nand.every((subProp) => this.isTrue(subProp, domain))) ||
            ("or" in statement && statement.or.some((subProp) => this.isTrue(subProp, domain))) ||
            ("nor" in statement && !statement.nor.some((subProp) => this.isTrue(subProp, domain))) ||
            ("not" in statement && !this.isTrue(statement.not, domain)) ||
            ("if" in statement && !(this.isTrue(statement.if, domain) && !this.isTrue(statement.then, domain)))
        );
    }
}

class StatementValidator {
    static validate(statement: unknown): statement is PredicateStatement {
        return this.isStatement(statement);
    }

    private static isStatement(statement: unknown): statement is PredicateStatement {
        return statement instanceof Object
            ? this.isCompound(statement) || this.isBinaryOp(statement)
            : typeof statement === "string"
            ? this.isAtomic(statement)
            : false;
    }

    static isAtomic(statement: unknown): statement is Atom {
        return (typeof statement === "string" && statement.length > 0) || this.isBinaryOp(statement);
    }

    private static binaryOperators = new Set(["eq", "gt", "gte", "lt", "lte"]);

    static isBinaryOp(statement: unknown): statement is BinaryOperation {
        if (!isObject(statement)) return false;
        const entries = Object.entries(statement);
        if (entries.length > 1) return false;
        const [operator, operands]: [string, unknown] = entries[0];
        return (
            this.binaryOperators.has(operator) &&
            Array.isArray(operands) &&
            operands.length === 2 &&
            typeof operands[0] === "string" &&
            ["string", "number"].includes(typeof operands[1])
        );
    }

    static isCompound(statement: unknown): statement is CompoundStatement {
        return (
            isObject(statement) &&
            (this.isAnd(statement) ||
                this.isOr(statement) ||
                this.isNand(statement) ||
                this.isNor(statement) ||
                this.isNot(statement) ||
                this.isIf(statement))
        );
    }

    static isAnd(statement: { and?: unknown }): statement is Conjunction {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.and) &&
            statement.and.every((subProp) => this.isStatement(subProp))
        );
    }

    static isNand(statement: { nand?: unknown }): statement is AlternativeDenial {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.nand) &&
            statement.nand.every((subProp) => this.isStatement(subProp))
        );
    }

    static isOr(statement: { or?: unknown }): statement is Disjunction {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.or) &&
            statement.or.every((subProp) => this.isStatement(subProp))
        );
    }

    static isNor(statement: { nor?: unknown }): statement is JointDenial {
        return (
            Object.keys(statement).length === 1 &&
            Array.isArray(statement.nor) &&
            statement.nor.every((subProp) => this.isStatement(subProp))
        );
    }

    static isNot(statement: { not?: unknown }): statement is Negation {
        return Object.keys(statement).length === 1 && !!statement.not && this.isStatement(statement.not);
    }

    static isIf(statement: { if?: unknown; then?: unknown }): statement is Conditional {
        return (
            Object.keys(statement).length === 2 && this.isStatement(statement.if) && this.isStatement(statement.then)
        );
    }
}

function convertLegacyData(predicate: OldRawPredicate): RawPredicate {
    const keys = Object.keys(predicate);
    if (keys.length === 0) return [];
    if (keys.length === 1 && Array.isArray(predicate.all)) {
        return deepClone(predicate.all);
    }
    if (keys.length === 1 && Array.isArray(predicate.any) && predicate.any.length === 1) {
        return deepClone(predicate.any);
    }

    return deepClone(
        [
            predicate.all ?? [],
            Array.isArray(predicate.any) ? { or: predicate.any } : [],
            Array.isArray(predicate.not)
                ? predicate.not.length === 1
                    ? { not: predicate.not[0]! }
                    : { nor: predicate.not }
                : [],
        ].flat()
    );
}

interface OldRawPredicate {
    label?: unknown;
    all?: PredicateStatement[];
    any?: PredicateStatement[];
    not?: PredicateStatement[];
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
type Negation = { not: PredicateStatement };
type AlternativeDenial = { nand: PredicateStatement[] };
type JointDenial = { nor: PredicateStatement[] };
type Conditional = { if: PredicateStatement; then: PredicateStatement };
type CompoundStatement = Conjunction | Disjunction | AlternativeDenial | JointDenial | Negation | Conditional;

type PredicateStatement = Atom | CompoundStatement;

type RawPredicate = PredicateStatement[];

export { PredicatePF2e, PredicateStatement, RawPredicate, convertLegacyData };
