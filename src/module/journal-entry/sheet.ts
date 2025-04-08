class JournalSheetPF2e<TJournalEntry extends JournalEntry> extends JournalSheet<TJournalEntry> {
    /** Start pagination at 1 🤫 */
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<JournalSheetData<TJournalEntry>> {
        const sheetData = await super.getData(options);

        let adjustment = 1;
        for (const entry of sheetData.toc) {
            const pageDocument = this.document.pages.get(entry._id);
            let needsAdjustment = true;
            if (pageDocument) {
                const numbering = pageDocument.adjustTOCNumbering?.(entry.number);
                if (numbering) {
                    entry.number = numbering.number;
                    adjustment += numbering.adjustment ?? 0;
                    needsAdjustment = false;
                }
            }
            if (needsAdjustment) entry.number += adjustment;
        }

        return sheetData;
    }
}

export { JournalSheetPF2e };
