import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { TextEditorPF2e } from "@system/text-editor";
import { ErrorPF2e } from "@util";
import type * as TinyMCE from "tinymce";
import "../../styles/tinymce.scss";

class JournalSheetPF2e<TJournalEntry extends JournalEntry = JournalEntry> extends JournalSheet<TJournalEntry> {
    static get theme(): string | null {
        return null;
    }

    /** Use the system-themed styling only if the setting is enabled (on by default) */
    static override get defaultOptions(): DocumentSheetOptions {
        const options = super.defaultOptions;
        const { theme } = this;
        if (theme) {
            options.classes.push(theme);
        }
        return options;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        InlineRollLinks.listen($html);
    }

    override activateEditor(name: string, options: Partial<TinyMCE.EditorOptions> = {}, initialContent = ""): void {
        const editor = this.editors[name];
        if (!editor) throw ErrorPF2e(`${name} is not a registered editor name!`);

        options = foundry.utils.mergeObject(editor.options, options);
        options.height = options.target?.offsetHeight;
        TextEditorPF2e.create(options, initialContent || editor.initial).then((mce) => {
            const theme = (this.constructor as typeof JournalSheetPF2e).theme;
            if (theme) {
                mce.getBody().classList.add(theme);
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
    static override get theme() {
        return "pf2e";
    }
}

export { JournalSheetPF2e, JournalSheetStyledPF2e };
