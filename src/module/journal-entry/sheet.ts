import { InlineRollsLinks } from "@scripts/ui/inline-roll-links";
import "../../styles/tinymce.scss";
import type * as TinyMCE from "tinymce";

export class JournalSheetPF2e<TJournalEntry extends JournalEntry = JournalEntry> extends JournalSheet<TJournalEntry> {
    static get theme(): "pf2eTheme" | "foundry" {
        return game.settings.get("pf2e", "journalEntryTheme");
    }

    /** Use the system-themed styling only if the setting is enabled (on by default) */
    static override get defaultOptions() {
        const options = super.defaultOptions;
        if (this.theme === "pf2eTheme") {
            options.classes.push("pf2e");
        }
        return options;
    }

    override get template() {
        if (this._sheetMode === "image") return ImagePopout.defaultOptions.template!;
        return "systems/pf2e/templates/journal/sheet.html";
    }

    override activateListeners($html: JQuery) {
        super.activateListeners($html);
        InlineRollsLinks.listen($html);
    }

    override activateEditor(name: string, options: Partial<TinyMCE.EditorSettings> = {}, initialContent = ""): void {
        const editor = this.editors[name];
        if (!editor) throw new Error(`${name} is not a registered editor name!`);
        options = foundry.utils.mergeObject(editor.options, options);
        options.height = options.target?.offsetHeight;
        TextEditor.create(options, initialContent || editor.initial).then((mce) => {
            if (JournalSheetPF2e.theme === "pf2eTheme") {
                mce.getBody().classList.add("pf2e");
            }

            editor.mce = mce;
            editor.changed = false;
            editor.active = true;
            mce.focus();
            mce.on("change", () => (editor.changed = true));
        });
    }
}
