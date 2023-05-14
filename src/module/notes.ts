import { UserVisibility } from "@scripts/ui/user-visibility.ts";
import { DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { PredicatePF2e, RawPredicate } from "@system/predication.ts";

class RollNotePF2e {
    /** The selector used to determine on which rolls the note will be shown for. */
    selector: string;
    /** An optional title for the note */
    #title: string | null;
    /** The text content of this note. */
    #text: string;
    /** If true, these dice are user-provided/custom. */
    predicate: PredicatePF2e;
    /** List of outcomes to show this note for; or all outcomes if none are specified */
    outcome: DegreeOfSuccessString[];
    /** An optional visibility restriction for the note */
    visibility: UserVisibility | null;

    constructor(params: RollNoteSource) {
        this.selector = params.selector;
        this.predicate = new PredicatePF2e(params.predicate ?? []);
        this.outcome = [...(params.outcome ?? [])];
        this.visibility = params.visibility ?? null;
        this.#title = params.title ?? null;
        this.#text = params.text;
    }

    get text(): string {
        const section = document.createElement("section");
        section.innerHTML = game.i18n.localize(this.#text);
        // Remove wrapping elements, such as from item descriptions
        const { firstChild } = section;
        if (section.childNodes.length === 1 && firstChild instanceof HTMLElement) {
            section.innerHTML = firstChild.innerHTML;
        }
        section.classList.add("roll-note");

        if (this.visibility) {
            section.dataset.visibility = this.visibility;
        }

        if (this.#title) {
            const strong = document.createElement("strong");
            strong.innerHTML = game.i18n.localize(this.#title);
            section.prepend(strong, " ");
        }

        return section.outerHTML;
    }

    clone(): RollNotePF2e {
        return new RollNotePF2e(this.toObject());
    }

    toObject(): RollNoteSource {
        return {
            selector: this.selector,
            title: this.#title,
            text: this.#text,
            predicate: this.predicate,
            outcome: this.outcome,
            visibility: this.visibility,
        };
    }
}

interface RollNoteSource {
    selector: string;
    title?: string | null;
    text: string;
    predicate?: RawPredicate;
    outcome?: DegreeOfSuccessString[];
    visibility?: UserVisibility | null;
}

export { RollNotePF2e, RollNoteSource };
