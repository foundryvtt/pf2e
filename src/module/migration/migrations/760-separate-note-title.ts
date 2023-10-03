import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Replace inline HTML in roll note text with separate title and visibility */
export class Migration760SeparateNoteTitle extends MigrationBase {
    static override version = 0.76;

    #cleanText(text: string): string {
        return (
            text
                .replace(/^@Localize\[(.+)\]$/, "$1")
                // Replace old critical specialization localization keys
                .replace(/^PF2E\.WeaponDescription([A-Z][a-z]+)$/, (substring, group) =>
                    typeof group === "string"
                        ? `PF2E.Item.Weapon.CriticalSpecialization.${group.toLowerCase()}`
                        : substring
                )
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const notes = source.system.rules.filter(
            (r: MaybeNoteSource): r is RollNoteSource =>
                r.key === "Note" && typeof r.text === "string" && !("title" in r)
        );

        for (const note of notes) {
            note.text = note.text.trim();
            // Isn't wrapped in HTML: skip
            if (!note.text.startsWith("<p")) continue;

            const pElement = ((): HTMLElement | null => {
                const text = note.text.includes("</p>") ? note.text : `${note.text}</p>`;
                try {
                    const fragment = document.createElement("template");
                    fragment.innerHTML = text;
                    const children = Array.from(fragment.content.childNodes);

                    if (children.length === 1 && children[0] instanceof HTMLElement) {
                        return children[0];
                    } else if (
                        children.length === 2 &&
                        children[0] instanceof HTMLParagraphElement &&
                        children[1] instanceof Text
                    ) {
                        const [first, second] = children;
                        first.append(second);
                        return first;
                    } else {
                        // Skip multiple HTML elements comprising a fragment
                        return null;
                    }
                } catch {
                    // Likely malformed HTML
                    return null;
                }
            })();
            if (pElement?.nodeName !== "P") continue;

            // Simplest case: just text wrapped in a P element
            const children = Array.from(pElement.childNodes);
            if (children.length === 1 && children[0] instanceof Text) {
                note.text = this.#cleanText(children[0].textContent ?? "");
                if (pElement.dataset.visibility && ["gm", "owner"].includes(pElement.dataset.visibility)) {
                    note.visibility = pElement.dataset.visibility;
                }
                continue;
            }

            // Only otherwise handle cases of a single strong element and single text node
            if (
                children.length !== 2 ||
                !(children[0] instanceof HTMLElement) ||
                children[0].nodeName !== "STRONG" ||
                !(children[1] instanceof Text)
            ) {
                continue;
            }

            const strongElement = children[0];
            strongElement.remove();
            const newText = pElement.innerHTML.trim();
            if (newText === "" || note.text.includes("<span")) {
                // Something weird with this one: next!
                continue;
            }

            const newTitle = strongElement.innerHTML.trim();
            // Catch some titles that should be localized
            if (newTitle === source.name) {
                note.title = "{item|name}";
            } else if (newTitle === "Critical Specialization") {
                note.title = "PF2E.Actor.Creature.CriticalSpecialization";
            } else if (newTitle === "Effect") {
                note.title = "TYPES.Item.effect";
            } else {
                note.title = newTitle;
            }
            // Catch some text with now-extraneous @Localize token
            note.text = this.#cleanText(newText);

            if (pElement.dataset.visibility) {
                note.visibility = pElement.dataset.visibility;
            }
        }
    }
}

interface MaybeNoteSource extends RuleElementSource {
    text?: unknown;
}

interface RollNoteSource extends RuleElementSource {
    title?: string;
    visibility?: string;
    text: string;
}
