import { getActionGlyph, ordinalString, signedInteger, sluggify } from "@util";
import * as R from "remeda";

export function registerHandlebarsHelpers(): void {
    Handlebars.registerHelper("pad", (value: unknown, length: number, character: string): string => {
        return String(value).padStart(length, character);
    });

    Handlebars.registerHelper("add", (a: unknown, b: unknown): number => {
        return Number(a) + Number(b);
    });

    Handlebars.registerHelper("nor", (...args: unknown[]): boolean => {
        return !args.slice(0, -1).some((a) => !!a);
    });

    Handlebars.registerHelper("any", (...args: unknown[]): boolean => {
        return args.slice(0, -1).some((a) => !!a);
    });

    Handlebars.registerHelper("disabled", (condition: unknown): string => {
        return condition ? "disabled" : "";
    });

    /** Return the first argument that is neither undefined nor null */
    Handlebars.registerHelper("coalesce", (...args: unknown[]): unknown => {
        return args.find((a) => a !== undefined && a !== null) ?? null;
    });

    Handlebars.registerHelper("lower", (str: unknown): string => {
        return String(str).toLowerCase();
    });

    Handlebars.registerHelper("capitalize", (str: unknown): string => {
        return String(str).capitalize();
    });

    Handlebars.registerHelper("multiply", (a: unknown, b: unknown): number => {
        return Number(a) * Number(b);
    });

    Handlebars.registerHelper("percentage", (value: unknown, max: unknown): number => {
        return (Number(value) * 100) / Number(max);
    });

    Handlebars.registerHelper("ordinal", (value: unknown): string | null => {
        const numericValue = Number(value);
        return isNaN(numericValue) ? null : ordinalString(numericValue);
    });

    Handlebars.registerHelper("sluggify", (text: unknown): string => {
        return sluggify(String(text));
    });

    Handlebars.registerHelper("json", (data: unknown): string => {
        return JSON.stringify(data);
    });

    Handlebars.registerHelper("actionGlyph", (value, options: Handlebars.HelperOptions): string | null => {
        const glyph = getActionGlyph(value ?? "");
        if (glyph) {
            return `<span class="action-glyph">${glyph}</span>`;
        } else if (options?.hash.fallback) {
            return Handlebars.escapeExpression(value);
        }

        return null;
    });

    Handlebars.registerHelper("times", (count: unknown, options: Handlebars.HelperOptions): string =>
        [...Array(Number(count) || 0).keys()]
            .map((i) => options.fn(i, { data: options.data, blockParams: [i] }))
            .join(""),
    );

    Handlebars.registerHelper("concat", (...params: unknown[]): string => {
        return params.slice(0, -1).join("");
    });

    Handlebars.registerHelper("developMode", function (this: unknown, options: Handlebars.HelperOptions): string {
        if (BUILD_MODE === "development") {
            return options.fn(this);
        }

        return "";
    });

    Handlebars.registerHelper("isNumber", (value: unknown): boolean => {
        return typeof value === "number";
    });

    Handlebars.registerHelper("isNullish", (value: unknown): boolean => {
        return value === null || value === undefined;
    });

    Handlebars.registerHelper("signedInteger", (value: unknown, options: Handlebars.HelperOptions): string => {
        const number = Number(value) || 0;
        const emptyStringZero = !!options.hash.emptyStringZero;
        const zeroIsNegative = !!options.hash.zeroIsNegative;
        return signedInteger(number, { emptyStringZero, zeroIsNegative });
    });

    Handlebars.registerHelper("includes", (data: unknown, element: unknown): boolean => {
        if (Array.isArray(data)) return data.includes(element);
        if (typeof data === "string") return data.includes(String(element));
        if (data instanceof Set) return data.has(element);
        if (R.isObjectType(data) && (typeof element === "number" || typeof element === "string")) {
            return element in data;
        }

        return false;
    });

    /**
     *  Returns a partial copy of an object omitting the keys specified.
     *  They keys can be a string, a number or a stringified JSON array
     *  {{omit object 0}}
     *  {{omit damageTypes "bleed"}}
     *  {{omit damageTypes '["bleed", "bludgeoning"]'}}
     */
    Handlebars.registerHelper("omit", (data: unknown, maybeKeys: unknown) => {
        return pickOrOmit("omit", data, maybeKeys);
    });

    /**
     *  Creates an object composed of the picked object properties.
     *  They keys can be a string, a number or a stringified JSON array
     *  {{pick object 0}}
     *  {{pick damageTypes "bleed"}}
     *  {{pick damageTypes '["bleed", "bludgeoning"]'}}
     */
    Handlebars.registerHelper("pick", (data: unknown, maybeKeys: unknown) => {
        return pickOrOmit("pick", data, maybeKeys);
    });

    // Raw blocks are mentioned in handlebars docs but the helper needs to be implemented
    // https://handlebarsjs.com/guide/expressions.html#escaping-handlebars-expressions
    // https://stackoverflow.com/questions/33704495/how-to-use-raw-helper-in-a-handlebars-template
    Handlebars.registerHelper("raw", function (this: unknown, options: Handlebars.HelperOptions): string {
        return options.fn(this);
    });

    /** Resolves either a systems/pf2e or a systems/sf2e path based on system variables */
    Handlebars.registerHelper("resolvePath", function (path: unknown): string {
        const stringPath = String(path);
        const pathNormalized = stringPath[0] === "/" || stringPath[0] === "\\" ? stringPath.substring(1) : stringPath;
        return `${SYSTEM_ROOT}/${pathNormalized}`;
    });
}

/** Used by the "pick" and "omit" helpers */
function pickOrOmit(type: "omit" | "pick", data: unknown, maybeKeys: unknown) {
    if (!R.isPlainObject(data)) return data;
    const keys =
        typeof maybeKeys === "string"
            ? maybeKeys.startsWith("[") && maybeKeys.endsWith("]")
                ? (JSON.parse(maybeKeys) as (string | number)[])
                : [maybeKeys]
            : typeof maybeKeys === "number"
              ? [maybeKeys]
              : [];
    return type === "omit" ? R.omit(data, keys) : R.pick(data, keys);
}
