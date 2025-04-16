import appv1 = foundry.appv1;

class JournalSheetPF2e<TJournalEntry extends JournalEntry> extends appv1.sheets.JournalSheet<TJournalEntry> {
    /** Start pagination at 1 🤫 */
    override async getData(
        options?: Partial<appv1.api.DocumentSheetV1Options>,
    ): Promise<appv1.sheets.JournalSheetData<TJournalEntry>> {
        const sheetData = await super.getData(options);
        for (const entry of sheetData.toc) {
            entry.number += 1;
        }
        return sheetData;
    }
}

export { JournalSheetPF2e };
