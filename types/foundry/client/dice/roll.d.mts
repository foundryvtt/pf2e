import RollResolver from "@client/applications/dice/roll-resolver.mjs";
import ChatMessage from "@client/documents/chat-message.mjs";
import { RollMode } from "@common/constants.mjs";
import { ChatMessageSource } from "@common/documents/chat-message.mjs";
import { RollOptions, RollParseNode } from "./_types.mjs";
import { DiceTerm, FunctionTerm, OperatorTerm, PoolTerm, RollTerm, RollTermData } from "./terms/_module.mjs";

/**
 * An interface and API for constructing and evaluating dice rolls.
 * The basic structure for a dice roll is a string formula and an object of data against which to parse it.
 *
 * @param formula The string formula to parse
 * @param data    The data object against which to parse attributes within the formula
 *
 * @example
 * // Attack with advantage!
 * let r = new Roll("2d20kh + @prof + @strMod", {prof: 2, strMod: 4});
 *
 * // The parsed terms of the roll formula
 * console.log(r.terms);    // [Die, OperatorTerm, NumericTerm, OperatorTerm, NumericTerm]
 *
 * // Execute the roll
 * r.evaluate();
 *
 * // The resulting equation after it was rolled
 * console.log(r.result);   // 16 + 2 + 4
 *
 * // The total resulting from the roll
 * console.log(r.total);    // 22
 */
export default class Roll {
    constructor(formula: string, data?: Record<string, unknown>, options?: RollOptions);

    /** The original provided data object which substitutes into attributes of the roll formula */
    data: Record<string, unknown>;

    /** Options which modify or describe the Roll */
    options: RollOptions;

    /** The identified terms of the Roll */
    terms: RollTerm[];

    /**
     * An array of inner DiceTerms which were evaluated as part of the Roll evaluation
     * @internal
     */
    protected _dice: DiceTerm[];

    /**
     * Store the original cleaned formula for the Roll, prior to any internal evaluation or simplification
     * @internal
     */
    _formula: string;

    /**
     * Track whether this Roll instance has been evaluated or not. Once evaluated the Roll is immutable.
     * @internal
     */
    _evaluated: boolean;

    /**
     * Cache the numeric total generated through evaluation of the Roll.
     * @internal
     */
    protected _total: number | undefined;

    /**
     * A reference to the Roll at the root of the evaluation tree.
     * @internal
     */
    protected _root: Roll;

    /**
     * A reference to the RollResolver app being used to externally resolve this Roll.
     * @internal
     */
    protected _resolver: RollResolver;

    /** A Proxy environment for safely evaluating a string using only available Math functions */
    static MATH_PROXY: RollMathProxy;

    /** The HTML template path used to render a complete Roll object to the chat log */
    static CHAT_TEMPLATE: string;

    /** The HTML template used to render an expanded Roll tooltip to the chat log */
    static TOOLTIP_TEMPLATE: string;

    /**
     * A mapping of Roll instances to currently-active resolvers.
     */
    static RESOLVERS: Map<Roll, RollResolver>;

    /**
     * Prepare the data structure used for the Roll.
     * This is factored out to allow for custom Roll classes to do special data preparation using provided input.
     * @param data Provided roll data
     * @returns The prepared data object
     */
    protected _prepareData(data: Record<string, unknown>): Record<string, unknown>;

    /* -------------------------------------------- */
    /*  Roll Attributes                             */
    /* -------------------------------------------- */

    /** Return an Array of the individual DiceTerm instances contained within this Roll. */
    get dice(): DiceTerm[];

    /** Return a standardized representation for the displayed formula associated with this Roll. */
    get formula(): string;

    /** The resulting arithmetic expression after rolls have been evaluated */
    get result(): string;

    /**
     * Return the total result of the Roll expression if it has been evaluated.
     */
    get total(): number | undefined;

    /**
     * Return the arbitrary product of evaluating this Roll.
     */
    get product(): unknown;

    /** Whether this Roll contains entirely deterministic terms or whether there is some randomness. */
    get isDeterministic(): boolean;

    /* -------------------------------------------- */
    /*  Roll Instance Methods                       */
    /* -------------------------------------------- */

    /**
     * Alter the Roll expression by adding or multiplying the number of dice which are rolled
     * @param multiply A factor to multiply. Dice are multiplied before any additions.
     * @param add      A number of dice to add. Dice are added after multiplication.
     * @param [multiplyNumeric]  Apply multiplication factor to numeric scalar terms
     * @return The altered Roll expression
     */
    alter(multiply: number, add: number, { multiplyNumeric }?: { multiplyNumeric?: boolean }): this;

    /** Clone the Roll instance, returning a new Roll instance that has not yet been evaluated. */
    clone(): this;

    /**
     * Execute the Roll, replacing dice and evaluating the total result
     * @param [options={}] Options which inform how the Roll is evaluated
     * @param [options.minimize=false] Minimize the result, obtaining the smallest possible value.
     * @param [options.maximize=false] Maximize the result, obtaining the largest possible value.
     * @param [options.allowStrings=false] If true, string terms will not cause an error to be thrown during
     *                                     evaluation.
     * @param [options.allowInteractive=true] If false, force the use of non-interactive rolls and do not prompt the
     *                                         user to make manual rolls.
     * @returns The evaluated Roll instance
     *
     * @example
     * let r = new Roll("2d6 + 4 + 1d4");
     * r.evaluate();
     * console.log(r.result); // 5 + 4 + 2
     * console.log(r.total);  // 11
     */
    evaluate(options?: EvaluateRollParams): Promise<Rolled<this>>;

    /**
     * Execute the Roll synchronously, replacing dice and evaluating the total result.
     * @param [options={}]
     * @param [options.minimize=false]     Minimize the result, obtaining the smallest possible value.
     * @param [options.maximize=false]     Maximize the result, obtaining the largest possible value.
     * @param [options.strict=true]        Throw an Error if the Roll contains non-deterministic terms that cannot be
     *                                     evaluated synchronously. If this is set to false, non-deterministic terms will
     *                                     be ignored.
     * @param [options.allowStrings=false] If true, string terms will not cause an error to be thrown during evaluation.
     * @returns The evaluated Roll instance.
     */
    evaluateSync(options?: EvaluateRollParams): Rolled<this>;

    /**
     * Evaluate the roll asynchronously.
     * @param [options]                  Options which inform how evaluation is performed
     * @param [options.minimize]         Force the result to be minimized
     * @param [options.maximize]         Force the result to be maximized
     * @param [options.allowStrings]     If true, string terms will not cause an error to be thrown during
     *                                   evaluation.
     * @param [options.allowInteractive] If false, force the use of digital rolls and do not prompt the user to make
     *                                   manual rolls.
     */
    protected _evaluate({ minimize, maximize, allowStrings }?: EvaluateRollParams): Promise<Rolled<this>>;

    /**
     * Evaluate an AST asynchronously.
     * @param node The root node or term.
     * @param [options]              Options which inform how evaluation is performed
     * @param [options.minimize]     Force the result to be minimized
     * @param [options.maximize]     Force the result to be maximized
     * @param [options.allowStrings] If true, string terms will not cause an error to be thrown during evaluation.
     */
    protected _evaluateASTAsync(node: RollParseNode | RollTerm, options?: EvaluateRollParams): Promise<string | number>;

    /**
     * Evaluate the roll synchronously.
     * @param [options]          Options which inform how evaluation is performed
     * @param [options.minimize] Force the result to be minimized
     * @param [options.maximize] Force the result to be maximized
     * @param [options.strict]   Throw an error if encountering a term that cannot be synchronously evaluated.
     * @param [options.allowStrings] If true, string terms will not cause an error to be thrown during evaluation.
     */
    protected _evaluateSync(options?: EvaluateRollSyncParams): Rolled<this>;

    /**
     * Evaluate an AST synchronously.
     * @param node                   The root node or term.
     * @param [options]              Options which inform how evaluation is performed
     * @param [options.minimize]     Force the result to be minimized
     * @param [options.maximize]     Force the result to be maximized
     * @param [options.strict]       Throw an error if encountering a term that cannot be synchronously evaluated.
     * @param [options.allowStrings] If true, string terms will not cause an error to be thrown during evaluation.
     */
    protected _evaluateASTSync(node: RollParseNode | RollTerm, options?: EvaluateRollSyncParams): string | number;

    /**
     * Safely evaluate the final total result for the Roll using its component terms.
     * @returns The evaluated total
     */
    protected _evaluateTotal(): number;

    /**
     * Alias for evaluate.
     * @see {Roll#evaluate}
     */
    roll({ minimize, maximize }?: EvaluateRollParams): Promise<Rolled<this>>;

    /**
     * Create a new Roll object using the original provided formula and data.
     * Each roll is immutable, so this method returns a new Roll instance using the same data.
     * @param [options={}] Evaluation options passed to Roll#evaluate
     * @return A new Roll object, rolled using the same formula and data
     */
    reroll({ minimize, maximize }?: EvaluateRollParams): Promise<Rolled<this>>;

    /* -------------------------------------------- */
    /*  Static Class Methods                        */
    /* -------------------------------------------- */

    /**
     * A factory method which constructs a Roll instance using the default configured Roll class.
     * @param formula      The formula used to create the Roll instance
     * @param [data={}]    The data object which provides component data for the formula
     * @param [options={}] Additional options which modify or describe this Roll
     * @return The constructed Roll instance
     */
    static create(formula: string, data?: Record<string, unknown>, options?: RollOptions): Roll;

    /** Get the default configured Roll class. */
    static get defaultImplementation(): typeof Roll;

    /**
     * Transform an array of RollTerm objects into a cleaned string formula representation.
     * @param terms An array of terms to represent as a formula
     * @returns The string representation of the formula
     */
    static getFormula(terms: RollTerm[]): string;

    /**
     * A sandbox-safe evaluation function to execute user-input code with access to scoped Math methods.
     * @param expression The input string expression
     * @returns The numeric evaluated result
     */
    static safeEval(expression: string): number;

    /**
     * After parenthetical and arithmetic terms have been resolved, we need to simplify the remaining expression.
     * Any remaining string terms need to be combined with adjacent non-operators in order to construct parsable terms.
     * @param terms An array of terms which is eligible for simplification
     * @returns An array of simplified terms
     */
    static simplifyTerms(terms: RollTerm[]): RollTerm[];
    /**
     * Simulate a roll and evaluate the distribution of returned results
     * @param formula The Roll expression to simulate
     * @param n The number of simulations
     * @return The rolled totals
     */
    static simulate(formula: string, n?: number): number[];

    /* -------------------------------------------- */
    /*  Roll Formula Parsing                        */
    /* -------------------------------------------- */

    /**
     * Parse a formula by following an order of operations:
     *
     * Step 1: Replace formula data
     * Step 2: Split outer-most parenthetical groups
     * Step 3: Further split outer-most dice pool groups
     * Step 4: Further split string terms on arithmetic operators
     * Step 5: Classify all remaining strings
     *
     * @param formula The original string expression to parse
     * @param data    A data object used to substitute for attributes in the formula
     * @returns A parsed array of RollTerm instances
     */
    static parse(formula: string, data: object): RollTerm[];

    /**
     * Replace referenced data attributes in the roll formula with values from the provided data.
     * Data references in the formula use the @attr syntax and would reference the corresponding attr key.
     *
     * @param formula   The original formula within which to replace
     * @param data      The data object which provides replacements
     * @param [missing] The value that should be assigned to any unmatched keys. If null, the unmatched key is
     *                  left as-is.
     * @param [warn] Display a warning notification when encountering an un-matched key.
     */
    static replaceFormulaData(
        formula: string,
        data: Record<string, unknown>,
        { missing, warn }?: { missing?: string; warn?: boolean },
    ): string;

    /**
     * Validate that a provided roll formula can represent a valid
     * @param formula A candidate formula to validate
     * @return Is the provided input a valid dice formula?
     */
    static validate(formula: string): boolean;

    /**
     * Split a formula by identifying its outer-most parenthetical and math terms
     * @param _formula      The raw formula to split
     * @returns An array of terms, split on parenthetical terms
     */
    protected static _splitParentheses(_formula: string): string[];

    /** Handle closing of a parenthetical term to create a FunctionTerm expression with a function and arguments */
    protected static _splitMathArgs(expression: string): FunctionTerm[];

    /**
     * Split a formula by identifying its outer-most dice pool terms
     * @param _formula The raw formula to split
     * @returns An array of terms, split on parenthetical terms
     */
    protected static _splitPools(_formula: string): PoolTerm[];

    /**
     * Split a formula by identifying its outer-most groups using a certain group symbol like parentheses or brackets.
     * @param _formula The raw formula to split
     * @param options  Options that configure how groups are split
     * @returns An array of terms, split on dice pool terms
     */
    protected static _splitGroup(
        _formula?: string,
        {
            openRegexp,
            closeRegexp,
            openSymbol,
            closeSymbol,
            onClose,
        }?: {
            openRegexp?: RegExp;
            closeRegexp?: RegExp;
            openSymbol?: string;
            closeSymbol?: string;
            onClose?: () => void | Promise<void>;
        },
    ): string[];

    /**
     * Split a formula by identifying arithmetic terms
     * @param _formula The raw formula to split
     * @returns An array of terms, split on arithmetic operators
     */
    protected static _splitOperators(_formula: string): (string | OperatorTerm)[];

    /**
     * Temporarily remove flavor text from a string formula allowing it to be accurately parsed.
     * @param formula The formula to extract
     * @returns The cleaned formula and extracted flavor mapping
     */
    protected static _extractFlavors(formula?: string): {
        formula: string;
        flavors: Record<string, string>;
    };

    /**
     * Restore flavor text to a string term
     * @param term    The string term possibly containing flavor symbols
     * @param flavors The extracted flavors object
     * @returns The restored term containing flavor text
     */
    protected static _restoreFlavor(term: string, flavors: Record<string, string>): RollTerm;

    /**
     * Classify a remaining string term into a recognized RollTerm class
     * @param term                         A remaining un-classified string
     * @param [options={}]                 Options which customize classification
     * @param [options.intermediate=false] Allow intermediate terms
     * @param [options.prior]              The prior classified term
     * @param [options.next]               The next term to classify
     * @returns A classified RollTerm instance
     */
    protected static _classifyStringTerm(
        term: string,
        { intermediate, prior, next }?: { intermediate?: boolean; prior?: RollTerm | string; next?: RollTerm | string },
    ): RollTerm;

    /* -------------------------------------------- */
    /*  Chat Messages                               */
    /* -------------------------------------------- */

    /**
     * Render the tooltip HTML for a Roll instance
     * @return The rendered HTML tooltip as a string
     */
    getTooltip(): Promise<string>;

    /**
     * Render a Roll instance to HTML
     * @param [options={}]              Options which affect how the Roll is rendered
     * @param [options.flavor]          Flavor text to include
     * @param [options.template]        A custom HTML template path
     * @param [options.isPrivate=false] Is the Roll displayed privately?
     * @returns The rendered HTML template as a string
     */
    render(options?: RollRenderOptions): Promise<string>;

    /**
     * Transform a Roll instance into a ChatMessage, displaying the roll result.
     * This function can either create the ChatMessage directly, or return the data object that will be used to create.
     *
     * @param messageData           The data object to use when creating the message
     * @param [options]             Additional options which modify the created message.
     * @param [options.rollMode]    The template roll mode to use for the message from CONFIG.Dice.rollModes
     * @param [options.create=true] Whether to automatically create the chat message, or only return the
     *                                          prepared chatData object.
     * @return A promise which resolves to the created ChatMessage entity, if create is true
     *         or the Object of prepared chatData otherwise.
     */
    toMessage(
        messageData: DeepPartial<ChatMessageSource> | undefined,
        { rollMode, create }: { rollMode?: RollMode | "roll"; create: false },
    ): Promise<ChatMessageSource>;
    toMessage(
        messageData?: DeepPartial<ChatMessageSource>,
        { rollMode, create }?: { rollMode?: RollMode | "roll"; create?: true },
    ): Promise<ChatMessage>;
    toMessage(
        messageData?: DeepPartial<ChatMessageSource>,
        { rollMode, create }?: { rollMode?: RollMode | "roll"; create?: boolean },
    ): Promise<ChatMessage | ChatMessageSource>;

    /* -------------------------------------------- */
    /*  Interface Helpers                           */
    /* -------------------------------------------- */

    /**
     * Expand an inline roll element to display it's contained dice result as a tooltip
     * @param a The inline-roll button
     */
    static expandInlineResult(a: HTMLAnchorElement): Promise<void>;

    /**
     * Collapse an expanded inline roll to conceal it's tooltip
     * @param a The inline-roll button
     */
    static collapseInlineResult(a: HTMLAnchorElement): HTMLAnchorElement;

    /* -------------------------------------------- */
    /*  Serialization and Loading                   */
    /* -------------------------------------------- */

    /**
     * Represent the data of the Roll as an object suitable for JSON serialization.
     * @return Structured data which can be serialized into JSON
     */
    toJSON(): RollJSON;

    /**
     * Recreate a Roll instance using a provided data object
     * @param data   Unpacked data representing the Roll
     * @return A reconstructed Roll instance
     */
    static fromData<T extends Roll>(this: AbstractConstructorOf<T>, data: RollJSON): T;

    /**
     * Recreate a Roll instance using a provided JSON string
     * @param json   Serialized JSON data representing the Roll
     * @return A reconstructed Roll instance
     */
    static fromJSON<T extends Roll>(this: AbstractConstructorOf<T>, json: string): T;

    /**
     * Manually construct a Roll object by providing an explicit set of input terms
     * @param terms      The array of terms to use as the basis for the Roll
     * @param [options={}] Additional options passed to the Roll constructor
     * @returns The constructed Roll instance
     *
     * @example
     * const t1 = new Die({number: 4, faces: 8};
     * const plus = new OperatorTerm({operator: "+"});
     * const t2 = new NumericTerm({number: 8});
     * const roll = Roll.fromTerms([t1, plus, t2]);
     * roll.formula; // 4d8 + 8
     */
    static fromTerms<T extends Roll>(this: ConstructorOf<T>, terms: RollTerm[], options?: RollOptions): T;
}

export interface RollJSON {
    class: string;
    options: Record<string, unknown>;
    data?: RollOptions;
    dice: DiceTerm[];
    formula: string;
    terms: RollTerm[] | RollTermData[];
    total?: number;
    evaluated: boolean;
}

export interface RollRenderOptions {
    /** Flavor text to include */
    flavor?: string;
    /** A custom HTML template path */
    template?: string;
    /** Is the Roll displayed privately? */
    isPrivate?: boolean;
}

/** An evaluated Roll instance */
export type Rolled<T extends Roll> = T & {
    readonly result: string;
    readonly total: number;
    _evaluated: true;
    terms: RollTerm[];
};

export interface EvaluateRollParams {
    /** Minimize the result, obtaining the smallest possible value. */
    minimize?: boolean;
    /** Maximize the result, obtaining the largest possible value. */
    maximize?: boolean;
    /** If true, string terms will not cause an error to be thrown during evaluation. */
    allowStrings?: boolean;
    /** If false, force the use of non-interactive rolls and do not prompt the user to make manual rolls. */
    allowInteractive?: boolean;
}

export interface EvaluateRollSyncParams extends EvaluateRollParams {
    strict?: boolean;
}

// Empty extended interface that can be expanded by the system without polluting Math itself
export interface RollMathProxy extends Math, Record<string, number | ((...args: any[]) => unknown)> {}
