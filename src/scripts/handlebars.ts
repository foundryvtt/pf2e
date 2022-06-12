import { ItemPF2e } from "@item";
import { Coins, PartialPrice } from "@item/physical/data";
import { CoinsPF2e } from "@item/physical/helpers";
import { getActionGlyph, ordinal } from "../util";

export function registerHandlebarsHelpers() {
    Handlebars.registerHelper("pad", (value, length, character) => {
        return `${value}`.padStart(length, character);
    });

    Handlebars.registerHelper("add", (a, b) => {
        return a + b;
    });

    Handlebars.registerHelper("if_all", (...args) => {
        const opts = args.pop();

        let { fn } = opts;
        for (let i = 0; i < args.length; ++i) {
            if (args[i]) continue;
            fn = opts.inverse;
            break;
        }

        return fn();
    });

    Handlebars.registerHelper("nor", (...args: unknown[]): boolean => {
        return !args.slice(0, -1).some((a) => !!a);
    });

    Handlebars.registerHelper("any", (...args) => {
        const opts = args.pop();
        return args.some((v) => !!v) ? opts : opts.inverse;
    });

    Handlebars.registerHelper("disabled", (condition: unknown) => {
        return condition ? "disabled" : "";
    });

    /** Return the first argument that is neither undefined nor null */
    Handlebars.registerHelper("coalesce", (...args: unknown[]) => {
        return args.find((arg) => arg !== undefined && arg !== null) ?? null;
    });

    Handlebars.registerHelper("lower", (str) => {
        return String.prototype.toLowerCase.call(str ?? "");
    });

    Handlebars.registerHelper("multiply", (a, b) => {
        return a * b;
    });

    Handlebars.registerHelper("percentage", (value, max) => {
        return (value * 100) / max;
    });

    Handlebars.registerHelper("strip_tags", (value) => {
        // eslint-disable-next-line camelcase
        function strip_tags(input: unknown, allowed?: string): string {
            const _phpCastString = (phpValue: unknown): string => {
                if (typeof phpValue === "string") {
                    return phpValue;
                }

                const type = typeof phpValue;
                switch (type) {
                    case "boolean":
                        return phpValue ? "1" : "";
                    case "number":
                        if (Number.isNaN(phpValue)) {
                            return "NAN";
                        }

                        if (phpValue === Infinity) {
                            return `${phpValue < 0 ? "-" : ""}INF`;
                        }

                        return `${phpValue}`;
                    case "undefined":
                        return "";
                    case "object":
                        if (Array.isArray(phpValue)) {
                            return "Array";
                        }

                        if (phpValue !== null) {
                            return "Object";
                        }

                        return "";
                    case "function":
                    // fall through
                    default:
                        throw new Error("Unsupported value type");
                }
            };

            // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
            allowed = (`${allowed || ""}`.toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join("");

            const tags = /<\/?([a-z0-9]*)\b[^>]*>?/gi;
            const commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

            let after = _phpCastString(input);
            // removes tha '<' char at the end of the string to replicate PHP's behaviour
            after = after.substring(after.length - 1) === "<" ? after.substring(0, after.length - 1) : after;

            // recursively remove tags to ensure that the returned string doesn't contain forbidden tags after previous passes (e.g. '<<bait/>switch/>')
            let before: string;
            do {
                before = after;
                after = before
                    .replace(commentsAndPhpTags, "")
                    .replace(tags, ($0, $1) => (allowed!.indexOf(`<${$1.toLowerCase()}>`) > -1 ? $0 : ""));

                // return once no more tags are removed
                if (before === after) {
                    return after;
                }
            } while (before !== after);
            return "";
        }

        return strip_tags(String(value));
    });

    Handlebars.registerHelper("ordinal", function (value: number | string) {
        value = Number(value);
        return isNaN(value) ? null : ordinal(value);
    });

    Handlebars.registerHelper("enrichHTML", (html, options) => {
        const item: ItemPF2e = options?.hash.item;
        const rollData = item?.getRollData();
        return game.pf2e.TextEditor.enrichHTML(html, { rollData, secrets: game.user.isGM });
    });

    Handlebars.registerHelper("json", (html) => {
        return JSON.stringify(html);
    });

    Handlebars.registerHelper("actionGlyph", (value, options) => {
        const glyph = getActionGlyph(value ?? "");
        if (glyph) {
            return `<span class="activity-icon">${glyph}</span>`;
        } else if (options?.hash.fallback) {
            return Handlebars.escapeExpression(value);
        }

        return null;
    });

    // From https://github.com/leapfrogtechnology/just-handlebars-helpers/
    Handlebars.registerHelper("concat", function (...params) {
        // Ignore the object appended by handlebars.
        if (typeof params[params.length - 1] === "object") {
            params.pop();
        }

        return params.join("");
    });

    Handlebars.registerHelper("times", function (count, block) {
        const results = new Array<string>();
        for (let i = 0; i < count; i++) {
            results.push(block.fn(i));
        }
        return results.join("");
    });

    Handlebars.registerHelper("developMode", function (this: unknown, body: Handlebars.HelperOptions) {
        if (BUILD_MODE === "development") {
            return body.fn(this);
        }

        return "";
    });

    Handlebars.registerHelper("isNullish", function (value: unknown) {
        return value === null || value === undefined;
    });

    Handlebars.registerHelper("coinLabel", function (value: Coins | PartialPrice) {
        if (!value) return null;
        if ("value" in value) {
            // todo: handle per pricing
            return new CoinsPF2e(value.value);
        }
        return new CoinsPF2e(value);
    });
}
