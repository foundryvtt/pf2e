type TermUnion = Roll | DicePool | DiceTerm | number | string;

/**
 * This class provides an interface and API for conducting dice rolls.
 * The basic structure for a dice roll is a string formula and an object of data against which to parse it.
 *
 * @param formula   The string formula to parse
 * @param data      The data object against which to parse attributes within the formula
 *
 * @example
 * // Attack with advantage!
 * let r = new Roll("2d20kh + @prof + @strMod", {prof: 2, strMod: 4});
 *
 * // The parsed components of the roll formula
 * console.log(r.parts);    // [Die, +, 2, +, 4]
 *
 * // Execute the roll
 * r.roll();
 *
 * // The resulting equation after it was rolled
 * console.log(r.result);   // 16 + 2 + 4
 *
 * // The total resulting from the roll
 * console.log(r.total);    // 22
 */
declare class Roll {
    /**
     * The original provided data
     */
    data: ReturnType<Roll['_prepareData']>;

    /**
     * An Array of Die instance which were included as part of this Roll
     */
    protected _dice: DiceTerm[];

    /**
     * The evaluated results of the Roll
     */
    results: (number | string)[];

    /**
     * The identified terms of the Roll
     */
    terms: ReturnType<Roll['_identifyTerms']>;

    /**
     * The original "raw" formula before any substitutions or evaluation
     */
    _formula: string;

    /**
     * An internal flag for whether the Roll object has been rolled
     */
    _rolled: boolean;

    /**
     * Cache the rolled total to avoid re-evaluating it multiple times
     */
    _result: string | null;

    /**
     * Cache the evaluated total to avoid re-evaluating it
     */
    _total: number | null;

    /**
     * Regular expression patterns
     */
    constructor(formula: string, data?: object);

    rgx: {
        reroll: RegExp;
        explode: RegExp;
        keep: RegExp;
        success: RegExp;
    };

    /**
     * Split a provided Roll formula to identify it's component terms.
     * Some terms are very granular, like a Number of an arithmetic operator
     * Other terms are very coarse like an entire inner Roll from a parenthetical expression.
     * As a general rule, this function should return an Array of terms which are ready to be evaluated immediately.
     * Some terms may require recursive evaluation.
     *
     * @param formula  The formula to parse
     * @param [step]   The numbered step in the Roll evaluation process.
     * @return An array of identified terms
     */
    protected _identifyTerms(formula: string, { step }?: { step?: number }): TermUnion[];

      /**
   * Prepare the data structure used for the Roll.
   * This is factored out to allow for custom Roll classes to do special data preparation using provided input.
   * @param data Provided roll data
   */
    protected _prepareData(data: { [key: string]: unknown }): { [key: string]: unknown };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Return a standardized representation for the displayed formula associated with this DicePool.
     */
    get formula(): string;

    /**
     * The resulting arithmetic expression after rolls have been evaluated
     */
    get result(): string | null;

    /**
     * Express the total result of the roll and cache the result to avoid re-evaluating
     */
    get total(): number | null;

    /**
     * Alter the Roll expression by adding or multiplying the number of dice which are rolled
     * @param multiply   A factor to multiply. Dice are multiplied before any additions.
     * @param add        A number of dice to add. Dice are added after multiplication.
     * @param  [multiplyNumeric]  Apply multiplication factor to numeric scalar terms
     * @return The altered Roll expression
     */
    alter(multiply: number, add: number, { multiplyNumeric }?: { multiplyNumeric?: boolean }): Roll;

    /**
     * Execute the Roll, replacing dice and evaluating the total result
     *
     * @param [minimize] Produce the minimum possible result from the Roll instead of a random result.
     * @param [maximize] Produce the maximum possible result from the Roll instead of a random result.
     *
     * @returnsThe rolled Roll object, able to be chained into other methods
     *
     * @example
     * let r = new Roll("2d6 + 4 + 1d4");
     * r.evaluate();
     * console.log(r.result); // 5 + 4 + 2
     * console.log(r.total);  // 11
     */
    evaluate({minimize, maximize}?: { minimize?: boolean, maximize?: boolean }): Roll;

    /**
     * Get an Array of any Die objects which were rolled as part of the evaluation of this roll
     */
    get dice(): DiceTerm[];

    /**
     * A factory method which constructs a Roll instance using the default configured Roll class.
     */
    public static create(args: any | any[]): Roll;

    /**
     * The regular expression used to identify a Die component of a Roll
     */
    protected static get diceRgx(): string;

    static get rgx(): { dice: string; pool: string };

    /**
     * Record supported arithmetic operators for Roll instances
     */
    protected static get arithmeticOperators(): string[];

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Execute the Roll, replacing dice and evaluating the total result
     * @returns The rolled Roll object, able to be chained into other methods
     *
     * @example
     * let r = new Roll("2d6 + 4 + 1d4");
     * r.roll();
     * > 12
     */
    roll(): Roll;

    /**
     * Create a new Roll object using the original provided formula and data
     * Each roll is immutable, so this method returns a new Roll instance using the same data.
     * @returns A new Roll object, rolled using the same formula and data
     */
    reroll(): Roll;

    /* -------------------------------------------- */
    /*  Helpers
    /* -------------------------------------------- */

    /**
     * Separate a dice roll formula into parenthetical terms to be evaluated first
     * @param formula
     */
    protected _evalParentheticalTerms(formula: string): string[];

    /**
     * Isolate any Dice Pool terms within a formula and evaluate them
     * @param formula
     */
    protected _evalPoolTerms(formula: string): string[];

    /**
     * Replace a dice roll term enclosed in {brackets} with a DicePool instance
     * @param term  The string term being replaced
     * @param rgx   The regexp match for the term
     * @return      The replaced DicePool
     */
    protected _replacePool(term: string, rgx: RegExpMatchArray): DicePool;

    protected _validateResult(result: any): any;

    /**
     * Safely evaluate a formulaic expression using a Proxy environment which is allowed access to Math commands
     * @param expression    The formula expression to evaluate
     * @return              The returned numeric result
     */
    protected _safeEval(expression: string): number;

    /* -------------------------------------------- */
    /*  HTML Rendering
    /* -------------------------------------------- */

    /**
     * Render a Roll instance to HTML
     * @param chatOptions   An object configuring the behavior of the resulting chat message.
     * @return              A Promise which resolves to the rendered HTML
     */
    render(chatOptions?: object): Promise<string>;

    /**
     * Render the tooltip HTML for a Roll instance
     */
    getTooltip(): Promise<JQuery>;

    /**
     * Transform a Roll instance into a ChatMessage, displaying the roll result.
     * This function can either create the ChatMessage directly, or return the data object that will be used to create.
     *
     * @param chatData  The data object to use when creating the message
     * @param rollMode  The template roll mode to use for the message from CONFIG.rollModes
     * @param create    Whether to automatically create the chat message, or only return the prepared
     *                  chatData object.
     * @return A promise which resolves to the created ChatMessage entity, if create is true or the Object of prepared
     *         chatData otherwise.
     */
    toMessage(
        chatData?: Partial<ChatMessageData>,
        { rollMode, create }?: { rollMode?: string; create?: boolean },
    ): Promise<ChatMessage | ChatMessageData>;

    /* -------------------------------------------- */
    /*  Methods
    /* -------------------------------------------- */

    /**
     * Alter the Roll formula by adding or multiplying the number of dice included in each roll term
     *
     * @param multiply  A multiplier for the number of dice in each Die term
     * @param add       A number of dice to add to each Die term
     *
     * @example
     * let r = new Roll("4d8 + 4 + 2d4");
     * r.alter(1, 2);
     * r.formula;
     * > 9d8 + 4 + 5d4
     */
    alter(multiply: number, add: number, options?: { multiplyNumeric: boolean }): Roll;

    /**
     * Validate that a provided roll formula can represent a valid
     * @param formula A candidate formula to validate
     * @return Is the provided input a valid dice formula?
     */
    static validate(formula: string): boolean

    /**
     * Clean a dice roll formula, returning the formatted string with proper spacing
     * @param formula
     */
    static cleanFormula(terms: (Roll | number | string)[]): string;

    /**
     * Clean the terms of a Roll equation, removing empty space and de-duping arithmetic operators
     * @param terms  The input array of terms
     * @return The cleaned array of terms
     */
    static cleanTerms(terms: DiceTerm|string|number[]): (Roll|DicePool|DiceTerm|number|string)[];

    /**
     * Acquire data object representing the most-likely current actor.
     * This data can be included in the invocation of a Roll instance for evaluating dynamic attributes.
     *
     * @return  An object of data representing the current Actor (if any)
     */
    static getActorData(): any;

    static simulate(formula: string, n: number): number[];

    /* -------------------------------------------- */
    /*  Saving and Loading
    /* -------------------------------------------- */

    /**
     * Structure the Roll data as an object suitable for JSON stringification
     * @return  Structured data which can be serialized into JSON
     */
    toJSON(): any;

    /**
     * Recreate a Roll instance using a provided JSON string
     * @param json  Serialized JSON data representing the Roll
     * @return      A revived Roll instance
     */
    static fromJSON(json: string): Roll;
}
