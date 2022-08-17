import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
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
}

class JournalSheetStyledPF2e extends JournalSheetPF2e {
    static override get theme() {
        return "pf2e";
    }
}

class JournalTextPageSheetPF2e extends JournalTextPageSheet {
    override async activateEditor(
        name: string,
        options: Partial<TinyMCE.EditorOptions> = {},
        initialContent = ""
    ): Promise<TinyMCE.Editor> {
        const editor = await super.activateEditor(name, options, initialContent);
        console.log(options.target);

        const parentSheet = this.object.parent?.sheet.constructor as { theme?: string } | undefined;
        const theme = parentSheet?.theme;
        if (theme) {
            editor.contentDocument.documentElement.classList.add(theme, "journal-entry-page", "text");
            editor.contentDocument.body.classList.add("text-content");
        }

        return editor;
    }
}

export { JournalSheetPF2e, JournalSheetStyledPF2e, JournalTextPageSheetPF2e };
