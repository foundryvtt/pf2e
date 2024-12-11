import { RollParseNode } from "./_types.mjs";
import { DiceTerm, RollTerm } from "./terms/_module.mjs";

/**
 * An interface and API for constructing and evaluating dice rolls.
 * The basic structure for a dice roll is a string formula and an object of data against which to parse it.
 *
 * @example Attack with advantage
 * ```js
 * // Construct the Roll instance
 * let r = new Roll("2d20kh + @prof + @strMod", {prof: 2, strMod: 4});
 *
 * // The parsed terms of the roll formula
 * console.log(r.terms);    // [Die, OperatorTerm, NumericTerm, OperatorTerm, NumericTerm]
 *
 * // Execute the roll
 * await r.evaluate();
 *
 * // The resulting equation after it was rolled
 * console.log(r.result);   // 16 + 2 + 4
 *
 * // The total resulting from the roll
 * console.log(r.total);    // 22
 * ```
 */
declare class Roll {
    /**
     * @param formula The string formula to parse
     * @param data The data object against which to parse attributes within the formula
     * @param options Options which modify or describe the Roll
     */
    constructor(formula: string, data?: Record<string, unknown>, options?: RollOptions);

    /**
     * The original provided data object which substitutes into attributes of the roll formula.
     */
    data: Record<string, unknown>;

    /**
     * Options which modify or describe the Roll
     */
    options: RollOptions;

    /**
     * The identified terms of the Roll
     */
    terms: RollTerm[];

    /**
     * An array of inner DiceTerms that were evaluated as part of the Roll evaluation
     */
    protected _dice: DiceTerm[];

    /**
     * Store the original cleaned formula for the Roll, prior to any internal evaluation or simplification
     */
    _formula: string;

    /**
     * Track whether this Roll instance has been evaluated or not. Once evaluated the Roll is immutable.
     */
    _evaluated: boolean;

    /**
     * Cache the numeric total generated through evaluation of the Roll.
     */
    protected _total: number | undefined;

    /**
     * A reference to the Roll at the root of the evaluation tree.
     */
    protected _root: Roll;

    /**
     * A reference to the RollResolver app being used to externally resolve this Roll.
     */
    protected _resolver: foundry.applications.dice.RollResolver;

    /**
     * A Proxy environment for safely evaluating a string using only available Math functions
     */
    static MATH_PROXY: Math;

    /**
     * The HTML template path used to render a complete Roll object to the chat log
     */
    static CHAT_TEMPLATE: string;

    /**
     * The HTML template used to render an expanded Roll tooltip to the chat log
     */
    static TOOLTIP_TEMPLATE: string;

    /**
     * A mapping of Roll instances to currently-active resolvers.
     */
    static RESOLVERS: Map<Roll, foundry.applications.dice.RollResolver>;

    /**
     * Prepare the data structure used for the Roll.
     * This is factored out to allow for custom Roll classes to do special data preparation using provided input.
     * @param data Provided roll data
     * @returns The prepared data object
     */
    protected _prepareData(data: Record<string, unknown>): Record<string, unknown>;
    /*  Roll Attributes                             */
    /**
     * Return an Array of the individual DiceTerm instances contained within this Roll.
     */
    get dice(): DiceTerm[];

    /**
     * Return a standardized representation for the displayed formula associated with this Roll.
     */
    get formula(): string;

    /**
     * The resulting arithmetic expression after rolls have been evaluated
     * @type {string}
     */
    get result(): string;

    /**
     * Return the total result of the Roll expression if it has been evaluated.
     */
    get total(): number | undefined;

    /**
     * Return the arbitrary product of evaluating this Roll.
     */
    get product(): number | undefined;

    /**
     * Whether this Roll contains entirely deterministic terms or whether there is some randomness.
     */
    get isDeterministic(): boolean;
    /*  Roll Instance Methods                       */
    /**
     * Alter the Roll expression by adding or multiplying the number of dice which are rolled
     * @param multiply A factor to multiply. Dice are multiplied before any additions.
     * @param add A number of dice to add. Dice are added after multiplication.
     * @param multiplyNumeric Apply multiplication factor to numeric scalar terms
     * @returns The altered Roll expression
     */
    alter(multiply: number, add: number, { multiplyNumeric }?: { multiplyNumeric?: boolean }): this;

    /**
     * Clone the Roll instance, returning a new Roll instance that has not yet been evaluated.
     */
    clone(): this;

    /**
     * Execute the Roll asynchronously, replacing dice and evaluating the total result
     * @param minimize Minimize the result, obtaining the smallest possible value.
     * @param maximize Maximize the result, obtaining the largest possible value.
     * @param allowStrings If true, string terms will not cause an error to be thrown during evaluation.
     * @param allowInteractive If false, force the use of non-interactive rolls and do not prompt the user to make manual rolls.
     * @returns The evaluated Roll instance
     *
     * @example Evaluate a Roll expression
     * ```js
     * let r = new Roll("2d6 + 4 + 1d4");
     * await r.evaluate();
     * console.log(r.result); // 5 + 4 + 2
     * console.log(r.total);  // 11
     * ```
     */
    evaluate({
        minimize,
        maximize,
        allowStrings,
        allowInteractive,
    }?: {
        minimize?: boolean;
        maximize?: boolean;
        allowStrings?: boolean;
        allowInteractive?: boolean;
    }): Promise<Rolled<this>>;

    /**
     * Execute the Roll synchronously, replacing dice and evaluating the total result.
     * @param minimize Minimize the result, obtaining the smallest possible value.
     * @param maximize Maximize the result, obtaining the largest possible value.
     * @param strict Throw an Error if the Roll contains non-deterministic terms that cannot be evaluated synchronously. If this is set to false, non-deterministic terms will be ignored.
     * @param allowStrings If true, string terms will not cause an error to be thrown during evaluation.
     * @returns The evaluated Roll instance.
     */
    evaluateSync({
        minimize,
        maximize,
        strict,
        allowStrings,
    }?: {
        minimize?: boolean;
        maximize?: boolean;
        strict?: boolean;
        allowStrings?: boolean;
    }): Rolled<this>;

    /**
     * Evaluate the roll asynchronously.
     * @param minimize Force the result to be minimized
     * @param maximize Force the result to be maximized
     * @param allowStrings If true, string terms will not cause an error to be thrown during evaluation.
     * @param allowInteractive If false, force the use of digital rolls and do not prompt the user to make manual rolls.
     */
    protected _evaluate({
        minimize,
        maximize,
        allowStrings,
        allowInteractive,
    }?: {
        minimize?: boolean;
        maximize?: boolean;
        allowStrings?: boolean;
        allowInteractive?: boolean;
    }): Promise<Rolled<this>>;

    /**
     * Evaluate an AST asynchronously.
     * @param node The root node or term.
     * @param minimize Force the result to be minimized
     * @param maximize Force the result to be maximized
     * @param allowStrings If true, string terms will not cause an error to be thrown during evaluation.
     */
    protected _evaluateASTAsync(
        node: RollParseNode | RollTerm,
        { minimize, maximize, allowString }?: { minimize?: boolean; maximize?: boolean; allowString?: boolean },
    ): Promise<string | number>;

    /**
     * Evaluate the roll synchronously.
     * @param options.minimize Force the result to be minimized
     * @param options.maximize Force the result to be maximized
     * @param options.strict Throw an error if encountering a term that cannot be synchronously evaluated.
     * @param options.allowStrings If true, string terms will not cause an error to be thrown during evaluation.
     */
    protected _evaluateSync({
        minimize,
        maximize,
        strict,
        allowStrings,
    }?: {
        minimize?: boolean;
        maximize?: boolean;
        strict?: boolean;
        allowStrings?: boolean;
    }): Rolled<this>;

    /**
     * Evaluate an AST synchronously.
     * @param node The root node or term.
     * @param minimize Force the result to be minimized
     * @param maximize Force the result to be maximized
     * @param strict Throw an error if encountering a term that cannot be synchronously evaluated.
     * @param allowStrings If true, string terms will not cause an error to be thrown during evaluation.
     */
    protected _evaluateASTSync(
        node: RollParseNode | RollTerm,
        {
            minimize,
            maximize,
            strict,
            allowString,
        }?: { minimize?: boolean; maximize?: boolean; strict?: boolean; allowString?: boolean },
    ): string | number;

    /**
     * Safely evaluate the final total result for the Roll using its component terms.
     * @returns The evaluated total
     */
    protected _evaluateTotal(): number;

    /**
     * Alias for evaluate.
     * @see {Roll#evaluate}
     */
    roll(options?: EvaluateRollParams): Promise<Rolled<this>>;

    /**
     * Create a new Roll object using the original provided formula and data.
     * Each roll is immutable, so this method returns a new Roll instance using the same data.
     * @param options Evaluation options passed to Roll#evaluate
     * @returns A new Roll object, rolled using the same formula and data
     */
    reroll(options?: EvaluateRollParams): Promise<Rolled<this>>;

    /**
     * Recompile the formula string that represents this Roll instance from its component terms.
     * @returns The re-compiled formula
     */
    resetFormula(): string;

    /**
     * Propagate flavor text across all terms that do not have any.
     * @param flavor The flavor text.
     */
    propagateFlavor(flavor: string): void;

    toString(): string;

    /* -------------------------------------------- */
    /*  Static Class Methods                        */
    /* -------------------------------------------- */

    /**
     * A factory method which constructs a Roll instance using the default configured Roll class.
     * @param formula The formula used to create the Roll instance
     * @param data The data object which provides component data for the formula
     * @param options Additional options which modify or describe this Roll
     * @returns The constructed Roll instance
     */
    static create(formula: string, data?: Record<string, unknown>, options?: RollOptions): Roll;

    /**
     * Get the default configured Roll class.
     */
    static get defaultImplementation(): typeof Roll;

    /**
     * Retrieve the appropriate resolver implementation based on the user's configuration.
     */
    static get resolverImplementation(): typeof foundry.applications.dice.RollResolver;

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
     * @returns The rolled totals
     */
    static simulate(formula: string, n?: number): Promise<number[]>;

    /**
     * Register an externally-fulfilled result with an active RollResolver.
     * @param method The fulfillment method.
     * @param denomination The die denomination being fulfilled.
     * @param result The obtained result.
     * @returns Whether the result was consumed. Returns undefined if no resolver was available.
     */
    static registerResult(method: string, denomination: string, result: number): boolean | void;

    /* -------------------------------------------- */
    /*  Roll Formula Parsing                        */
    /* -------------------------------------------- */

    /**
     * Parse a formula expression using the compiled peggy grammar.
     * @param formula The original string expression to parse.
     * @param data A data object used to substitute for attributes in the formula.
     */
    static parse(formula: string, data: object): RollTerm[];
    /**
     * Instantiate the nodes in an AST sub-tree into RollTerm instances.
     * @param ast The root of the AST sub-tree.
     */
    static instantiateAST(ast: RollParseNode): RollTerm[];

    /**
     * Replace referenced data attributes in the roll formula with values from the provided data.
     * Data references in the formula use the @attr syntax and would reference the corresponding attr key.
     * @param formula The original formula within which to replace
     * @param data The data object which provides replacements
     * @param missing The value that should be assigned to any unmatched keys. If null, the unmatched key is left as-is.
     * @param warn Display a warning notification when encountering an un-matched key.
     */
    static replaceFormulaData(
        formula: string,
        data: Record<string, unknown>,
        { missing, warn }?: { missing?: string; warn?: boolean },
    ): string;

    /**
     * Validate that a provided roll formula can represent a valid
     * @param formula A candidate formula to validate
     * @returns Is the provided input a valid dice formula?
     */
    static validate(formula: string): boolean;

    /**
     * Determine which of the given terms require external fulfillment.
     * @param terms The terms.
     */
    static identifyFulfillableTerms(terms: RollTerm[]): DiceTerm[];

    /**
     * Classify a remaining string term into a recognized RollTerm class
     * @param term A remaining un-classified string
     * @param intermediate Allow intermediate terms
     * @param prior The prior classified term
     * @param next The next term to classify
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
     * @returns {Promise<string>}     The rendered HTML tooltip as a string
     */
    getTooltip(): Promise<string>;

    /**
     * Render a Roll instance to HTML
     * @param flavor Flavor text to include
     * @param template A custom HTML template path
     * @param isPrivate Is the Roll displayed privately?
     * @returns The rendered HTML template as a string
     */
    render({
        flavor,
        template,
        isPrivate,
    }?: {
        flavor?: string;
        template?: string;
        isPrivate?: boolean;
    }): Promise<string>;

    /**
     * Transform a Roll instance into a ChatMessage, displaying the roll result.
     * This function can either create the ChatMessage directly, or return the data object that will be used to create.
     * @param messageData The data object to use when creating the message
     * @param rollMode The template roll mode to use for the message from CONFIG.Dice.rollModes
     * @param create Whether to automatically create the chat message, or only return the prepared chatData object.
     * @returns A promise which resolves to the created ChatMessage document if create is true, or the Object of prepared chatData otherwise.
     */
    toMessage(
        messageData: PreCreate<foundry.documents.ChatMessageSource> | undefined,
        { rollMode, create }: { rollMode?: RollMode | "roll"; create: false },
    ): Promise<foundry.documents.ChatMessageSource>;
    toMessage(
        messageData?: PreCreate<foundry.documents.ChatMessageSource>,
        { rollMode, create }?: { rollMode?: RollMode | "roll"; create?: true },
    ): Promise<ChatMessage>;
    toMessage(
        messageData?: PreCreate<foundry.documents.ChatMessageSource>,
        { rollMode, create }?: { rollMode?: RollMode | "roll"; create?: boolean },
    ): Promise<ChatMessage | foundry.documents.ChatMessageSource>;

    /* -------------------------------------------- */
    /*  Interface Helpers                           */
    /* -------------------------------------------- */

    /**
     * Expand an inline roll element to display its contained dice result as a tooltip.
     * @param a The inline-roll button
     */
    static expandInlineResult(a: HTMLAnchorElement): Promise<void>;

    /**
     * Collapse an expanded inline roll to conceal its tooltip.
     * @param a The inline-roll button
     */
    static collapseInlineResult(a: HTMLAnchorElement): void;

    /**
     * Construct an inline roll link for this Roll.
     * @param label A custom label for the total.
     * @param attrs Attributes to set on the link.
     * @param dataset Custom data attributes to set on the link.
     * @param classes Additional classes to add to the link. The classes `inline-roll` and `inline-result` are added by default.
     * @param icon A font-awesome icon class to use as the icon instead of a d20.
     * @returns {HTMLAnchorElement}
     */
    toAnchor({
        attrs,
        dataset,
        classes,
        label,
        icon,
    }?: {
        attrs?: Record<string, string>;
        dataset?: Record<string, string>;
        classes?: string[];
        label?: string;
        icon?: string;
    }): HTMLAnchorElement;

    /* -------------------------------------------- */
    /*  Serialization and Loading                   */
    /* -------------------------------------------- */

    /**
     * Represent the data of the Roll as an object suitable for JSON serialization.
     * @returns Structured data which can be serialized into JSON
     */
    toJSON(): {
        class: string;
        options: Record<string, unknown>;
        data?: RollOptions;
        dice: DiceTerm[];
        formula: string;
        terms: RollTerm[] | RollTermData[];
        total?: number;
        evaluated: boolean;
    };

    /**
     * Recreate a Roll instance using a provided data object
     * @param data Unpacked data representing the Roll
     * @returns A reconstructed Roll instance
     */
    static fromData<T extends Roll>(this: AbstractConstructorOf<T>, data: RollJSON): T;

    /**
     * Recreate a Roll instance using a provided JSON string
     * @param json Serialized JSON data representing the Roll
     * @returns A reconstructed Roll instance
     */
    static fromJSON<T extends Roll>(this: AbstractConstructorOf<T>, json: string): T;

    /**
     * Manually construct a Roll object by providing an explicit set of input terms
     * @param terms The array of terms to use as the basis for the Roll
     * @param options Additional options passed to the Roll constructor
     * @returns The constructed Roll instance
     *
     * @example Construct a Roll instance from an array of component terms
     * ```js
     * const t1 = new Die({number: 4, faces: 8};
     * const plus = new OperatorTerm({operator: "+"});
     * const t2 = new NumericTerm({number: 8});
     * const roll = Roll.fromTerms([t1, plus, t2]);
     * roll.formula; // 4d8 + 8
     * ```
     */
    static fromTerms<T extends Roll>(this: ConstructorOf<T>, terms: RollTerm[], options?: RollOptions): T;
}

// These are here for compatibility reasons
declare global {
    interface RollOptions {
        flavor?: string;
        [key: string]: JSONValue;
    }

    type RollJSON = ReturnType<Roll["toJSON"]>;

    type RollRenderOptions = NonNullable<Parameters<Roll["render"]>[0]>;

    /** An evaluated Roll instance */
    type Rolled<T extends Roll> = T & {
        readonly result: string;
        readonly total: number;
        _evaluated: true;
        terms: RollTerm[];
    };

    type EvaluateRollParams = NonNullable<Parameters<Roll["_evaluate"]>[0]>;
}

export default Roll;
