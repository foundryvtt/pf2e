import type ApplicationV2 from "./api/application.d.ts";

export * as api from "./api/module.ts";
export * as elements from "./elements/module.ts";
export * as fields from "./forms/fields.ts";
export * as sheets from "./sheets/module.ts";

export const instances: Map<number, ApplicationV2>;

/**
 * Parse an HTML string, returning a processed HTMLElement or HTMLCollection.
 * A single HTMLElement is returned if the provided string contains only a single top-level element.
 * An HTMLCollection is returned if the provided string contains multiple top-level elements.
 */
export function parseHTML(htmlString: string): HTMLCollection | HTMLElement;
