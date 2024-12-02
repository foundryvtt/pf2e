import HandlebarsApplicationMixin from "../api/handlebars-application.js";
import ApplicationV2 from "../api/application.js";
import {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationFormConfiguration,
    ApplicationRenderOptions,
} from "../_types.js";

/**
 * @typedef {object} DiceTermFulfillmentDescriptor
 * @property {string} id        A unique identifier for the term.
 * @property {DiceTerm} term    The term.
 * @property {string} method    The fulfillment method.
 * @property {boolean} [isNew]  Was the term newly-added to this resolver?
 */

/**
 * An application responsible for handling unfulfilled dice terms in a roll.
 */
declare class RollResolver extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(roll: Roll, options?: DeepPartial<ApplicationConfiguration>);

    /**
     * A collection of fulfillable dice terms.
     */
    get fulfillable(): Map<string, RollResolver.DiceTermFulfillmentDescriptor>;

    /**
     * The roll being resolved.
     * @type {Roll}
     */
    get roll(): Roll;

    /**
     * Identify any terms in this Roll that should be fulfilled externally, and prompt the user to do so.
     * @returns Returns a Promise that resolves when the first pass of fulfillment is complete.
     */
    awaitFulfillment(): Promise<void>;

    /**
     * Register a fulfilled die roll.
     * @param method The method used for fulfillment.
     * @param denomination The denomination of the fulfilled die.
     * @param result The rolled number.
     * @returns Whether the result was consumed.
     */
    registerResult(method: string, denomination: string, result: number): boolean;

    override close(options?: ApplicationClosingOptions): Promise<this>;

    protected override _prepareContext(options: ApplicationRenderOptions): Promise<object>;

    protected override _onSubmitForm(
        formConfig: ApplicationFormConfiguration,
        event: Event | SubmitEvent,
    ): Promise<void>;

    /**
     * Handle prompting for a single extra result from a term.
     * @param term The term.
     * @param method The method used to obtain the result.
     */
    resolveResult(
        term: foundry.dice.terms.DiceTerm,
        method: string,
        { reroll, explode }?: { reroll?: boolean; explode?: boolean },
    ): Promise<number | void>;

    /**
     * Update the Roll instance with the fulfilled results.
     * @param event The originating form submission event.
     * @param form The form element that was submitted.
     * @param formData Processed data for the submitted form.
     */
    protected static _fulfillRoll(event: SubmitEvent, form: HTMLFormElement, formData: FormDataExtended): Promise<void>;

    /**
     * Add a new term to the resolver.
     * @param term The term.
     * @returns Returns a Promise that resolves when the term's results have been externally fulfilled.
     */
    addTerm(term: foundry.dice.terms.DiceTerm): Promise<void>;

    /**
     * Check if all rolls have been fulfilled.
     */
    protected _checkDone(): void;

    /**
     * Toggle the state of the submit button.
     * @param enabled Whether the button is enabled.
     */
    protected _toggleSubmission(enabled: boolean): void;
}

declare namespace RollResolver {
    interface DiceTermFulfillmentDescriptor {
        id: string;
        term: foundry.dice.terms.DiceTerm;
        method: string;
        isNew?: boolean | undefined;
    }
}

export default RollResolver;
