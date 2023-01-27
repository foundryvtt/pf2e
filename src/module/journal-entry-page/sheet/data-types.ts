import { ResourcePagePF2e, JournalEntryPagePF2e } from "..";
import { ThresholdData } from "../resource/data";

export interface JournalPageSheetDataPF2e<TJournalEntryPage extends JournalEntryPagePF2e>
    extends JournalPageSheetData<TJournalEntryPage> {
    journalEntryPage: TJournalEntryPage["data"];
    data: TJournalEntryPage["data"]["system"];
    enrichedContent: Record<string, string>;
}

export interface ResourcePageSheetData extends JournalPageSheetDataPF2e<ResourcePagePF2e> {
    editor: {
        engine: string;
        collaborate: boolean;
        content: string;
    };
    text: {
        content: string | null;
    };
    progressPercent: number;
    sortedThresholds: ThresholdData[];
    currentThreshold: string;
}
