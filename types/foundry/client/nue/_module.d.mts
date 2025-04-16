/** @module nue */

import Tour from "./tour.mjs";
import * as tours from "./tours/_module.mjs";

export { default as NewUserExperienceManager } from "./nue-manager.mjs";
export { default as ToursCollection } from "./tours-collection.mjs";
export { Tour, tours };

/**
 * Register core Tours.
 */
export function registerTours(): Promise<void>;
