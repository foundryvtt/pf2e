import type { Document } from "../abstract/module.d.ts";

/**
 * The Document definition for a Setting.
 * Defines the DataSchema and common behaviors for a Setting which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Setting
 * @param context Construction context options
 */
export default class BaseSetting extends Document<null> {}
