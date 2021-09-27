interface RawPredicate {
    all?: string[];
    any?: string[];
    not?: string[];
    test?: (options?: string[]) => boolean;
}

/**
 * Encapsulates logic to determine if a modifier should be active or not for a specific roll based
 * on a list of string values. This will often be based on traits, but that is not required - sneak
 * attack could be an option that is not a trait.
 * @category PF2
 */
class PredicatePF2e implements RawPredicate {
    /** The propositions must all be true  */
    all: string[];
    /** At least one of the propositions must be true  */
    any: string[];
    /** None of the propositions must be true */
    not: string[];
    /** Is the propositional data structurally valid? */
    private isValid: boolean;

    /** Test if the premise is true within a domain of discourse. */
    static test(premise: RawPredicate = {}, domain: string[] = []): boolean {
        return premise instanceof PredicatePF2e ? premise.test(domain) : new PredicatePF2e(premise).test(domain);
    }

    constructor(param: RawPredicate = { all: [], any: [], not: [] }) {
        this.all = deepClone(param.all ?? []);
        this.any = deepClone(param.any ?? []);
        this.not = deepClone(param.not ?? []);
        this.isValid = this.validate();
    }

    /** Structurally validate the premises */
    private validate() {
        return (["all", "any", "not"] as const).every(
            (operator) =>
                Array.isArray(this[operator]) &&
                this[operator].every((proposition) => typeof proposition === "string" && proposition.length > 0)
        );
    }

    /** Test if the premises are true within a domain of discourse */
    test(domain: string[] = []): boolean {
        if (!this.isValid) {
            console.error("PF2e System | The provided premise set is malformed.");
            return false;
        }
        const { all, any, not } = this;
        return (
            all.every((i) => domain.includes(i)) &&
            !not.some((i) => domain.includes(i)) &&
            (any.length === 0 || any.some((i) => domain.includes(i)))
        );
    }
}

export { RawPredicate, PredicatePF2e };
