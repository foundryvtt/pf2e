import { UserVisibility } from "@scripts/ui/user-visibility";
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
    /** An optional visibility restriction for the note */
    visibility: UserVisibility | null;

    constructor(params: RollNoteParams) {
        this.selector = params.selector;
        this.predicate = new PredicatePF2e(params.predicate ?? {});
        this.outcome = [...(params.outcome ?? [])];
        this.visibility = params.visibility ?? null;
        this.text = this.#createText(params.title ?? null, params.text);
    }

    #createText(title: string | null, text: string) {
        const paragraph = document.createElement("p");
        paragraph.className = "compact-text";
        paragraph.innerHTML = game.i18n.localize(text);
        // Remove wrapping elements, such as from item descriptions
        const { firstChild } = paragraph;
        if (paragraph.childNodes.length === 1 && firstChild instanceof HTMLElement) {
            paragraph.innerHTML = firstChild.innerHTML;
        }

        if (this.visibility) {
            paragraph.dataset.visibility = this.visibility;
        }

        if (title) {
            const strong = document.createElement("strong");
            strong.innerHTML = game.i18n.localize(title);
            paragraph.prepend(strong, " ");
        }

        return paragraph.outerHTML;
    }

    clone(): RollNotePF2e {
        return new RollNotePF2e({
            selector: this.selector,
            text: this.text,
            predicate: this.predicate,
            outcome: this.outcome,
        });
    }
}

interface RollNoteParams {
    selector: string;
    title?: string | null;
    text: string;
    predicate?: RawPredicate;
    outcome?: DegreeOfSuccessString[];
    visibility?: UserVisibility | null;
}
