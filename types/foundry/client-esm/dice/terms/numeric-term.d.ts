import type { RollTerm } from "./roll-term.d.ts";

/** A type of RollTerm used to capture static numbers. */
export class NumericTerm<TData extends NumericTermData = NumericTermData> extends RollTerm<TData> {
    constructor({ number, options }: NumericTermData);

    number: number;

    static override REGEXP: RegExp;

    static override SERIALIZE_ATTRIBUTES: ["number"];

    override get expression(): string;

    override get total(): number;

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
    static fromMatch<T extends NumericTerm<NumericTermData>>(this: T, match: RegExpMatchArray): T;
}

declare global {
    interface NumericTermData extends RollTermData {
        class?: "NumericTerm";
        number: number;
    }
}
