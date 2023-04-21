import { Coins, PartialPrice } from "@item/physical/data.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { getActionGlyph, ordinal, sluggify } from "../util/index.ts";

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
        return isNaN(numericValue) ? null : ordinal(numericValue);
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
            return `<span class="activity-icon">${glyph}</span>`;
        } else if (options?.hash.fallback) {
            return Handlebars.escapeExpression(value);
        }

        return null;
    });

    Handlebars.registerHelper("times", (count: unknown, options: Handlebars.HelperOptions): string =>
        [...Array(Number(count)).keys()].map((i) => options.fn(i)).join("")
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

    Handlebars.registerHelper("coinLabel", (value: Maybe<Coins | PartialPrice>): CoinsPF2e | null => {
        if (!value) return null;
        if ("value" in value) {
            // todo: handle per pricing
            return new CoinsPF2e(value.value);
        }
        return new CoinsPF2e(value);
    });

    Handlebars.registerHelper("contains", (arr: unknown, element: unknown): boolean => {
        return Array.isArray(arr) && arr.includes(element);
    });
}
