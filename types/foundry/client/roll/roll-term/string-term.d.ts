/** A type of RollTerm used to capture residual strings which have not yet been matched */
declare class StringTerm extends RollTerm {
    constructor({ term, options }: { term: string; options?: Record<string, unknown> });

    term: string;

    /** @override */
    static SERIALIZE_ATTRIBUTES: ['term'];

    /** @override */
    get expression(): string;

    /** @override */
    get total(): string;

    /** @override */
    evaluate(options?: Record<string, unknown>): never;
}
