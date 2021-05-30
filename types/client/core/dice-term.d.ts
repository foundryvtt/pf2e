interface DiceTermData {
    number?: number;
    faces?: number;
    modifiers?: string[];
    results?: object[];
    options?: Record<string, unknown>;
}

interface PlainRollResult {
    result: number;
    active: boolean;
}

type ComparisonOperatorString = '=' | '<' | '<=' | '>' | '>=';

/**
 * An abstract base class for any type of RollTerm which involves randomized input from dice, coins, or other devices.
 * @param termData                 Data used to create the Dice Term, including the following:
 * @param [termData.number=1] The number of dice of this term to roll, before modifiers are applied
 * @param termData.faces The number of faces on each die of this type
 * @param [termData.modifiers]   An array of modifiers applied to the results
 * @param [termData.results]     An optional array of pre-cast results for the term
 * @param [termData.options]       Additional options that modify the term
 */
declare abstract class DiceTerm {
    constructor({ number, faces, modifiers, results, options }: DiceTermData);

    /**
     * The number of dice of this term to roll, before modifiers are applied
     */
    number: number;

    /**
     * The number of faces on the die
     */
    faces: number;

    /**
     * An Array of dice term modifiers which are applied
     */
    modifiers: string[];

    /**
     * An object of additional options which modify the dice term
     */
    options: Record<string, unknown>;

    /**
     * The array of dice term results which have been rolled
     */
    results: PlainRollResult[];

    /**
     * An internal flag for whether the dice term has been evaluated
     */
    private _evaluated: false;

    /**
     * Define the denomination string used to register this Dice type in CONFIG.Dice.terms
     */
    DENOMINATION: string;

    /**
     * Define the modifiers that can be used for this particular DiceTerm type.
     */
    MODIFIERS: Record<string, string | Function>;

    /**
     * A regular expression pattern which identifies a potential DiceTerm modifier
     */
    MODIFIER_REGEX: RegExp;

    /**
     * A regular expression pattern which indicates the end of a DiceTerm
     */
    MODIFIERS_REGEX: string;

    /**
     * A regular expression pattern which identifies part-specific flavor text
     */
    FLAVOR_TEXT_REGEX: string;

    /**
     * Return the dice expression portion of the full term formula, excluding any flavor text.
     */
    get expression(): string;

    /**
     * Return a standardized representation for the displayed formula associated with this DiceTerm
     */
    get formula(): string;

    /**
     * Return the flavor text associated with a particular DiceTerm, possibly an empty string if the term is flavorless.
     */
    get flavor(): string;

    /**
     * Return the total result of the DiceTerm if it has been evaluated
     */
    get total(): number | null;

    /**
     * Return an array of rolled values which are still active within this term
     */
    get values(): number[];

    /**
     * Alter the DiceTerm by adding or multiplying the number of dice which are rolled
     * @param multiply A factor to multiply. Dice are multiplied before any additions.
     * @param add      A number of dice to add. Dice are added after multiplication.
     * @return The altered term
     */
    alter(multiply: number, add: number): DiceTerm;

    /**
     * Evaluate the roll term, populating the results Array.
     * @param [minimize] Apply the minimum possible result for each roll.
     * @param [maximize] Apply the maximum possible result for each roll.
     * @returns The evaluated dice term
     */
    evaluate({ minimize, maximize }?: { minimize?: boolean; maximize?: boolean }): DiceTerm;

    /**
     * Roll the DiceTerm by mapping a random uniform draw against the faces of the dice term.
     * @param [minimize]    Apply the minimum possible result instead of a random result.
     * @param [maximize]    Apply the maximum possible result instead of a random result.
     */
    roll({ minimize, maximize }?: { minimize?: boolean; maximize?: boolean }): Record<string, DiceTerm>;

    /**
     * Return a string used as the label for each rolled result
     * @param result     The numeric result
     * @returnThe result label
     */
    static getResultLabel(result: string): string;

    /* -------------------------------------------- */
    /*  Modifier Helpers                            */
    /* -------------------------------------------- */

    /**
     * Sequentially evaluate each dice roll modifier by passing the term to its evaluation function
     * Augment or modify the results array.
     */
    private _evaluateModifiers(): void;

    /**
     * A helper comparison function.
     * Returns a boolean depending on whether the result compares favorably against the target.
     * @param result         The result being compared
     * @param comparison     The comparison operator in [=,<,<=,>,>=]
     * @param target         The target value
     * @return Is the comparison true?
     */
    static compareResult(result: number, comparison: ComparisonOperatorString, target: number): boolean;

    /**
     * A helper method to modify the results array of a dice term by flagging certain results are kept or dropped.
     * @param results   The results array
     * @param number    The number to keep or drop
     * @param [keep]    Keep results?
     * @param [highest] Keep the highest?
     * @return The modified results array
     */
    private static _keepOrDrop(
        results: Record<string, unknown>[],
        number: number,
        { keep, highest }?: { keep?: boolean; highest?: boolean },
    ): Record<string, unknown>[];

    /**
     * A reusable helper function to handle the identification and deduction of failures
     */
    private static _applyCount(
        results: Record<string, unknown>[],
        comparison: ComparisonOperatorString,
        target: number,
        { flagSuccess, flagFailure }?: { flagSuccess?: boolean; flagFailure?: boolean },
    ): void;

    /**
     * A reusable helper function to handle the identification and deduction of failures
     */
    static _applyDeduct(
        results: Record<string, unknown>[],
        comparison: ComparisonOperatorString,
        target: number,
        { deductFailure, invertFailure }?: { deductFailure?: boolean; invertFailure?: boolean },
    ): void;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /**
     * Construct a DiceTerm from a provided data object
     * @param data Provided data from an un-serialized term
     * @return The constructed DiceTerm
     */
    static fromData(data: Record<string, unknown>): DiceTerm;

    /**
     * Parse a provided roll term expression, identifying whether it matches this type of term.
     * @param expression
     * @param options Additional term options
     * @return The constructed DiceTerm instance
     */
    static fromExpression(expression: string, options?: Record<string, unknown>): DiceTerm | null;

    /**
     * Check if the expression matches this type of term
     * @param  expression         The expression to parse
     * @param [imputeNumber=true] Allow the number of dice to be optional, i.e. "d6"
     */
    static matchTerm(expression: string, { imputeNumber }?: { imputeNumber: boolean }): RegExpMatchArray | null;

    /**
     * Create a "fake" dice term from a pre-defined array of results
     * @param options        Arguments used to initialize the term
     * @param results      An array of pre-defined results
     *
     * @example
     * let d = new Die({faces: 6, number: 4, modifiers: ["r<3"]});
     * d.evaluate();
     * let d2 = Die.fromResults({faces: 6, number: 4, modifiers: ["r<3"]}, d.results);
     */
    static fromResults(options: Record<string, unknown>, results: Record<string, unknown>[]): DiceTerm;

    /**
     * Serialize the DiceTerm to a JSON string which allows it to be saved in the database or embedded in text.
     * This method should return an object suitable for passing to the JSON.stringify function.
     * @return {object}
     */
    toJSON(): Record<string, unknown>;

    /**
     * Reconstruct a DiceTerm instance from a provided JSON string
     * @param json A serialized JSON representation of a DiceTerm
     * @return A reconstructed DiceTerm from the provided JSON
     */
    static fromJSON(json: string): DiceTerm;

    /**
     * Provide backwards compatibility for Die syntax prior to 0.7.0
     */
    private static _backwardsCompatibleTerm(data: Record<string, unknown>): Record<string, unknown>;
}
