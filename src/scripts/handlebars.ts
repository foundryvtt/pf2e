import type { Coins, PartialPrice } from "@item/physical/data.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { getActionGlyph, ordinalString, signedInteger, sluggify } from "@util";
import * as R from "remeda";

export function registerHandlebarsHelpers(): void {
    Handlebars.registerHelper("pad", (value: unknown, length: number, character: string): string => {
        return `${value}`.padStart(length, character);
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

    Handlebars.registerHelper("coinLabel", (value: Maybe<Coins | PartialPrice>): CoinsPF2e | null => {
        if (!value) return null;
        if ("value" in value) {
            // todo: handle per pricing
            return new CoinsPF2e(value.value);
        }
        return new CoinsPF2e(value);
    });

    Handlebars.registerHelper("includes", (data: unknown, element: unknown): boolean => {
        if (Array.isArray(data)) return data.includes(element);
        if (typeof data === "string") return data.includes(String(element));
        if (data instanceof Set) return data.has(element);
        if (R.isObject(data) && (typeof element === "number" || typeof element === "string")) {
            return element in data;
        }

        return false;
    });

    // Raw blocks are mentioned in handlebars docs but the helper needs to be implemented
    // https://handlebarsjs.com/guide/expressions.html#escaping-handlebars-expressions
    // https://stackoverflow.com/questions/33704495/how-to-use-raw-helper-in-a-handlebars-template
    Handlebars.registerHelper("raw", function (this: unknown, options: Handlebars.HelperOptions): string {
        return options.fn(this);
    });
}
