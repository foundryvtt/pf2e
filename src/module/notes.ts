import { ModifierPredicate } from "./modifiers";
import { DegreeOfSuccessString } from "@system/check-degree-of-success";

export class RollNotePF2e {
    /** The selector used to determine on which rolls the note will be shown for. */
    selector: string;
    /** The text content of this note. */
    text: string;
    /** If true, these dice are user-provided/custom. */
    predicate?: ModifierPredicate;
    /** List of outcomes to show this note for; or all outcomes if none are specified */
    outcome: DegreeOfSuccessString[];

    constructor(selector: string, text: string, predicate?: ModifierPredicate, outcome: DegreeOfSuccessString[] = []) {
        this.selector = selector;
        this.text = text;
        this.predicate = predicate;
        this.outcome = outcome;
    }
}
