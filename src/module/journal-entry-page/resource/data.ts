import { ResourcePagePF2e } from ".";
import {
    BaseJournalEntryPageDataPF2e,
    BaseJournalEntryPageSourcePF2e,
    JournalEntryPageSystemSource,
} from "../data/base";

type ResourcePageSource = BaseJournalEntryPageSourcePF2e<"resource", ResourcePageSystemSource>;

type ResourcePageData = Omit<ResourcePageSource, "system" | "flags"> &
    BaseJournalEntryPageDataPF2e<ResourcePagePF2e, "resource", ResourcePageSystemData, ResourcePageSource>;

export type ResourcePageSystemSource = JournalEntryPageSystemSource;

interface ResourcePageSystemData extends ResourcePageSystemSource {
    text: {
        content: string | null;
    };
    img: string;
    min: number;
    max: number;
    value: number;
    thresholds: ThresholdData[];
}

interface ThresholdData {
    value: number;
    label: string;
}

export { ResourcePageData, ResourcePageSource, ResourcePageSystemData, ThresholdData };
