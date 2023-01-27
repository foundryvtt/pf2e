import type { JournalEntryPagePF2e } from "../base";
import { DocumentSchemaRecord } from "@module/data";
import { JournalEntryPageType } from ".";

type BaseJournalEntryPageSourcePF2e<
    TType extends JournalEntryPageType = JournalEntryPageType,
    TSystemSource extends JournalEntryPageSystemSource = JournalEntryPageSystemSource
> = foundry.data.JournalEntryPageSource<TType, TSystemSource>;

interface BaseJournalEntryPageDataPF2e<
    TJournalEntryPage extends JournalEntryPagePF2e = JournalEntryPagePF2e,
    TType extends JournalEntryPageType = JournalEntryPageType,
    TSystemData extends JournalEntryPageSystemData = JournalEntryPageSystemData,
    TSource extends BaseJournalEntryPageSourcePF2e<TType> = BaseJournalEntryPageSourcePF2e<TType>
> extends Omit<BaseJournalEntryPageSourcePF2e<TType, JournalEntryPageSystemSource>, "system">,
        foundry.data.JournalEntryPageData<TJournalEntryPage> {
    readonly type: TType;
    readonly system: TSystemData;

    readonly _source: TSource;
}

interface JournalEntryPageSystemSource {
    schema: DocumentSchemaRecord;
}

type JournalEntryPageSystemData = JournalEntryPageSystemSource;

export {
    JournalEntryPageSystemData,
    JournalEntryPageSystemSource,
    BaseJournalEntryPageDataPF2e,
    BaseJournalEntryPageSourcePF2e,
};
