import { UserVisibility } from "@scripts/ui/user-visibility.ts";
import { DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { Predicate, RawPredicate } from "@system/predication.ts";
import { createHTMLElement } from "@util";
import type { RuleElement } from "./rules/index.ts";

class RollNotePF2e {
    /** The selector used to determine on which rolls the note will be shown for. */
    selector: string;
    /** An optional title for the note */
    title: string | null;
    /** The text content of this note. */
    text: string;
    /** If true, these dice are user-provided/custom. */
    predicate: Predicate;
    /** List of outcomes to show this note for; or all outcomes if none are specified */
    outcome: DegreeOfSuccessString[];
    /** An optional visibility restriction for the note */
    visibility: UserVisibility | null;
    /** The originating rule element of this modifier, if any: used to retrieve "parent" item roll options */
    rule: RuleElement | null;

    constructor(params: RollNoteParams) {
        this.selector = params.selector;
        this.title = params.title ?? null;
        this.text = params.text;
        this.predicate = new Predicate(params.predicate ?? []);
        this.outcome = [...(params.outcome ?? [])];
        this.visibility = params.visibility ?? null;
        this.rule = params.rule ?? null;
    }

    /** Convert an array of notes to a UL element, or null if the array is empty. */
    static notesToHTML(notes: RollNotePF2e[]): HTMLUListElement | null {
        if (notes.length === 0) return null;
        return createHTMLElement("ul", {
            classes: ["notes"],
            children: [...notes.flatMap((n) => ["\n", n.toHTML()]), "\n"],
        });
    }

    toHTML(): HTMLLIElement {
        const element = createHTMLElement("li", {
            classes: ["roll-note"],
            dataset: {
                itemId: this.rule?.item.id,
                visibility: this.visibility,
            },
            innerHTML: game.i18n.localize(this.text),
        });

        // Remove wrapping elements, such as from item descriptions
        if (element.childNodes.length === 1 && element.firstChild instanceof HTMLElement) {
            element.innerHTML = element.firstChild.innerHTML;
        }

        if (this.title) {
            const strong = createHTMLElement("strong", { innerHTML: game.i18n.localize(this.title) });
            element.prepend(strong, " ");
        }

        return element;
    }

    clone(): RollNotePF2e {
        return new RollNotePF2e({ ...this.toObject(), rule: this.rule });
    }

    toObject(): RollNoteSource {
        return {
            selector: this.selector,
            title: this.title,
            text: this.text,
            predicate: this.predicate.toObject(),
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

interface RollNoteParams extends RollNoteSource {
    rule?: RuleElement | null;
}

export { RollNotePF2e, type RollNoteSource };
