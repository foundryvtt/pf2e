import * as browserTabs from "./tabs";

export interface PackInfo {
    load: boolean;
    name: string;
}
export type TabName = "action" | "bestiary" | "equipment" | "feat" | "hazard" | "spell" | "settings";
export type BrowserTab = InstanceType<typeof browserTabs[keyof typeof browserTabs]>;
export type TabData<T> = Record<TabName, T | null>;

export type CommonSortByOption = "name" | "level";

export type SortByOption = CommonSortByOption | "price";
export type SortDirection = "asc" | "desc";
