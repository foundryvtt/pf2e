import { RollOptions } from "../_types.mjs";
import RollTerm from "./term.mjs";

export interface RollTermData {
    /** The name of the {@link RollTerm} class with which this data should be constructed */
    class?: string;
    /** Options modifying or describing the Roll */
    options?: RollOptions;
    /** Has this term been evaluated? */
    evaluated?: boolean;
}
