import { DiceTermResult } from "../_types.mjs";
import { RollTermData } from "./_types.mjs";
import RollTerm, { Evaluated } from "./term.mjs";

/**
 * An abstract base class for any type of RollTerm which involves randomized input from dice, coins, or other devices.
 */
export default abstract class DiceTerm<TData extends DiceTermData = DiceTermData> extends RollTerm<TData> {
    /**
     * @param termData Data used to create the Dice Term, including the following:
     * @param termData.number    The number of dice of this term to roll, before modifiers are applied
     * @param termData.faces     The number of faces on each die of this type
     * @param termData.modifiers An array of modifiers applied to the results
     * @param termData.results   An optional array of pre-cast results for the term
     * @param termData.options   Additional options that modify the term
     */
    constructor({ number, faces, modifiers, results, options }?: TData);

    /** The number of dice of this term to roll, before modifiers are applied */
    number: number;

    /** The number of faces on the die */
    faces: TData["faces"];

    /** An Array of dice term modifiers which are applied */
    modifiers: string[];

    /** The array of dice term results which have been rolled */
    results: DiceTermResult[];

    /** Define the denomination string used to register this DiceTerm type in CONFIG.Dice.terms */
    static DENOMINATION: string;

    /** Define the named modifiers that can be applied for this particular DiceTerm type. */
    static MODIFIERS: Record<string, string | ((term: DiceTermResult) => void)>;

    /**
     * A regular expression pattern which captures the full set of term modifiers
     * Anything until a space, group symbol, or arithmetic operator
     */
    static MODIFIERS_REGEXP_STRING: string;

    /**
     * A regular expression used to separate individual modifiers
     */
    static MODIFIER_REGEXP: RegExp;

    static override REGEXP: RegExp;

    /** System note: contents are ["number", "faces", "modifiers", "results"] */
    static override SERIALIZE_ATTRIBUTES: string[];

    /* -------------------------------------------- */
    /*  Dice Term Attributes                        */
    /* -------------------------------------------- */

    override get expression(): string;

    override get total(): number | undefined;

    /** Return an array of rolled values which are still active within this term */
    get values(): number;

    /* -------------------------------------------- */
    /*  Dice Term Methods                           */
    /* -------------------------------------------- */

    /**
     * Alter the DiceTerm by adding or multiplying the number of dice which are rolled
     * @param multiply A factor to multiply. Dice are multiplied before any additions.
     * @param add      A number of dice to add. Dice are added after multiplication.
     * @return The altered term
     */
    alter(multiply: number, add: number): this;

    protected override _evaluateSync({
        minimize,
        maximize,
    }?: {
        minimize?: boolean;
        maximize?: boolean;
    }): Evaluated<this>;

    /**
     * Roll the DiceTerm by mapping a random uniform draw against the faces of the dice term.
     * @param [options={}] Options which modify how a random result is produced
     * @param [options.minimize=false] Minimize the result, obtaining the smallest possible value.
     * @param [options.maximize=false] Maximize the result, obtaining the largest possible value.
     * @return The produced result
     */
    roll({ minimize, maximize }?: { minimize?: boolean; maximize?: boolean }): DiceTermResult;

    /**
     * Return a string used as the label for each rolled result
     * @param result The rolled result
     * @return The result label
     */
    getResultLabel(result: DiceTermResult): string;

    /**
     * Get the CSS classes that should be used to display each rolled result
     * @param result The rolled result
     * @return The desired classes
     */
    getResultCSS(result: DiceTermResult): (string | null)[];

    /**
     * Render the tooltip HTML for a Roll instance
     * @return The data object used to render the default tooltip template for this DiceTerm
     */
    getTooltipData(): DiceTermTooltipData;

    /* -------------------------------------------- */
    /*  Modifier Methods                            */
    /* -------------------------------------------- */

    /**
     * Sequentially evaluate each dice roll modifier by passing the term to its evaluation function
     * Augment or modify the results array.
     */
    protected _evaluateModifiers(): void;

    /**
     * Evaluate a single modifier command, recording it in the array of evaluated modifiers
     * @param command  The parsed modifier command
     * @param modifier The full modifier request
     */
    protected _evaluateModifier(command: string, modifier: string): void;

    /**
     * A helper comparison function.
     * Returns a boolean depending on whether the result compares favorably against the target.
     * @param result     The result being compared
     * @param comparison The comparison operator in [=,<,<=,>,>=]
     * @param target     The target value
     * @return Is the comparison true?
     */
    static compareResult(result: number, comparison: ComparisonOperator, target?: number): boolean;

    /**
     * A helper method to modify the results array of a dice term by flagging certain results are kept or dropped.
     * @param results   The results array
     * @param number    The number to keep or drop
     * @param [keep]    Keep results?
     * @param [highest] Keep the highest?
     * @return The modified results array
     */
    protected static _keepOrDrop<T extends DiceTermResult>(
        results: T[],
        number: number,
        { keep, highest }?: { keep?: boolean; highest?: boolean },
    ): T[];

    /**
     * A reusable helper function to handle the identification and deduction of failures
     */
    protected static _applyCount<T extends DiceTermResult>(
        results: T,
        comparison: ComparisonOperator,
        target: number,
        { flagSuccess, flagFailure }?: { flagSuccess?: boolean; flagFailure?: boolean },
    ): void;

    /** A reusable helper function to handle the identification and deduction of failures */
    protected static _applyDeduct<T extends DiceTermResult>(
        results: T[],
        comparison: ComparisonOperator,
        target: number,
        { deductFailure, invertFailure }?: { deductFailure?: boolean; invertFailure?: boolean },
    ): void;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Determine whether a string expression matches this type of term
     * @param expression The expression to parse
     * @param [options={}] Additional options which customize the match
     * @param [options.imputeNumber=true] Allow the number of dice to be optional, i.e. "d6"
     */
    static matchTerm(expression: string, { imputeNumber }?: { imputeNumber: boolean }): RegExpMatchArray | null;

    /**
     * Construct a term of this type given a matched regular expression array.
     * @param match The matched regular expression array
     * @return The constructed term
     */
    static fromMatch<T extends DiceTerm>(this: ConstructorOf<T>, match: RegExpMatchArray): T;
}

interface DiceTermData extends RollTermData {
    number?: number;
    faces?: number;
    modifiers?: string[];
    results?: DiceTermResult[];
}

export type ComparisonOperator = "=" | "<" | "<=" | ">" | ">=";

export interface DiceTermTooltipData {
    formula: string;
    total: number;
    faces: number;
    flavor: string;
    rolls: {
        result: string;
        classes: string;
    };
}
