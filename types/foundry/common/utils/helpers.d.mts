import { ClientDocument, DocumentCollection } from "@client/documents/abstract/_module.mjs";
import Document from "@common/abstract/document.mjs";

/**
 * Recurse through an object, applying all special DataFieldOperator values.
 * ForcedDeletion values (or deprecated "-=" keys) are removed from the object
 * ForcedReplacement values (or deprecated "==" keys) are updated in the object
 */
export function applyDataOperators<T>(obj: T): T;

/**
 * Benchmark the performance of a function, calling it a requested number of iterations.
 * @param func The function to benchmark
 * @param iterations The number of iterations to test
 * @param args Additional arguments passed to the benchmarked function
 */
export function benchmark(func: (...args: any[]) => unknown | void, iterations: number, ...args: any[]): Promise<void>;

/**
 * A debugging function to test latency or timeouts by forcibly locking the thread for an amount of time.
 * @param ms A number of milliseconds to lock
 * @param debug Log debugging information?
 */
export function threadLock(ms: number, debug?: boolean): Promise<void>;

/**
 * Wrap a callback in a debounced timeout.
 * Delay execution of the callback function until the function has not been called for delay milliseconds
 * @param callback A function to execute once the debounced threshold has been passed
 * @param delay An amount of time in milliseconds to delay
 * @return A wrapped function which can be called to debounce execution
 */
export function debounce<T>(callback: (...args: T[]) => unknown, delay: number): (...args: T[]) => void;

/**
 * Wrap a callback in a throttled timeout.
 * Delay execution of the callback function when the last time the function was called was delay milliseconds ago
 * @param callback A function to execute once the throttled threshold has been passed
 * @param delay A maximum amount of time in milliseconds between to execution
 * @returns A wrapped function which can be called to throttle execution
 */
export function throttle(callback: (...args: any[]) => unknown | void, delay: number): void;

/**
 * A utility function to request a debounced page reload.
 */
export const debouncedReload: () => void;

/**
 * Recursively freezes (`Object.freeze`) the object (or value).
 * This method DOES NOT support cyclical data structures.
 * This method DOES NOT support advanced object types like Set, Map, or other specialized classes.
 * @param obj The object (or value)
 * @param options Options to configure the behaviour of deepFreeze
 * @param options.strict Throw an Error if deepFreeze is unable to seal something instead of
 *                                            returning the original
 * @returns The same object (or value) that was passed in
 */
export function deepFreeze<T extends object>(obj: T, options?: { strict?: boolean }): DeepReadonly<T>;

/**
 * Recursively seals (`Object.seal`) the object (or value).
 * This method DOES NOT support cyclical data structures.
 * This method DOES NOT support advanced object types like Set, Map, or other specialized classes.
 * @param obj The object (or value)
 * @param options Options to configure the behaviour of deepSeal
 * @param options.strict Throw an Error if deepSeal is unable to seal something
 * @returns The same object (or value) that was passed in
 */
export function deepSeal<T>(obj: T, options?: { strict?: boolean }): T;

/**
 * Quickly clone a simple piece of data, returning a copy which can be mutated safely.
 * This method DOES support recursive data structures containing inner objects or arrays.
 * This method DOES NOT support advanced object types like Set, Map, or other specialized classes.
 * @param original Some sort of data
 * @return The clone of that data
 */
export function deepClone<T>(original: T): T;

/**
 * Deeply difference an object against some other, returning the update keys and values.
 * @param original An object comparing data against which to compare
 * @param other An object containing potentially different data. Supports values that are DataFieldOperator instances.
 * @param options Additional options which configure the diff operation
 * @param options.inner Only recognize differences in other for keys which also exist in original
 * @param options.deletionKeys Apply special logic to deletion keys. They will only be kept if the original object has a
 *                             corresponding key that could be deleted.
 * @param options.bidirectional Create a bidirectional diff (or "patch" in Unix parlance), setting a forced-deletion
 *                              value where an entry is defined in the original object but not the other.
 * @param options._d An internal depth tracker
 * @returns An object of the data in other which differs from that in original
 */
export function diffObject<T extends object>(
    original: T,
    other: object,
    options?: { inner?: boolean; deletionKeys?: boolean; bidirectional?: boolean; _d?: number },
): DeepPartial<T>;

/**
 * Test if two values are equivalent.
 *
 * This helper supports equality testing for:
 * 1. Primitive data types (number, string, boolean, undefined)
 * 2. Simple objects (Object prototype, null)
 * 3. Complex objects which expose an `equals` method (Array, Set, Color, etc...)
 *
 * This method compares object `b` with object `a`, so in cases where an equality testing method is used it is called
 * as `a.equals(b).
 *
 * @param a  The first value
 * @param b  The second value
 */
export function equals(a: unknown, b: unknown): boolean;

/**
 * A cheap data duplication trick which is relatively robust.
 * For a subset of cases the deepClone function will offer better performance.
 * @param original Some sort of data
 */
export function duplicate<T>(original: T): T;

/**
 * Test whether some class is a subclass of a parent.
 * Returns true if the classes are identical.
 * @param cls The class to test
 * @param parent Some other class which may be a parent
 * @returns Is the class a subclass of the parent?
 */
export function isSubclass(cls: Function, parent: Function): boolean;

/**
 * Search up the prototype chain and return the class that defines the given property.
 * @param obj A class instance or class definition which contains a property.
 *            If a class instance is passed the property is treated as an instance attribute.
 *            If a class constructor is passed the property is treated as a static attribute.
 * @param property The property name
 * @returns The class that defines the property
 */
export function getDefiningClass(obj: object, property: string): Function;

/**
 * Encode a url-like string by replacing any characters which need encoding
 * @param path     A fully-qualified URL or url component (like a relative path)
 * @return         An encoded URL string
 */
export function encodeURL(path: string): string;

/**
 * Expand a flattened object to be a standard multi-dimensional nested Object by converting all dot-notation keys to
 * inner objects.
 *
 * @param obj  The object to expand
 * @param _d   Recursion depth, to prevent overflow
 * @return     An expanded object
 */
export function expandObject<T extends object = Record<string, unknown>>(obj: object, _d?: number): T;

/**
 * Expand dot-notation keys within a plain object, mutating it in place.
 * Use a lazy allocation strategy that only copies keys when some expansion is required.
 * Performs the dot-key check and expansion in a single forward pass.
 * Keys without dots are passed through via direct assignment.
 * Keys containing dots are expanded via setProperty.
 * @param data The object to expand in place.
 * @param options Options for how expansion occurs.
 * @param options.shallow Whether to only expand top-level keys.
 * @returns Whether any expansion was performed at any level.
 */
export function expandObjectInPlace(data: object, options?: { shallow?: boolean }): boolean;

/**
 * Filter the contents of some source object using the structure of a template object.
 * Only keys which exist in the template are preserved in the source object.
 *
 * @param source           An object which contains the data you wish to filter
 * @param template         An object which contains the structure you wish to preserve
 * @param keepSpecial      Whether to keep special tokens like deletion keys
 * @param templateValues   Instead of keeping values from the source, instead draw values from the template
 *
 * @example
 * const source = {foo: {number: 1, name: "Tim", topping: "olives"}, bar: "baz"};
 * const template = {foo: {number: 0, name: "Mit", style: "bold"}, other: 72};
 * filterObject(source, template); // {foo: {number: 1, name: "Tim"}};
 * filterObject(source, template, {templateValues: true}); // {foo: {number: 0, name: "Mit"}};
 */
export function filterObject(source: object, template: object, keepSpecial?: boolean, templateValues?: boolean): object;

/**
 * Flatten a possibly multi-dimensional object to a one-dimensional one by converting all nested keys to dot notation
 * @param obj The object to flatten
 * @param _d Recursion depth, to prevent overflow
 * @return A flattened object
 */
export function flattenObject(obj: object, _d?: number): Record<string, unknown>;

/**
 * Obtain references to the parent classes of a certain class.
 * @param cls An class definition
 * @returns An array of parent classes which the provided class extends
 */
export function getParentClasses(cls: Function): Function[];

/**
 * Get the URL route for a certain path which includes a path prefix, if one is set
 * @param path The Foundry URL path
 * @param prefix A path prefix to apply
 * @returns The absolute URL path
 */
export function getRoute(path: string, options?: { prefix?: string | null }): string;

/**
 * Test whether the given element is an instance of a given HTMLElement class in a cross-window way.
 * @param element The element to test.
 * @param tagOrClass The tag name or HTMLElement subclass to test.
 */
export function isElementInstanceOf(element: HTMLElement, tagOrClass: string | Function): boolean;

/**
 * Determine whether a value is a plain object; that is, one with a constructor of Object of null.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown>;

/**
 * Learn the named type of a token - extending the functionality of typeof to recognize some core Object types
 * @param token Some passed token
 * @return      The named type of the token
 */
export function getType(token: unknown): string;

/**
 * A helper function which tests whether an object has a property or nested property given a string key.
 * The string key supports the notation a.b.c which would return true if object[a][b][c] exists
 * @param object The object to traverse
 * @param key An object property with notation a.b.c
 *
 * @return An indicator for whether the property exists
 */
export function hasProperty(object: object, key: string): boolean;

/**
 * A helper function which searches through an object to retrieve a value by a string key.
 * The string key supports the notation a.b.c which would return object[a][b][c]
 * @param object The object to traverse
 * @param key An object property with notation a.b.c
 *
 * @returns The value of the found property
 */
export function getProperty(object: object, key: string): unknown;

/**
 * A helper function which searches through an object to assign a value using a string key
 * This string key supports the notation a.b.c which would target object[a][b][c]
 *
 * @param object   The object to update
 * @param key      The string key
 * @param value The value to be assigned
 * @returns A flag for whether or not the object was updated
 */
export function setProperty(object: object, key: string, value: unknown): boolean;

/**
 * A helper function which searches through an object to delete a value by a string key.
 * The string key supports the notation a.b.c which would delete object[a][b][c]
 * @param object The object to traverse
 * @param key An object property with notation a.b.c
 * @returns Was the property deleted?
 */
export function deleteProperty(object: object, key: string): boolean;

/**
 * A temporary shim to invert an object, flipping keys and values
 * @param obj    Some object where the values are unique
 * @return       An inverted object where the values of the original object are the keys of the new object
 */
export function invertObject(obj: object): object;

/**
 * Return whether or not a version (v1) is more advanced than some other version (v0)
 * Supports numeric or string version numbers
 * @param v0
 * @param v1
 * @return
 */
export function isNewerVersion(v1: number | string | null, v0: number | string): boolean;

/**
 * Test whether a value is empty-like; either undefined or a content-less object.
 * @param value The value to test
 * @returns Is the value empty-like?
 */
export function isEmpty(value: unknown): boolean;

/**
 * Object entries generator.
 */
export function objectEntries<K extends string, V>(obj: Record<K, V>): Generator<[K, V], void, unknown>;

/**
 * Stream object entries.
 */
export function iterateEntries<T extends object>(obj: T): IteratorObject<[keyof T, T[keyof T]], void, unknown>;

/**
 * Object keys generator.
 */
export function objectKeys<K extends string>(obj: Record<K, unknown>): Generator<K, void, unknown>;

/**
 * Stream object keys.
 */
export function iterateKeys<K extends string>(obj: Record<K, unknown>): IteratorObject<K, void, unknown>;

/**
 * Object values generator.
 */
export function objectValues<V>(obj: Record<string, V>): Generator<V, void, unknown>;

/**
 * Stream object values.
 */
export function iterateValues<V>(obj: Record<string, V>): IteratorObject<V, void, unknown>;

/**
 * Update a source object by replacing its keys and values with those from a target object.
 *
 * @param original The initial object which should be updated with values from the target
 * @param other A new object whose values should replace those in the source
 * @param options Additional options which configure the merge
 * @returns The original source object including updated, inserted, or overwritten records.
 *
 * @example Control how new keys and values are added
 * ```js
 * mergeObject({k1: "v1"}, {k2: "v2"}, {insertKeys: false}); // {k1: "v1"}
 * mergeObject({k1: "v1"}, {k2: "v2"}, {insertKeys: true});  // {k1: "v1", k2: "v2"}
 * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {insertValues: false}); // {k1: {i1: "v1"}}
 * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {insertValues: true}); // {k1: {i1: "v1", i2: "v2"}}
 * ```
 *
 * @example Control how existing data is overwritten
 * ```js
 * mergeObject({k1: "v1"}, {k1: "v2"}, {overwrite: true}); // {k1: "v2"}
 * mergeObject({k1: "v1"}, {k1: "v2"}, {overwrite: false}); // {k1: "v1"}
 * ```
 *
 * @example Control whether merges are performed recursively
 * ```js
 * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {recursive: false}); // {k1: {i2: "v2"}}
 * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {recursive: true}); // {k1: {i1: "v1", i2: "v2"}}
 * ```
 *
 * @example Deleting an existing object key
 * ```js
 * mergeObject({k1: "v1", k2: "v2"}, {"k1": new ForcedDeletion()}, {applyOperators: true});   // {k2: "v2"}
 * ```
 *
 * @example Explicitly replacing an inner object key
 * ```js
 * mergeObject({k1: {i1: "v1"}}, {"k1": ForcedReplacement.create({i2: "v2"})}, {applyOperators: true}); // {k1: {i2: "v2"}}
 * ```
 */
export function mergeObject<T extends object, U extends object = T>(
    original: T,
    other?: U | undefined,
    options?: MergeObjectOptions,
    _d?: number,
): T & U;

export interface MergeObjectOptions {
    /**
     * Control whether to insert new top-level objects into the resulting structure which do not previously exist in the
     * original object.
     */
    insertKeys?: boolean;

    /**
     * Control whether to insert new nested values into child objects in the resulting structure which did not
     * previously exist in the original object.
     */
    insertValues?: boolean;

    /**
     * Control whether to replace existing values in the source, or only merge values which do not already exist in the
     * original object.
     */
    overwrite?: boolean;

    /**
     * Control whether to merge inner-objects recursively (if true), or whether to simply replace inner objects with a
     * provided new value.
     */
    recursive?: boolean;

    /**
     * Control whether to apply updates to the original object in-place (if true), otherwise the original object is
     * duplicated and the copy is merged.
     */
    inplace?: boolean;

    /**
     * Control whether strict type checking requires that the value of a key in the other object must match the data
     * type in the original data to be merged.
     */
    enforceTypes?: boolean;

    /**
     * Control whether to apply the effects of DataFieldOperator values
     * (if true) or retain those operators (if false) in the resulting
     * merged object.
     */
    applyOperators?: boolean;

    /**
     * A privately used parameter to track recursion depth.
     */
    _d?: number;
}

/**
 * Parse an S3 key to learn the bucket and the key prefix used for the request.
 * @param key A fully qualified key name or prefix path.
 */
export function parseS3URL(key: string): { bucket: string | null; keyPrefix: string };

/**
 * Generate a random ID
 * Generate random number and convert it to base 36 and remove the '0.' at the beginning
 * As long as the string is not long enough, generate more random data into it
 * Use substring in case we generated a string with a length higher than the requested length
 *
 * @param length    The length of the random ID to generate
 * @return          Return a string containing random letters and numbers
 */
export function randomID(length?: number): string;

/**
 * Format a file size to an appropriate order of magnitude.
 * @param size The size in bytes.
 * @param options.decimalPlaces The number of decimal places to round to.
 * @param options.base The base to use. In base 10 a kilobyte is 1000 bytes. In base 2 it is 1024 bytes.
 */
export function formatFileSize(size: number, options?: { decimalPlaces?: number; base?: 2 | 10 }): string;

/**
 * Parse a UUID into its constituent parts.
 * @param uuid               The UUID to parse.
 * @param [options]          Options to configure parsing behavior.
 * @param [options.relative] A document to resolve relative UUIDs against.
 * @returns Returns the Collection, Document Type, and Document ID to resolve the parent
 *          document, as well as the remaining Embedded Document parts, if any.
 */
export function parseUuid(uuid: Maybe<string>, options?: { relative?: Maybe<Document> }): ResolvedUUID | null;

export interface ResolvedUUID {
    /** The original UUID. */
    uuid?: string;
    /**
     * The type of Document referenced. Legacy compendium UUIDs will not populate this field if the compendium is
     * not active in the World.
     */
    type: string | undefined;
    /** The ID of the Document referenced. */
    id: string;
    /** The primary Document type of this UUID. Only present if the Document is embedded. */
    primaryType: string | undefined;
    /** The primary Document ID of this UUID. Only present if the Document is embedded. */
    primaryId: string | undefined;
    /**
     * The Collection containing the referenced Document unless that Documentis embedded, in which case the Collection
     * of the primary Document.
     */
    collection?: DocumentCollection<ClientDocument> | undefined;
    /** Additional Embedded Document parts. */
    embedded: string[];
}

/**
 * Build the relative UUID of the target relative to the origin if possible.
 * @param target The target UUID or Document
 * @param origin The origin UUID or Document
 * @returns The relative UUID of the target relative to the origin if possible, otherwise the absolute UUID of the
 *          target
 */
export function buildRelativeUuid(target: string | Document, origin: string | Document): string;

/**
 * Build a Universally Unique Identifier (uuid) from possibly limited data. An attempt will be made to resolve omitted
 * components, but an identifier and at least one of documentName, parent, and pack are required.
 * @param context Data for building the uuid
 * @param context.id The identifier of the document
 * @param context.documentName The document name (or type)
 * @param context.parent The document's parent, if any
 * @param context.pack The document's compendium pack, if applicable
 * @returns A well-formed Document uuid unless one is unable to be created
 */
export function buildUuid(context: {
    id: string;
    documentName?: string;
    parent?: Document | null;
    pack?: string | null;
}): string | null;

/**
 * Escape the given unescaped string.
 *
 * Escaped strings are safe to use inside inner HTML of most tags and in most quoted HTML attributes.
 * They are not NOT safe to use in `<script>` tags, unquoted attributes, `href`, `onmouseover`, and similar.
 * They must be unescaped first if they are used inside a context that would escape them.
 *
 * Handles only `&`, `<`, `>`, `"`, and `'`.
 * @see {@link unescapeHTML}
 * @param value An unescaped string
 * @returns The escaped string
 */
export function escapeHTML(value: unknown): string;

/**
 * Unescape the given escaped string.
 *
 * Handles only `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#x27;`.
 * @see {@link escapeHTML}
 * @param value An escaped string
 * @returns The escaped string
 */
export function unescapeHTML(value: string): string;

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 1].
 *
 * @param  h       The hue
 * @param  s       The saturation
 * @param  v       The value
 * @return         The RGB representation
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number];

/**
 * Converts a color as an [R, G, B] array of normalized floats to a hexadecimal number.
 * @param rgb - Array of numbers where all values are normalized floats from 0.0 to 1.0.
 * @return      Number in hexadecimal.
 */
export function rgbToHex(rgb: [number, number, number]): number;

/**
 * Convert a hex color code to an RGB array
 * @param hex    A hex color number
 * @return       An array of [r,g,b] colors normalized on the range of [0,1]
 */
export function hexToRGB(hex: number): [number, number, number];

/**
 * Convert a hex color code to an RGBA color string which can be used for CSS styling
 * @param hex    A hex color number
 * @param alpha  A level of transparency
 * @return       An rgba style string
 */
export function hexToRGBAString(hex: number, alpha?: number): string;

/**
 * Convert a string color to a hex integer
 * @param color    The string color
 * @return         The hexidecimal color code
 */
export function colorStringToHex(color: string): number;
