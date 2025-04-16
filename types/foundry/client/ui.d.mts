/**
 * A collection of application instances
 * @module ui
 */

import * as applications from "./applications/_module.mjs";
import * as appv1 from "./appv1/_module.mjs";
import Macro from "./documents/macro.mjs";

/* eslint-disable prefer-const */
export let activeWindow: appv1.api.Application | applications.api.ApplicationV2 | null;

export const windows: Record<string, appv1.api.Application>;

export const controls: applications.ui.SceneControls;

export const hotbar: applications.ui.Hotbar<Macro>;

export const menu: applications.ui.MainMenu;

export const nav: applications.ui.SceneNavigation;

export const notifications: applications.ui.Notifications;

export const pause: applications.ui.GamePause;

export const players: applications.ui.Players;

export const sidebar: applications.sidebar.Sidebar;
