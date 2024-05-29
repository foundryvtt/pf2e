import { ProseMirrorMenuPF2e } from "@system/prosemirror-menu.ts";

class JournalSheetPF2e<TJournalEntry extends JournalEntry> extends JournalSheet<TJournalEntry> {
    /** Start pagination at 1 🤫 */
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<JournalSheetData<TJournalEntry>> {
        const sheetData = await super.getData(options);
        for (const entry of sheetData.toc) {
            entry.number += 1;
        }
        return sheetData;
    }

    protected override _configureProseMirrorPlugins(
        name: string,
        options: { remove?: boolean },
    ): Record<string, ProseMirror.Plugin> {
        const plugins = super._configureProseMirrorPlugins(name, options);
        plugins.menu = ProseMirrorMenuPF2e.build(foundry.prosemirror.defaultSchema, {
            destroyOnSave: options.remove,
            onSave: () => this.saveEditor(name, options),
        });
        return plugins;
    }
}

export { JournalSheetPF2e };
