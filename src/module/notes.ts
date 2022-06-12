import { DegreeOfSuccessString } from "@system/degree-of-success";
import { PredicatePF2e, RawPredicate } from "@system/predication";

export class RollNotePF2e {
    /** The selector used to determine on which rolls the note will be shown for. */
    selector: string;
    /** The text content of this note. */
    text: string;
    /** If true, these dice are user-provided/custom. */
    predicate: PredicatePF2e;
    /** List of outcomes to show this note for; or all outcomes if none are specified */
    outcome: DegreeOfSuccessString[];

    constructor(selector: string, text: string, predicate: RawPredicate = {}, outcome: DegreeOfSuccessString[] = []) {
        this.selector = selector;
        this.text = game.i18n.localize(text);
        this.predicate = new PredicatePF2e(predicate);
        this.outcome = [...outcome];
    }

    clone(): RollNotePF2e {
        return new RollNotePF2e(this.selector, this.text, this.predicate, this.outcome);
    }
}
