import {
    CompendiumBrowserActionTab,
    CompendiumBrowserBestiaryTab,
    CompendiumBrowserEquipmentTab,
    CompendiumBrowserFeatTab,
    CompendiumBrowserHazardTab,
    CompendiumBrowserSpellTab,
} from "./tabs/index";

export interface PackInfo {
    load: boolean;
    name: string;
}
export type TabName = "action" | "bestiary" | "equipment" | "feat" | "hazard" | "spell" | "settings";
export type TabType =
    | CompendiumBrowserActionTab
    | CompendiumBrowserBestiaryTab
    | CompendiumBrowserEquipmentTab
    | CompendiumBrowserFeatTab
    | CompendiumBrowserHazardTab
    | CompendiumBrowserSpellTab;
export type TabData<T> = Record<TabName, T | null>;

export type SortByOption = "name" | "level" | "price";
export type SortDirection = "asc" | "desc";
