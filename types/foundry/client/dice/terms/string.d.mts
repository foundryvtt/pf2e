import { RollTermData } from "./_types.mjs";
import type RollTerm from "./term.mjs";

/** A type of RollTerm used to capture residual strings which have not yet been matched */
export default class StringTerm extends RollTerm<StringTermData> {
    constructor({ term, options }: StringTermData);

    term: string;

    static override SERIALIZE_ATTRIBUTES: ["term"];

    override get expression(): string;

    override get total(): string;

    override evaluate(options?: Record<string, unknown>): never;
}

declare global {
    interface StringTermData extends RollTermData {
        term?: string;
    }
}
