import Roll from "../roll.mjs";
import { DiceTerm, RollTerm, RollTermData } from "./_module.mjs";
import { Evaluated } from "./term.mjs";

export default class FunctionTerm<TFunctionName extends MathFunctionName = MathFunctionName> extends RollTerm<
    FunctionTermData<TFunctionName>
> {
    constructor({ fn, terms, options }: FunctionTermData<TFunctionName>);

    /** The named function in the Math environment which should be applied to the term */
    fn: TFunctionName;

    /** An array of string argument terms for the function */
    terms: string[];

    /** The cached Roll instances for each function argument */
    rolls: Roll[];

    /** The cached result of evaluating the method arguments */
    result: number | undefined;

    override isIntermediate: true;

    static override SERIALIZE_ATTRIBUTES: ["fn", "terms"];

    /* -------------------------------------------- */
    /*  Math Term Attributes                        */
    /* -------------------------------------------- */

    /** An array of evaluated DiceTerm instances that should be bubbled up to the parent Roll */
    get dice(): DiceTerm[];

    override get total(): number | undefined;

    override get expression(): `${MathFunctionName}(${string})`;

    /* -------------------------------------------- */
    /*  Math Term Methods                           */
    /* -------------------------------------------- */

    protected override _evaluateSync({
        minimize,
        maximize,
    }?: {
        minimize?: boolean;
        maximize?: boolean;
    }): Evaluated<this>;

    protected override _evaluate({
        minimize,
        maximize,
    }?: {
        minimize?: boolean;
        maximize?: boolean;
    }): Promise<Evaluated<this>>;
}

export type MathFunctionName =
    | Exclude<MathStringKey, "E" | "LN2" | "LN10" | "LOG2E" | "LOG10E" | "PI" | "SQRT1_2" | "SQRT2">
    | "clamped"
    | "normalizeDegrees"
    | "normalizeRadians"
    | "roundDecimals"
    | "toDegrees"
    | "toRadians"
    | "safeEval";

export interface FunctionTermData<TFunctionName extends MathFunctionName = MathFunctionName> extends RollTermData {
    class?: "FunctionTerm";
    fn?: TFunctionName;
    terms?: RollTerm[];
}

export type MathStringKey<T extends keyof Math = keyof Math> = T extends string ? T : never;
