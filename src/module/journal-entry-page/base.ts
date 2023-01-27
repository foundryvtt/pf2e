import { JournalEntryPageSourcePF2e, JournalEntryPageDataPF2e } from "./data";
import { JournalPageSheetPF2e } from "./sheet/base";

interface JournalEntryPageConstructionContextPF2e extends DocumentConstructionContext<JournalEntryPagePF2e> {
    pf2e?: {
        ready?: boolean;
    };
}

class JournalEntryPagePF2e extends JournalEntryPage {
    static get theme(): string | null {
        return null;
    }

    constructor(data: PreCreate<JournalEntryPageSourcePF2e>, context: JournalEntryPageConstructionContextPF2e = {}) {
        if (context.pf2e?.ready) {
            super(data, context);
        } else {
            context.pf2e = mergeObject(context.pf2e ?? {}, { ready: true });
            const JournalEntryPageConstructor = CONFIG.PF2E.JournalEntryPage.documentClasses[data.type];
            return JournalEntryPageConstructor
                ? new JournalEntryPageConstructor(data, context)
                : new JournalEntryPagePF2e(data, context);
        }
    }
}

interface JournalEntryPagePF2e {
    readonly data: JournalEntryPageDataPF2e;

    _sheet: JournalPageSheetPF2e<this> | null;

    get sheet(): JournalPageSheetPF2e<this>;
}

export { JournalEntryPagePF2e };
