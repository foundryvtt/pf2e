import * as browserTabs from "./tabs/index.ts";

interface PackInfo {
    load: boolean;
    name: string;
    package: string;
}

interface SourceInfo {
    load: boolean;
    name: string;
}

interface BrowserTabs {
    action: browserTabs.Actions;
    bestiary: browserTabs.Bestiary;
    equipment: browserTabs.Equipment;
    feat: browserTabs.Feats;
    hazard: browserTabs.Hazards;
    spell: browserTabs.Spells;
}

type TabName = "action" | "bestiary" | "equipment" | "feat" | "hazard" | "spell" | "settings";
type ContentTabName = Exclude<TabName, "settings">;
type BrowserTab = InstanceType<(typeof browserTabs)[keyof typeof browserTabs]>;
type TabData<T> = Record<TabName, T | null>;

type CommonSortByOption = "name" | "level";
type SortByOption = CommonSortByOption | "price";
type SortDirection = "asc" | "desc";

export {
    BrowserTab,
    BrowserTabs,
    CommonSortByOption,
    ContentTabName,
    PackInfo,
    SortByOption,
    SortDirection,
    SourceInfo,
    TabData,
    TabName,
};
