import { JournalSheetPF2e } from "./base";

export class JournalSheetStyledPF2e extends JournalSheetPF2e {
    /** Use the system-themed styling only if the setting is enabled (on by default) */
    static override get defaultOptions(): DocumentSheetOptions {
        const options = super.defaultOptions;
        options.classes.push("pf2e");
        return options;
    }
}
