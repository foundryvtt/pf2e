/* -------------------------------------------- */
/*  Commons                                     */
/* -------------------------------------------- */

export * as CONST from "@common/constants.mjs";

/**
 * Document definitions used throughout the Foundry Virtual Tabletop framework.
 */
export * as documents from "./documents/_module.mjs";

/**
 * A module which defines data architecture components.
 */
export * as data from "./data/_module.mjs";

/**
 * Package data definitions, validations, and schema.
 */
export * as packages from "./packages/_module.mjs";

/**
 * Abstract class definitions for fundamental concepts used throughout the Foundry Virtual Tabletop framework.
 */
export * as abstract from "@common/abstract/_module.mjs";

/**
 * Utility functions providing helpful functionality.
 */
export * as utils from "./utils/_module.mjs";

/**
 * Application configuration options
 */
export * as config from "@common/config.mjs";

/**
 * A library for providing rich text editing using ProseMirror within the Foundry Virtual Tabletop game client.
 */
export * as prosemirror from "@common/prosemirror/_module.mjs";

/**
 * Grid classes.
 */
export * as grid from "@common/grid/_module.mjs";

/* -------------------------------------------- */
/*  Client                                      */
/* -------------------------------------------- */

/**
 * A library for rendering and managing HTML user interface elements within the Foundry Virtual Tabletop game client.
 */
export * as applications from "./applications/_module.mjs";

/**
 * A library for legacy ApplicationV1 classes and helpers.
 */
export * as appv1 from "./appv1/_module.mjs";

/**
 * Audio/video over WebRTC.
 */
export * as av from "./av/_module.mjs";

/**
 * A library for controlling audio playback within the Foundry Virtual Tabletop game client.
 */
export * as audio from "./audio/_module.mjs";

/**
 * A submodule defining concepts related to canvas rendering.
 */
export * as canvas from "./canvas/_module.mjs";

/**
 * A module for parsing and executing dice roll syntax.
 */
export * as dice from "./dice/_module.mjs";

/**
 * A submodule containing core helper classes.
 */
export * as helpers from "./helpers/_module.mjs";

/**
 * A module containing utilities and tools for improving new user experience.
 */
export * as nue from "./nue/_module.mjs";

export { default as Game } from "./game.mjs";

import * as globalUI from "./ui.mjs";

/**
 * A collection of application instances
 */
export const ui: typeof globalUI;

/**
 * Client/shared importable types.
 */
export * from "./_types.mjs";
