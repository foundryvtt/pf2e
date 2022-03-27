import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { TextEditorPF2e } from "@system/text-editor";
import { ErrorPF2e } from "@util";
import type * as TinyMCE from "tinymce";
import "../../styles/tinymce.scss";

class JournalSheetPF2e<TJournalEntry extends JournalEntry = JournalEntry> extends JournalSheet<TJournalEntry> {
    override get template(): string {
        if (this._sheetMode === "image") return ImagePopout.defaultOptions.template;
        return "systems/pf2e/templates/journal/sheet.html";
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        InlineRollLinks.listen($html);
    }

    override activateEditor(name: string, options: Partial<TinyMCE.EditorSettings> = {}, initialContent = ""): void {
        const editor = this.editors[name];
        if (!editor) throw ErrorPF2e(`${name} is not a registered editor name!`);

        options = foundry.utils.mergeObject(editor.options, options);
        options.height = options.target?.offsetHeight;

        const defaults = (this.constructor as typeof JournalSheetPF2e).defaultOptions.classes;
        TextEditorPF2e.create(options, initialContent || editor.initial).then((mce) => {
            if (defaults.includes("pf2e")) {
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

class JournalSheetStyledPF2e extends JournalSheetPF2e {
    /** Use the system-themed styling only if the setting is enabled (on by default) */
    static override get defaultOptions(): DocumentSheetOptions {
        const options = super.defaultOptions;
        options.classes.push("pf2e");
        return options;
    }
}

export { JournalSheetPF2e, JournalSheetStyledPF2e };
