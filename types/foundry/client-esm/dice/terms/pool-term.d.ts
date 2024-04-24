import type { DiceTerm } from "./dice-term.d.ts";
import type { RollTerm } from "./roll-term.d.ts";

/**
 * A dice pool represents a set of Roll expressions which are collectively modified to compute an effective total
 * across all Rolls in the pool. The final total for the pool is defined as the sum over kept rolls, relative to any
 * success count or margin.
 *
 * @example
 * // Keep the highest of the 3 roll expressions
 * let pool = new PoolTerm({
 *   rolls: ["4d6", "3d8 - 1", "2d10 + 3"],
 *   modifiers: ["kh"]
 * });
 * pool.evaluate();
 */
export class PoolTerm<TData extends PoolTermData = PoolTermData> extends RollTerm<TData> {
    constructor({
        terms,
        modifiers,
        rolls,
        results,
        options,
    }?: Omit<TData, "rolls"> & { rolls: TData["rolls"] | Roll[] });

    /** The original provided terms to the Dice Pool */
    terms: RollTerm[];

    /** The string modifiers applied to resolve the pool */
    modifiers: string[];

    /** Each component term of a dice pool is evaluated as a Roll instance */
    rolls: Roll[];

    /** The array of dice pool results which have been rolled */
    results: DiceTermResult[];

    /** Define the modifiers that can be used for this particular DiceTerm type. */
    static MODIFIERS: {
        k: "keep";
        kh: "keep";
        kl: "keep";
        d: "drop";
        dh: "drop";
        dl: "drop";
        cs: "countSuccess";
        cf: "countFailures";
    };

    /** The regular expression pattern used to identify the opening of a dice pool expression. */
    static OPEN_REGEXP: RegExp;

    /** A regular expression pattern used to identify the closing of a dice pool expression. */
    static CLOSE_REGEXP: RegExp;

    static override SERIALIZE_ATTRIBUTES: ["terms", "modifiers", "rolls", "results"];

    /* -------------------------------------------- */
    /*  Dice Pool Attributes                        */
    /* -------------------------------------------- */

    /** Return an Array of each individual DiceTerm instances contained within the PoolTerm. */
    get dice(): DiceTerm[];

    override get expression(): string;

    override get total(): number | undefined;

    /** Return an array of rolled values which are still active within the PoolTerm */
    get values(): number[];

    /* -------------------------------------------- */

    /**
     * Alter the DiceTerm by adding or multiplying the number of dice which are rolled
     * @param args Arguments passed to each contained Roll#alter method.
     * @return The altered pool
     */
    alter(...args: unknown[]): this[];

    protected override _evaluateSync({ minimize, maximize }?: Omit<EvaluateRollParams, "async">): Evaluated<this>;

    protected override _evaluate({ minimize, maximize }?: Omit<EvaluateRollParams, "async">): Promise<Evaluated<this>>;

    /**
     * Use the same logic as for the DiceTerm to avoid duplication
     * @see DiceTerm#_evaluateModifiers
     */
    _evaluateModifiers(): void;

    /**
     * Use the same logic as for the DiceTerm to avoid duplication
     * @see DiceTerm#_evaluateModifier
     */
    _evaluateModifier(command: string, modifier: string): void;

    /* -------------------------------------------- */
    /*  Saving and Loading                          */
    /* -------------------------------------------- */

    protected static override _fromData<D extends RollTermData, T extends RollTerm<D>>(
        this: ConstructorOf<T>,
        data: D,
    ): T;

    /**
     * Given a string formula, create and return an evaluated PoolTerm object
     * @param formula   The string formula to parse
     * @param [options] Additional options applied to the PoolTerm
     * @return The evaluated PoolTerm object or null if the formula is invalid
     */
    static fromExpression<D extends PoolTermData, T extends PoolTerm<D>>(
        this: ConstructorOf<T>,
        formula: string,
        options?: Record<string, unknown>,
    ): T | null;

    /**
     * Create a PoolTerm by providing an array of existing Roll objects
     * @param rolls An array of Roll objects from which to create the pool
     * @returns The constructed PoolTerm comprised of the provided rolls
     */
    static fromRolls<TTerm extends PoolTerm>(this: ConstructorOf<TTerm>, rolls?: Roll[]): TTerm;

    /* -------------------------------------------- */
    /*  Modifiers                                   */
    /* -------------------------------------------- */

    /**
     * Keep a certain number of highest or lowest dice rolls from the result set.
     *
     * {1d6,1d8,1d10,1d12}kh2       Keep the 2 best rolls from the pool
     * {1d12,6}kl                   Keep the lowest result in the pool
     *
     * @param modifier The matched modifier query
     */
    keep(modifier: string): void;

    /**
     * Keep a certain number of highest or lowest dice rolls from the result set.
     *
     * {1d6,1d8,1d10,1d12}dl3       Drop the 3 worst results in the pool
     * {1d12,6}dh                   Drop the highest result in the pool
     *
     * @param modifier The matched modifier query
     */
    drop(modifier: string): void;

    /**
     * Count the number of successful results which occurred in the pool.
     * Successes are counted relative to some target, or relative to the maximum possible value if no target is given.
     * Applying a count-success modifier to the results re-casts all results to 1 (success) or 0 (failure)
     *
     * 20d20cs      Count the number of dice which rolled a 20
     * 20d20cs>10   Count the number of dice which rolled higher than 10
     * 20d20cs<10   Count the number of dice which rolled less than 10
     *
     * @param modifier The matched modifier query
     */
    countSuccess(modifier: string): void;

    /**
     * Count the number of failed results which occurred in a given result set.
     * Failures are counted relative to some target, or relative to the lowest possible value if no target is given.
     * Applying a count-failures modifier to the results re-casts all results to 1 (failure) or 0 (non-failure)
     *
     * 6d6cf      Count the number of dice which rolled a 1 as failures
     * 6d6cf<=3   Count the number of dice which rolled less than 3 as failures
     * 6d6cf>4    Count the number of dice which rolled greater than 4 as failures
     *
     * @param modifier The matched modifier query
     */
    countFailures(modifier: string): void;
}

declare global {
    interface PoolTermData extends RollTermData {
        terms?: string[];
        modifiers?: string[];
        rolls?: RollJSON[];
        results?: DiceTermResult[];
    }
}
