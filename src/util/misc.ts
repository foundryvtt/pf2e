import type Localization from "@client/helpers/localization.d.mts";
import type { TranslationDictionaryValue } from "@client/helpers/localization.d.mts";
import type { ImageFilePath, VideoFilePath } from "@common/constants.d.mts";
import type { ActionCost } from "@item/base/data/system.ts";
import * as R from "remeda";
import type Sortable from "sortablejs";

/**
 * Given an array and a key function, create a map where the key is the value that
 * gets returned when each item is pushed into the function. Accumulate
 * items in an array that have the same key
 * @param array
 * @param criterion
 * @return
 */
function groupBy<T, R>(array: T[], criterion: (value: T) => R): Map<R, T[]> {
    const result = new Map<R, T[]>();
    for (const elem of array) {
        const key = criterion(elem);
        const group = result.get(key);
        if (group) {
            group.push(elem);
        } else {
            result.set(key, [elem]);
        }
    }
    return result;
}

/**
 * Continually apply a function on the result of itself until times is reached
 *
 * @param func
 * @param times
 * @param start start element, also result if times is 0
 */
function applyNTimes<T>(func: (val: T) => T, times: number, start: T): T {
    let result = start;
    for (let i = 0; i < times; i += 1) {
        result = func(result);
    }
    return result;
}

/**
 * Check if a key is present in a given object in a type safe way
 *
 * @param obj The object to check
 * @param key The key to check
 */
function objectHasKey<O extends object>(obj: O, key: unknown): key is keyof O {
    return (typeof key === "string" || typeof key === "number") && key in obj;
}

/** Check if a value is present in the provided array. Especially useful for checking against literal tuples */
function tupleHasValue<const A extends readonly unknown[]>(array: A, value: unknown): value is A[number] {
    return array.includes(value);
}

/** Check if an element is present in the provided set. Especially useful for checking against literal sets */
function setHasElement<T extends Set<unknown>>(set: T, value: unknown): value is SetElement<T> {
    return set.has(value);
}

let intlNumberFormat: Intl.NumberFormat;
/**
 * Return an integer string of a number, always with sign (+/-)
 * @param value The number to convert to a string
 * @param options.emptyStringZero If the value is zero, return an empty string
 * @param options.zeroIsNegative Treat zero as a negative value
 */
function signedInteger(value: number, { emptyStringZero = false, zeroIsNegative = false } = {}): string {
    if (value === 0 && emptyStringZero) return "";
    const nf = (intlNumberFormat ??= new Intl.NumberFormat(game.i18n.lang, {
        maximumFractionDigits: 0,
        signDisplay: "always",
    }));
    const maybeNegativeZero = zeroIsNegative && value === 0 ? -0 : value;

    return nf.format(maybeNegativeZero);
}

const wordCharacter = String.raw`[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
const nonWordCharacter = String.raw`[^\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
const nonWordBoundary = String.raw`(?=^|$|${wordCharacter})`;
const lowerCaseLetter = String.raw`\p{Lowercase_Letter}`;
const upperCaseLetter = String.raw`\p{Uppercase_Letter}`;

const nonWordCharacterRE = new RegExp(nonWordCharacter, "gu");
const lowerCaseThenUpperCaseRE = new RegExp(`(${lowerCaseLetter})(${upperCaseLetter}${nonWordBoundary})`, "gu");
const nonWordCharacterHyphenOrSpaceRE = /[^-\p{White_Space}\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/gu;
const upperOrWordBoundariedLowerRE = new RegExp(`${upperCaseLetter}|${nonWordCharacter}${lowerCaseLetter}`, "gu");

/**
 * The system's sluggification algorithm for labels and other terms.
 * @param text The text to sluggify
 * @param [options.camel=null] The sluggification style to use
 */
function sluggify(text: string, { camel = null }: { camel?: SlugCamel } = {}): string {
    // Sanity check
    if (typeof text !== "string") {
        console.warn("Non-string argument passed to `sluggify`");
        return "";
    }

    // A hyphen by its lonesome would be wiped: return it as-is
    if (text === "-") return text;

    switch (camel) {
        case null:
            return text
                .replace(lowerCaseThenUpperCaseRE, "$1-$2")
                .toLowerCase()
                .replace(/['’]/g, "")
                .replace(nonWordCharacterRE, " ")
                .trim()
                .replace(/[-\s]+/g, "-");
        case "bactrian": {
            const dromedary = sluggify(text, { camel: "dromedary" });
            return dromedary.charAt(0).toUpperCase() + dromedary.slice(1);
        }
        case "dromedary":
            return text
                .replace(nonWordCharacterHyphenOrSpaceRE, "")
                .replace(/[-_]+/g, " ")
                .replace(upperOrWordBoundariedLowerRE, (part, index) =>
                    index === 0 ? part.toLowerCase() : part.toUpperCase(),
                )
                .replace(/\s+/g, "");
        default:
            throw ErrorPF2e("I don't think that's a real camel.");
    }
}

type SlugCamel = "dromedary" | "bactrian" | null;

/** Parse a string containing html */
function parseHTML(unparsed: string): HTMLElement {
    const fragment = document.createElement("template");
    fragment.innerHTML = unparsed;
    const element = fragment.content.firstElementChild;
    if (!(element instanceof HTMLElement)) throw ErrorPF2e("Unexpected error parsing HTML");

    return element;
}

function getActionTypeLabel(
    type: Maybe<"action" | "free" | "reaction" | "passive">,
    cost: Maybe<number>,
): string | null {
    switch (type) {
        case "action":
            return cost === 1 ? "PF2E.Item.Ability.Type.Single" : "PF2E.Item.Ability.Type.Activity";
        case "free":
            return "PF2E.Item.Ability.Type.Free";
        case "reaction":
            return "PF2E.Item.Ability.Type.Reaction";
        default:
            return null;
    }
}

const actionGlyphMap: Record<string, string> = {
    0: "F",
    free: "F",
    1: "1",
    2: "2",
    3: "3",
    "1 or 2": "1/2",
    "1 to 3": "1 - 3",
    "2 or 3": "2/3",
    "2 rounds": "3,3",
    reaction: "R",
};

/**
 * Returns a character that can be used with the Pathfinder action font
 * to display an icon. If null it returns empty string.
 */
function getActionGlyph(action: string | number | null | ActionCost): string {
    if (!action && action !== 0) return "";

    const value = typeof action !== "object" ? action : action.type === "action" ? action.value : action.type;
    const sanitized = String(value ?? "")
        .toLowerCase()
        .trim();

    return actionGlyphMap[sanitized]?.replace("-", "–") ?? "";
}

function ErrorPF2e(message: string): Error {
    return Error(`PF2e System | ${message}`);
}

let pluralRules: Intl.PluralRules;

/** Returns the number in an ordinal format, like 1st, 2nd, 3rd, 4th, etc. */
function ordinalString(value: number): string {
    pluralRules ??= new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
    const suffix = game.i18n.localize(`PF2E.OrdinalSuffixes.${pluralRules.select(value)}`);
    return game.i18n.format("PF2E.OrdinalNumber", { value, suffix });
}

/** Localizes a list of strings into a (possibly comma-delimited) list for the current language */
function localizeList(items: string[], { conjunction = "or" }: { conjunction?: "and" | "or" } = {}): string {
    items = [...items].sort((a, b) => a.localeCompare(b, game.i18n.lang));
    const parts = conjunction === "or" ? "PF2E.ListPartsOr" : "PF2E.ListPartsAnd";

    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) {
        return game.i18n.format(`${parts}.two`, { first: items[0], second: items[1] });
    }

    let result = game.i18n.format(`${parts}.start`, { first: items[0], second: "{second}" });
    for (let i = 1; i <= items.length - 2; i++) {
        if (i === items.length - 2) {
            const end = game.i18n.format(`${parts}.end`, { first: items[i], second: items[items.length - 1] });
            result = result.replace("{second}", end);
        } else {
            const newSegment = game.i18n.format(`${parts}.middle`, { first: items[i], second: "{second}" });
            result = result.replace("{second}", newSegment);
        }
    }

    return result;
}

/**
 * Split and sanitize a list in string form. The empty string is always excluded from the resulting array.
 * @param [options.delimiter] The delimiter by which to split (default of ",")
 * @param [options.unique]    Whether to ensure the uniqueness of the resulting array's elements (default of true)
 */
function splitListString(str: string, { delimiter = ",", unique = true }: SplitListStringOptions = {}): string[] {
    const list = str
        .split(delimiter)
        .map((el) => el.trim())
        .filter((el) => el !== "");
    return unique ? R.unique(list) : list;
}

interface SplitListStringOptions {
    delimiter?: string | RegExp;
    unique?: boolean;
}

/** Generate and return an HTML element for a FontAwesome icon */
type FontAwesomeStyle = "solid" | "regular" | "duotone";

function fontAwesomeIcon(
    glyph: string,
    { style = "solid", fixedWidth = false }: { style?: FontAwesomeStyle; fixedWidth?: boolean } = {},
): HTMLElement {
    const styleClass = `fa-${style}`;
    const glyphClass = glyph.startsWith("fa-") ? glyph : `fa-${glyph}`;
    const icon = document.createElement("i");
    icon.classList.add(styleClass, glyphClass);
    icon.inert = true;
    if (fixedWidth) icon.classList.add("fa-fw");

    return icon;
}

/** Create a copy of a record with its insertion order sorted by label */
function sortLabeledRecord<T extends Record<string, { label: string }>>(record: T): T {
    return Object.entries(record)
        .sort((a, b) => a[1].label.localeCompare(b[1].label, game.i18n.lang))
        .reduce((copy, [key, value]) => fu.mergeObject(copy, { [key]: value }), {} as T);
}

/** Localize the values of a `Record<string, string>` and sort by those values */
function sortStringRecord<T extends Record<string, string>>(record: T): T;
function sortStringRecord(record: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(record)
            .map((entry) => {
                entry[1] = game.i18n.localize(entry[1]);
                return entry;
            })
            .sort((a, b) => a[1].localeCompare(b[1], game.i18n.lang)),
    );
}

/** JSON.stringify with recursive key sorting */
function sortObjByKey(value: unknown): unknown {
    return Array.isArray(value)
        ? value.map(sortObjByKey)
        : R.isPlainObject(value)
          ? Object.keys(value)
                .sort()
                .reduce((o: Record<string, unknown>, key) => {
                    const v = value[key];
                    o[key] = sortObjByKey(v);
                    return o;
                }, {})
          : value;
}

/** Walk an object tree and replace any string values found according to a provided function */
function recursiveReplaceString<T>(source: T, replace: (s: string) => string | number): T;
function recursiveReplaceString(source: unknown, replace: (s: string) => string | number): unknown {
    const clone = Array.isArray(source) || R.isPlainObject(source) ? fu.deepClone(source) : source;
    if (typeof clone === "string") {
        return replace(clone);
    } else if (Array.isArray(clone)) {
        return clone.map((e): unknown => recursiveReplaceString(e, replace));
    } else if (R.isPlainObject(clone)) {
        for (const [key, value] of Object.entries(clone)) {
            clone[key] = recursiveReplaceString(value, replace);
        }
    }

    return clone;
}

/** Create a localization function with a prefixed localization object path */
function localizer(prefix: string): (...args: Parameters<Localization["format"]>) => string {
    return (...[suffix, formatArgs]: Parameters<Localization["format"]>) =>
        formatArgs ? game.i18n.format(`${prefix}.${suffix}`, formatArgs) : game.i18n.localize(`${prefix}.${suffix}`);
}

/** Walk a localization object and recursively map the keys as localization strings starting with a given prefix */
function configFromLocalization<T extends Record<string, TranslationDictionaryValue>>(
    localization: T,
    prefix: string,
): T {
    return Object.entries(localization).reduce((result: Record<string, unknown>, [key, value]) => {
        result[key] =
            typeof value === "string" ? `${prefix}.${key}` : configFromLocalization(value, `${prefix}.${key}`);
        return result;
    }, {}) as T;
}

/** Does the parameter look like an image file path? */
function isImageFilePath(path: unknown): path is ImageFilePath {
    return typeof path === "string" && fh.media.ImageHelper.hasImageExtension(path);
}

/** Does the parameter look like a video file path? */
function isVideoFilePath(path: unknown): path is VideoFilePath {
    return typeof path === "string" && fh.media.VideoHelper.hasVideoExtension(path);
}

function isImageOrVideoPath(path: unknown): path is ImageFilePath | VideoFilePath {
    return (
        typeof path === "string" &&
        (fh.media.ImageHelper.hasImageExtension(path) || fh.media.VideoHelper.hasVideoExtension(path))
    );
}

const SORTABLE_BASE_OPTIONS: Sortable.Options = {
    animation: 200,
    direction: "vertical",
    dragClass: "drag-preview",
    dragoverBubble: true,
    easing: "cubic-bezier(1, 0, 0, 1)",
    fallbackOnBody: true,
    filter: "div.item-summary",
    ghostClass: "drag-gap",
    group: "inventory",
    preventOnFilter: false,
    swapThreshold: 0.25,

    // These options are from the Autoscroll plugin and serve as a fallback on mobile/safari/ie/edge
    // Other browsers use the native implementation
    scroll: true,
    scrollSensitivity: 30,
    scrollSpeed: 15,

    delay: 500,
    delayOnTouchOnly: true,
};

export {
    applyNTimes,
    configFromLocalization,
    ErrorPF2e,
    fontAwesomeIcon,
    getActionGlyph,
    getActionTypeLabel,
    groupBy,
    isImageFilePath,
    isImageOrVideoPath,
    isVideoFilePath,
    localizeList,
    localizer,
    objectHasKey,
    ordinalString,
    parseHTML,
    recursiveReplaceString,
    setHasElement,
    signedInteger,
    sluggify,
    SORTABLE_BASE_OPTIONS,
    sortLabeledRecord,
    sortObjByKey,
    sortStringRecord,
    splitListString,
    tupleHasValue,
    type SlugCamel,
};
