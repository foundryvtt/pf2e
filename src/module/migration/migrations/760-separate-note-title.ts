import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { parseHTML } from "@util";
import { MigrationBase } from "../base";

/** Replace inline HTML in roll note text with separate title and visibility */
export class Migration760SeparateNoteTitle extends MigrationBase {
    static override version = 0.76;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const notes = source.data.rules.filter(
            (r: MaybeNoteSource): r is RollNoteSource =>
                r.key === "Note" && typeof r.text === "string" && !("title" in r)
        );

        for (const note of notes) {
            note.text = note.text.trim();
            if (!note.text.startsWith("<p")) continue;

            const pElement = ((): HTMLElement | null => {
                const text = note.text.endsWith("</p>") ? note.text : `${note.text}</p>`;
                try {
                    return parseHTML(text);
                } catch {
                    // From reviewing examples in the system compendiums, these have malformed HTML
                    return null;
                }
            })();
            if (pElement?.nodeName !== "P") continue;

            const strongElement = pElement.firstChild;
            if (!(strongElement instanceof HTMLElement && strongElement.nodeName === "STRONG")) {
                continue;
            }
            strongElement.remove();
            const newText = pElement.innerHTML.trim();
            if (newText === "") {
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
                note.title = "ITEM.TypeEffect";
            } else {
                note.title = newTitle;
            }
            // Catch some text with now-extraneous @Localize token
            note.text = newText
                .replace(/^@Localize\[(.+)\]$/, "$1")
                // Replace old critical specialization localization keys
                .replace(/^PF2E\.WeaponDescription([A-Z][a-z]+)$/, (substring, group) =>
                    typeof group === "string"
                        ? `PF2E.Item.Weapon.CriticalSpecialization.${group.toLowerCase()}`
                        : substring
                );

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
