import { BrowserTab } from "./tabs";

export interface PackInfo {
    load: boolean;
    name: string;
}
export type TabName = "action" | "bestiary" | "equipment" | "feat" | "hazard" | "spell" | "settings";
export type TabType = InstanceType<typeof BrowserTab[keyof typeof BrowserTab]>;
export type TabData<T> = Record<TabName, T | null>;

export type SortByOption = "name" | "level" | "price";
export type SortDirection = "asc" | "desc";
