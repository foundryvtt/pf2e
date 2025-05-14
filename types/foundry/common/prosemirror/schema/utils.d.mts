/**
 * Determine if an HTML element contains purely inline content, i.e. only text nodes and 'mark' elements.
 * @param element The element.
 */
export function onlyInlineContent(element: HTMLElement): boolean;

/**
 * Determine if an HTML element is empty.
 * @param element The element.
 */
export function isElementEmpty(element: HTMLElement): boolean;

/**
 * Convert an element's style attribute string into an object.
 * @param str The style string.
 */
export function stylesFromString(str: string): Record<string, string>;

/**
 * Merge two style attribute strings.
 * @param a The first style string.
 * @param b The second style string.
 */
export function mergeStyle(a: string, b: string): string;

/**
 * Convert an element's class attribute string into an array of class names.
 * @param str The class string.
 */
export function classesFromString(str: string): string[];

/**
 * Merge two class attribute strings.
 * @param a The first class string.
 * @param b The second class string.
 */
export function mergeClass(a: string, b: string): string;
