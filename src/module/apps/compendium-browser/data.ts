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
    ancestry: browserTabs.Ancestries;
    background: browserTabs.Backgrounds;
    bestiary: browserTabs.Bestiary;
    campaignFeature: browserTabs.CampaignFeatures;
    class: browserTabs.Classes;
    deity: browserTabs.Deities;
    equipment: browserTabs.Equipment;
    feat: browserTabs.Feats;
    hazard: browserTabs.Hazards;
    heritage: browserTabs.Heritages;
    spell: browserTabs.Spells;
}

type TabName =
    | "action"
    | "ancestry"
    | "background"
    | "bestiary"
    | "campaignFeature"
    | "class"
    | "deity"
    | "equipment"
    | "feat"
    | "hazard"
    | "heritage"
    | "spell"
    | "character-building"
    | "settings";
type ContentTabName = Exclude<TabName, "settings" | "character-building">;
type BrowserTab = InstanceType<(typeof browserTabs)[keyof typeof browserTabs]>;
type TabData<T> = Record<TabName, T | null>;

type CommonSortByOption = "name" | "level";
type SortByOption = CommonSortByOption | "price";
type SortDirection = "asc" | "desc";

export type {
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
