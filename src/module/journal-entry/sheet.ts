import { InlineRollListeners } from '@scripts/ui/inline-roll-listeners';

export class JournalSheetPF2e extends JournalSheet {
    /** Use the system-themed styling only if the setting is enabled (on by default) */
    static override get defaultOptions() {
        const options = super.defaultOptions;
        if (game.settings.get('pf2e', 'journalEntryTheme') === 'pf2eTheme') {
            options.classes.push('pf2e');
        }
        return options;
    }

    override activateListeners($html: JQuery) {
        super.activateListeners($html);
        InlineRollListeners.activate($html);
    }
}
