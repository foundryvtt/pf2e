export {};

declare global {
    /** A type of RollTerm used to enclose a parenthetical expression to be recursively evaluated. */
    class ParentheticalTerm extends RollTerm<ParentheticalTermData> {
        constructor({ term, roll, options }: { term: string; roll?: Roll; options?: Record<string, unknown> });
        constructor({ term, roll, options }: { term?: string; roll: Roll; options?: Record<string, unknown> });

        /** The original provided string term used to construct the parenthetical */
        term: string;

        /** Alternatively, an already-evaluated Roll instance may be passed directly */
        roll?: Roll;

        /** @override */
        isIntermediate: true;

        /**
         * The regular expression pattern used to identify the opening of a parenthetical expression.
         * This could also identify the opening of a math function.
         */
        static OPEN_REGEXP: RegExp;

        /** A regular expression pattern used to identify the closing of a parenthetical expression. */
        static CLOSE_REGEXP: RegExp;

        /** @override */
        static SERIALIZE_ATTRIBUTES: ["term"];

        /* -------------------------------------------- */
        /*  Parenthetical Term Attributes               */
        /* -------------------------------------------- */

        /** An array of evaluated DiceTerm instances that should be bubbled up to the parent Roll */
        get dice(): Evaluated<DiceTerm>[];

        /** @override */
        get total(): string | number | undefined;

        /** @inheritdoc */
        get expression(): `(${string})`;

        /* -------------------------------------------- */
        /*  Parenthetical Term Methods                  */
        /* -------------------------------------------- */

        /** @override */
        protected _evaluateSync({ minimize, maximize }?: { minimize?: boolean; maximize?: boolean }): Evaluated<this>;

        /** @override */
        protected _evaluate({
            minimize,
            maximize,
        }?: {
            minimize?: boolean;
            maximize?: boolean;
        }): Promise<Evaluated<this>>;

        /**
         * Construct a ParentheticalTerm from an Array of component terms which should be wrapped inside the parentheses.
         * @param terms The array of terms to use as internal parts of the parenthetical
         * @param [options={}]   Additional options passed to the ParentheticalTerm constructor
         * @returns The constructed ParentheticalTerm instance
         *
         * @example <caption>Create a Parenthetical Term from an array of component RollTerm instances</caption>
         * const d6 = new Die({number: 4, faces: 6});
         * const plus = new OperatorTerm({operator: "+"});
         * const bonus = new NumericTerm({number: 4});
         * t = ParentheticalTerm.fromTerms([d6, plus, bonus]);
         * t.formula; // (4d6 + 4)
         */
        static fromTerms(terms: RollTerm[], options?: Record<string, unknown>): ParentheticalTerm;
    }

    interface ParentheticalTermData extends RollTermData {
        term?: string;
    }
}
