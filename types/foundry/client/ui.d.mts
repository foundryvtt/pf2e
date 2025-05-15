/**
 * A collection of application instances
 * @module ui
 */

import * as applications from "./applications/_module.mjs";
import * as appv1 from "./appv1/_module.mjs";
import Macro from "./documents/macro.mjs";

/* eslint-disable prefer-const */
export let activeWindow: appv1.api.Application | applications.api.ApplicationV2 | null;

export const actors: applications.sidebar.tabs.ActorDirectory;

export const cards: applications.sidebar.tabs.CardsDirectory;

export const chat: applications.sidebar.tabs.ChatLog;

export const combat: applications.sidebar.tabs.CombatTracker;

export const compendium: applications.sidebar.tabs.CompendiumDirectory;

export const controls: applications.ui.SceneControls;

export const hotbar: applications.ui.Hotbar<Macro>;

export const items: applications.sidebar.tabs.ItemDirectory;

export const journal: applications.sidebar.tabs.JournalDirectory;

export const macros: applications.sidebar.tabs.MacroDirectory;

export const menu: applications.ui.MainMenu;

export const nav: applications.ui.SceneNavigation;

export const notifications: applications.ui.Notifications;

export const pause: applications.ui.GamePause;

export const players: applications.ui.Players;

export const playlists: applications.sidebar.tabs.PlaylistDirectory;

export const scenes: applications.sidebar.tabs.SceneDirectory;

export const settings: applications.sidebar.tabs.Settings;

export const sidebar: applications.sidebar.Sidebar;

export const tables: applications.sidebar.tabs.RollTableDirectory;

export const webrtc: applications.apps.av.CameraViews;

export const windows: Record<string, appv1.api.Application>;

export interface FoundryUI<
    TActorDirectory extends typeof actors,
    TItemDirectory extends typeof items,
    TChatLog extends typeof chat,
    TCompendiumDirectory extends typeof compendium,
    TCombatTracker extends typeof combat,
    THotbar extends typeof hotbar,
> {
    actors: TActorDirectory;
    cards: typeof cards;
    chat: TChatLog;
    combat: TCombatTracker;
    compendium: TCompendiumDirectory;
    controls: typeof controls;
    hotbar: THotbar;
    items: TItemDirectory;
    journal: typeof journal;
    macros: typeof macros;
    menu: typeof menu;
    nav: typeof nav;
    notifications: typeof notifications;
    pause: typeof pause;
    players: typeof players;
    playlists: typeof playlists;
    scenes: typeof scenes;
    settings: typeof settings;
    sidebar: typeof sidebar;
    tables: typeof tables;
    webrtc: typeof webrtc;
    windows: typeof windows;
}
