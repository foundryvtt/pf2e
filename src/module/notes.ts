import { UserVisibility } from "@scripts/ui/user-visibility";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { PredicatePF2e, RawPredicate } from "@system/predication";

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

    #textResolver: ((text: string) => string) | null;

    constructor(params: RollNoteSource) {
        this.selector = params.selector;
        this.predicate = PredicatePF2e.create(params.predicate ?? []);
        this.outcome = [...(params.outcome ?? [])];
        this.visibility = params.visibility ?? null;
        this.#title = params.title ?? null;
        this.#text = params.text;
        this.#textResolver = params.textResolver ?? null;
    }

    get text(): string {
        const section = document.createElement("section");
        const localizedText = game.i18n.localize(this.#text);
        section.innerHTML = this.#textResolver ? this.#textResolver(localizedText) : localizedText;
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
            const localizedTitle = game.i18n.localize(this.#title);
            strong.innerHTML = this.#textResolver ? this.#textResolver(localizedTitle) : localizedTitle;
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
            textResolver: this.#textResolver,
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
    textResolver?: ((text: string) => string) | null;
}

export { RollNotePF2e, RollNoteSource };
