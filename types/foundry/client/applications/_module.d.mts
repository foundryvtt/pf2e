import ApplicationV2 from "./api/application.mjs";

export * from "./_types.mjs";
export * as api from "./api/_module.mjs";
export * as apps from "./apps/_module.mjs";
export * as dice from "./dice/_module.mjs";
export * as elements from "./elements/_module.mjs";
export * as fields from "./forms/fields.mjs";
export * as handlebars from "./handlebars.mjs";
export * as hud from "./hud/_module.mjs";
export * as settings from "./settings/_module.mjs";
export * as sheets from "./sheets/_module.mjs";
export * as sidebar from "./sidebar/_module.mjs";
export * as ui from "./ui/_module.mjs";
export * as ux from "./ux/_module.mjs";

/**
 * A registry of currently rendered ApplicationV2 instances.
 */
export const instances: Map<string, ApplicationV2>;

/**
 * Parse an HTML string, returning a processed HTMLElement or HTMLCollection.
 * A single HTMLElement is returned if the provided string contains only a single top-level element.
 * An HTMLCollection is returned if the provided string contains multiple top-level elements.
 */
export function parseHTML(htmlString: string): HTMLCollection | HTMLElement;
