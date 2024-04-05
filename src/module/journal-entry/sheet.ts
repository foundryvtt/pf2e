import type * as TinyMCE from "tinymce";

class JournalSheetPF2e<TJournalEntry extends JournalEntry> extends JournalSheet<TJournalEntry> {
    static get theme(): string | null {
        return null;
    }

    /** Use the system-themed styling only if the setting is enabled (on by default) */
    static override get defaultOptions(): DocumentSheetOptions {
        const options = super.defaultOptions;
        options.sheetConfig &&=
            Object.values(CONFIG.JournalEntry.sheetClasses).filter((c) => c.canConfigure).length > 1;

        const { theme } = this;
        if (theme) {
            options.classes.push(theme);
        }
        return options;
    }

    /** Start pagination at 1 🤫 */
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<JournalSheetData<TJournalEntry>> {
        const sheetData = await super.getData(options);
        for (const entry of sheetData.toc) {
            entry.number += 1;
        }
        return sheetData;
    }
}

class JournalTextTinyMCESheetPF2e<
    TDocument extends JournalEntryPage<JournalEntry | null>,
> extends JournalTextTinyMCESheet<TDocument> {
    override async activateEditor(
        name: string,
        options: Partial<TinyMCE.EditorOptions> = {},
        initialContent = "",
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

export { JournalSheetPF2e, JournalTextTinyMCESheetPF2e };
