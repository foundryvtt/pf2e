import { PF2ModifierPredicate } from './modifiers';

export class PF2RollNote {
    /** The selector used to determine on which rolls the note will be shown for. */
    selector: string;
    /** The text content of this note. */
    text: string;
    /** If true, these dice are user-provided/custom. */
    predicate?: PF2ModifierPredicate;

    constructor(selector: string, text: string, predicate?: PF2ModifierPredicate) {
        this.selector = selector;
        this.text = text;
        this.predicate = predicate;
    }
}
