import { ActionCost } from "@item/data/base";
import { LocalizePF2e } from "@system/localize";

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
 * Given an array, adds a certain amount of elements to it
 * until the desired length is being reached
 */
function padArray<T>(array: T[], requiredLength: number, padWith: T): T[] {
    const result = [...array];
    for (let i = array.length; i < requiredLength; i += 1) {
        result.push(padWith);
    }
    return result;
}

type Optional<T> = T | null | undefined;

/**
 * Returns true if the string is null, undefined or only consists of 1..n spaces
 */
function isBlank(text: Optional<string>): text is null | undefined | "" {
    return text === null || text === undefined || text.trim() === "";
}

/**
 * Adds a + if positive, nothing if 0 or - if negative
 */
function addSign(number: number): string {
    if (number < 0) {
        return `${number}`;
    }
    if (number > 0) {
        return `+${number}`;
    }
    return "0";
}

/**
 * No idea why this isn't built in
 */
function sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0);
}

/**
 * Zip to arrays together based on a given zip function
 * @param a
 * @param b
 * @param zipFunction
 */
function zip<A, B, R>(a: A[], b: B[], zipFunction: (a: A, b: B) => R): R[] {
    if (a.length > b.length) {
        return b.map((elem, index) => zipFunction(a[index], elem));
    } else {
        return a.map((elem, index) => zipFunction(elem, b[index]));
    }
}

interface Fraction {
    numerator: number;
    denominator: number;
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
function tupleHasValue<A extends readonly unknown[]>(array: A, value: unknown): value is A[number] {
    return array.includes(value);
}

/** Check if an element is present in the provided set. Especially useful for checking against literal sets */
function setHasElement<T extends Set<unknown>>(set: T, value: unknown): value is SetElement<T> {
    return set.has(value);
}

const wordCharacter = String.raw`[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
const nonWordCharacter = String.raw`[^\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
const nonWordCharacterRE = new RegExp(nonWordCharacter, "gu");

const wordBoundary = String.raw`(?<=${wordCharacter})(?=${nonWordCharacter})|(?<=${nonWordCharacter})(?=${wordCharacter})`;
const nonWordBoundary = String.raw`(?<=${wordCharacter})(?=${wordCharacter})`;
const lowerCaseLetter = String.raw`\p{Lowercase_Letter}`;
const upperCaseLetter = String.raw`\p{Uppercase_Letter}`;
const lowerCaseThenUpperCaseRE = new RegExp(`(${lowerCaseLetter})(${upperCaseLetter}${nonWordBoundary})`, "gu");

const nonWordCharacterHyphenOrSpaceRE = /[^-\p{White_Space}\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/gu;
const upperOrWordBoundariedLowerRE = new RegExp(`${upperCaseLetter}|(?:${wordBoundary})${lowerCaseLetter}`, "gu");

/**
 * The system's sluggification algorithm for labels and other terms.
 * @param [camel=null] The sluggification style to use: null is default, and there are otherwise two camel options.
 */
function sluggify(str: string, { camel = null }: { camel?: "dromedary" | "bactrian" | null } = {}): string {
    switch (camel) {
        case null:
            return str
                .replace(lowerCaseThenUpperCaseRE, "$1-$2")
                .toLowerCase()
                .replace(/['’]/g, "")
                .replace(nonWordCharacterRE, " ")
                .trim()
                .replace(/[-\s]+/g, "-");
        case "bactrian": {
            const dromedary = sluggify(str, { camel: "dromedary" });
            return dromedary.charAt(0).toUpperCase() + dromedary.slice(1);
        }
        case "dromedary":
            return str
                .replace(nonWordCharacterHyphenOrSpaceRE, "")
                .replace(/[-_]+/g, " ")
                .replace(upperOrWordBoundariedLowerRE, (part, index) =>
                    index === 0 ? part.toLowerCase() : part.toUpperCase()
                )
                .replace(/\s+/g, "");
        default:
            throw ErrorPF2e("I don't think that's a real camel.");
    }
}

/** Parse a string containing html */
function parseHTML(unparsed: string): HTMLElement {
    const fragment = document.createElement("template");
    fragment.innerHTML = unparsed;
    const element = fragment.content.firstElementChild;
    if (!(element instanceof HTMLElement)) throw ErrorPF2e("Unexpected error parsing HTML");

    return element;
}

const actionImgMap: Record<string, ImagePath> = {
    1: "systems/pf2e/icons/actions/OneAction.webp",
    2: "systems/pf2e/icons/actions/TwoActions.webp",
    3: "systems/pf2e/icons/actions/ThreeActions.webp",
    "1 or 2": "systems/pf2e/icons/actions/OneTwoActions.webp",
    "1 to 3": "systems/pf2e/icons/actions/OneThreeActions.webp",
    "2 or 3": "systems/pf2e/icons/actions/TwoThreeActions.webp",
    free: "systems/pf2e/icons/actions/FreeAction.webp",
    reaction: "systems/pf2e/icons/actions/Reaction.webp",
    passive: "systems/pf2e/icons/actions/Passive.webp",
};

function getActionIcon(actionType: string | ActionCost | null, fallback: ImagePath): ImagePath;
function getActionIcon(actionType: string | ActionCost | null, fallback: ImagePath | null): ImagePath | null;
function getActionIcon(actionType: string | ActionCost | null): ImagePath;
function getActionIcon(
    action: string | ActionCost | null,
    fallback: ImagePath | null = "systems/pf2e/icons/default-icons/mystery-man.svg"
): ImagePath | null {
    if (action === null) return actionImgMap["passive"];
    const value = typeof action !== "object" ? action : action.type === "action" ? action.value : action.type;
    const sanitized = String(value ?? "")
        .toLowerCase()
        .trim();
    return actionImgMap[sanitized] ?? fallback;
}

const actionGlyphMap: Record<string, string> = {
    0: "F",
    free: "F",
    1: "A",
    2: "D",
    3: "T",
    "1 or 2": "A/D",
    "1 to 3": "A - T",
    "2 or 3": "D/T",
    reaction: "R",
};

/**
 * Returns a character that can be used with the Pathfinder action font
 * to display an icon. If null it returns empty string.
 */
function getActionGlyph(action: string | number | null | { type: string; value: string | number | null }) {
    if (!action && action !== 0) return "";

    const value = typeof action !== "object" ? action : action.type === "action" ? action.value : action.type;
    const sanitized = String(value ?? "")
        .toLowerCase()
        .trim();

    return actionGlyphMap[sanitized] ?? "";
}

function ErrorPF2e(message: string): Error {
    return Error(`PF2e System | ${message}`);
}

/** Returns the number in an ordinal format, like 1st, 2nd, 3rd, 4th, etc */
function ordinal(value: number) {
    const suffixes = LocalizePF2e.translations.PF2E.OrdinalSuffixes;
    const pluralRules = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
    const suffix = suffixes[pluralRules.select(value)];
    return game.i18n.format("PF2E.OrdinalNumber", { value, suffix });
}

/** Localizes a list of strings into a comma delimited list for the current language */
function localizeList(items: string[]) {
    const parts = LocalizePF2e.translations.PF2E.ListPartsOr;

    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) {
        return game.i18n.format(parts.two, { first: items[0], second: items[1] });
    }

    let result = game.i18n.format(parts.start, { first: items[0], second: "{second}" });
    for (let i = 1; i <= items.length - 2; i++) {
        if (i === items.length - 2) {
            const end = game.i18n.format(parts.end, { first: items[i], second: items[items.length - 1] });
            result = result.replace("{second}", end);
        } else {
            const newSegment = game.i18n.format(parts.middle, { first: items[i], second: "{second}" });
            result = result.replace("{second}", newSegment);
        }
    }

    return result;
}

/** Generate and return an HTML element for a FontAwesome icon */
function fontAwesomeIcon(glyph: string, style: "solid" | "regular" = "solid"): HTMLElement {
    const styleClass = style === "regular" ? "far" : "fas";
    const glyphClass = glyph.startsWith("fa-") ? glyph : `fa-${glyph}`;
    const icon = document.createElement("i");
    icon.classList.add(styleClass, glyphClass);
    return icon;
}

/** Short form of type and non-null check */
function isObject<T extends object>(value: unknown): value is DeepPartial<T>;
function isObject<T extends string>(value: unknown): value is { [K in T]?: unknown };
function isObject(value: unknown): boolean {
    return typeof value === "object" && value !== null;
}

/** Create a copy of a record with its insertion order sorted by label */
function sortLabeledRecord<T extends Record<string, { label: string }>>(record: T): T {
    return Object.entries(record)
        .sort((a, b) => a[1].label.localeCompare(b[1].label, game.i18n.lang))
        .reduce((copy, [key, value]) => mergeObject(copy, { [key]: value }), {} as T);
}

function sortStringRecord<T extends Record<string, string>>(record: T): T {
    return Object.entries(record)
        .sort((a, b) => a[1].localeCompare(b[1], game.i18n.lang))
        .reduce((copy, [key, value]) => mergeObject(copy, { [key]: value }), {} as T);
}

/** JSON.stringify with recursive key sorting */
function sortObjByKey(value: unknown): unknown {
    return isObject<Record<string | number, unknown>>(value)
        ? Array.isArray(value)
            ? value.map(sortObjByKey)
            : Object.keys(value)
                  .sort()
                  .reduce((o: Record<string, unknown>, key) => {
                      const v = value[key];
                      o[key] = sortObjByKey(v);
                      return o;
                  }, {})
        : value;
}

function sortedStringify(obj: object): string {
    return JSON.stringify(sortObjByKey(obj));
}

export {
    ErrorPF2e,
    Fraction,
    Optional,
    addSign,
    applyNTimes,
    fontAwesomeIcon,
    getActionGlyph,
    getActionIcon,
    groupBy,
    isBlank,
    isObject,
    localizeList,
    objectHasKey,
    ordinal,
    padArray,
    parseHTML,
    setHasElement,
    sluggify,
    sortLabeledRecord,
    sortObjByKey,
    sortStringRecord,
    sortedStringify,
    sum,
    tupleHasValue,
    zip,
};
