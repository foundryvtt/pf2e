import { JournalEntryPagePF2e } from "..";
import type * as TinyMCE from "tinymce";

class JournalTextTinyMCESheetPF2e extends JournalTextTinyMCESheet {
    override async activateEditor(
        name: string,
        options: Partial<TinyMCE.EditorOptions> = {},
        initialContent = ""
    ): Promise<TinyMCE.Editor> {
        const editor = await super.activateEditor(name, options, initialContent);

        const parentSheet = this.object.parent?.sheet.constructor as { theme?: string } | undefined;
        const theme = parentSheet?.theme;
        editor.contentDocument.documentElement.classList.add("journal-entry-page", "text");
        editor.contentDocument.body.classList.add("journal-page-content");
        if (theme) {
            editor.contentDocument.documentElement.classList.add(theme);
        }

        return editor;
    }
}

export class JournalPageSheetPF2e<
    TJournalEntryPage extends JournalEntryPagePF2e
> extends JournalPageSheet<TJournalEntryPage> {}
export { JournalTextTinyMCESheetPF2e };
