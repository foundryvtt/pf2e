export {};

declare global {
    /** A type of RollTerm used to capture static numbers. */
    class NumericTerm extends RollTerm {
        constructor({ number, options }: NumericTermData);

        number: number;

        /** @override */
        static REGEXP: RegExp;

        /** @override */
        static SERIALIZE_ATTRIBUTES: ['number'];

        /** @override */
        get expression(): string;

        /** @override */
        get total(): number;

        /* -------------------------------------------- */
        /*  Factory Methods                             */
        /* -------------------------------------------- */

        /**
         * Determine whether a string expression matches a NumericTerm
         * @param expression The expression to parse
         */
        static matchTerm(expression: string): RegExpMatchArray | null;

        /**
         * Construct a term of this type given a matched regular expression array.
         * @param match The matched regular expression array
         * @return The constructed term
         */
        static fromMatch<T extends NumericTerm>(this: T, match: RegExpMatchArray): T;
    }

    interface NumericTermData extends RollTermData {
        number?: number;
    }
}
