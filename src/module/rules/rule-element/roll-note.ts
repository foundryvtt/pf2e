import { ItemPF2e } from "@item";
import { RollNotePF2e } from "@module/notes";
import { UserVisibility } from "@scripts/ui/user-visibility";
import { DegreeOfSuccessString, DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success";
import { isObject, tupleHasValue } from "@util";
import { BracketedValue, RuleElementPF2e, RuleElementSource } from "./";
import { RuleElementOptions } from "./base";

export class RollNoteRuleElement extends RuleElementPF2e {
    /** An optional title prepended to the note */
    private title: string | null;

    /** The text of the note */
    private text: string | BracketedValue<string>;

    /** Applicable degree-of-success outcomes for the note */
    private outcomes: DegreeOfSuccessString[];

    /** An optional visibility setting for the note */
    private visibility: UserVisibility | null;

    constructor(data: RollNoteSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        data.title ??= null;
        data.outcome ??= [];
        data.visibility ??= null;
        if (this.#isValid(data)) {
            this.title = data.title;
            this.text = data.text;
            this.outcomes = data.outcome;
            this.visibility = data.visibility;
        } else {
            this.title = null;
            this.text = "";
            this.outcomes = [];
            this.visibility = null;
        }
    }

    #isValid(data: RollNoteSource): data is RollNoteData {
        const titleIsValid = data.title === null || (typeof data.title === "string" && data.title.length > 0);
        const textIsValidBracket = isObject<{ brackets: unknown }>(data.text) && Array.isArray(data.text.brackets);
        const textIsValid = textIsValidBracket || (typeof data.text === "string" && data.text.length > 0);
        const visibilityIsValid =
            data.visibility === null || (data.visibility === "string" && ["owner", "gm"].includes(data.visibility));
        const outcomesAreValid =
            Array.isArray(data.outcome) && data.outcome.every((o) => tupleHasValue(DEGREE_OF_SUCCESS_STRINGS, o));

        return [titleIsValid, textIsValid, visibilityIsValid, outcomesAreValid].every((v) => v);
    }

    override beforePrepareData(): void {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const title = this.title ? this.resolveInjectedProperties(this.title) : null;
        const text = this.resolveInjectedProperties(String(this.resolveValue(this.text, "", { evaluate: false })));
        if (selector && text) {
            const predicate = this.data.predicate ?? {};
            const note = new RollNotePF2e({
                selector,
                title,
                text,
                predicate,
                outcome: this.outcomes,
                visibility: this.visibility,
            });
            const notes = (this.actor.synthetics.rollNotes[selector] ??= []);
            notes.push(note);
        } else {
            console.warn("PF2E | Roll note requires at least a selector field and a non-empty text field");
        }
    }
}

interface RollNoteSource extends RuleElementSource {
    outcome?: unknown;
    title?: unknown;
    text?: unknown;
    visibility?: unknown;
}

interface RollNoteData extends RollNoteSource {
    outcome: DegreeOfSuccessString[];
    title: string | null;
    text: string | BracketedValue<string>;
    visibility: UserVisibility | null;
}
