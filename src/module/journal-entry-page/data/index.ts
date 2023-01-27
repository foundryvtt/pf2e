import { ResourcePageData, ResourcePageSource } from "../resource";

export type JournalEntryPageDataPF2e = ResourcePageData;

export type JournalEntryPageType = "resource";

export type JournalEntryPageSourcePF2e = JournalEntryPageDataPF2e["_source"];
export type { ResourcePageData };

export { ResourcePageSource };
