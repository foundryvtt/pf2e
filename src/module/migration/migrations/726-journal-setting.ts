import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove the journal theme setting, changing the default sheet according to the stored setting value */
export class Migration726JournalSetting extends MigrationBase {
    static override version = 0.726;

    override async migrate(): Promise<void> {
        // If the sheet is already configured, leave it as is
        const sheetClasses = game.settings.get("core", "sheetClasses");
        if (isObject<SheetConfig>(sheetClasses) && sheetClasses.JournalEntry?.base) {
            return;
        }

        // Get theme if its a registered setting. If it doesn't exist, keep the default (PF2E sheet)
        const theme = game.settings.storage.get("world").getItem("pf2e.journalEntryTheme");
        if (!theme) return;

        const base = theme === "pf2eTheme" ? "pf2e.JournalSheetStyledPF2e" : "pf2e.JournalSheetPF2e";
        DocumentSheetConfig.updateDefaultSheets({ JournalEntry: { base } });
    }
}

interface SheetConfig {
    JournalEntry?: { base?: string };
}
