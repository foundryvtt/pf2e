import type { Document } from "../abstract/module.d.ts";
import type { BaseCards } from "./module.d.ts";

/**
 * The Document definition for a Card.
 * Defines the DataSchema and common behaviors for a Card which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Card
 * @param context Construction context options
 * @todo Fill in
 */
export default class BaseCard<TParent extends BaseCards | null> extends Document<TParent> {}
