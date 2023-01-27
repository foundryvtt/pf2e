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
}

export { JournalSheetPF2e };
