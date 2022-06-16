import { ActorPF2e } from "@actor";
import { SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/data/values";
import { ItemPF2e } from "@item";
import { ItemSystemData } from "@item/data/base";
import { extractModifiers, extractNotes } from "@module/rules/util";
import { UserVisibility, UserVisibilityPF2e } from "@scripts/ui/user-visibility";
import { objectHasKey, sluggify } from "@util";
import { Statistic } from "./statistic";

/** Censor enriched HTML according to metagame knowledge settings */
class TextEditorPF2e extends TextEditor {
    static override enrichHTML(content = "", options: EnrichHTMLOptionsPF2e = {}): string {
        const enriched = super.enrichHTML(this.enrichString(content, options), options);
        const $html = $("<div>").html(enriched);
        const actor = options.rollData?.actor ?? null;
        UserVisibilityPF2e.process($html, { actor });

        return $html.html();
    }

    static enrichString(data: string, options: EnrichHTMLOptionsPF2e = {}): string {
        const item = options.rollData?.item ?? null;

        // Enrich @inline commands: Localize, Template
        // Localize calls the function again in order to enrich data contained in there
        const types = ["Check", "Localize", "Template"];
        const rgx = new RegExp(`@(${types.join("|")})\\[([^\\]]+)\\](?:{([^}]+)})?`, "g");

        return data.replace(rgx, (match: string, inlineType: string, paramString: string, buttonLabel: string) => {
            switch (inlineType) {
                case "Check":
                    return this.createItemCheck(paramString, buttonLabel, item);
                case "Localize":
                    return this.enrichString(game.i18n.localize(paramString), options);
                case "Template":
                    return this.createTemplate(paramString, buttonLabel, item?.data.data);
            }
            return match;
        });
    }

    /**
     * Convert an XML node into an HTML span element with data-visibility, data-whose, and class attributes
     * @param html    The HTML element containing the XML node: mutated by this method as part of node replacement
     * @param name    The name of the node to convert
     * @param options attributes to add to the generated span element
     * @returns The generated span element, or `null` if no `name` node was found
     */
    static convertXMLNode(
        html: HTMLElement,
        name: string,
        { visibility = null, whose = "self", classes = [] }: ConvertXMLNodeOptions
    ): HTMLElement | null {
        const node = html.querySelector(name);
        if (!node) return null;

        const span = document.createElement("span");
        const { dataset, classList } = span;

        if (visibility) dataset.visibility = visibility;
        if (whose) dataset.whose = whose;
        for (const cssClass of classes) {
            classList.add(cssClass);
        }

        span.append(...Array.from(node.childNodes));
        node.replaceWith(span);

        return span;
    }

    /** Create inline template button from @template command */
    private static createTemplate(paramString: string, label?: string, itemData?: ItemSystemData): string {
        // Get parameters from data
        const rawParams = ((): Map<string, string> | string => {
            const error = "Wrong notation for params - use [type1:value1|type2:value2|...]";
            const parameters = new Map();

            const paramStrings = paramString.trim().split("|");
            if (!Array.isArray(paramStrings)) return error;

            for (const param of paramStrings) {
                const paramComponents = param.trim().split(":");
                if (paramComponents.length !== 2) return error;

                parameters.set(paramComponents[0].trim(), paramComponents[1].trim());
            }

            return parameters;
        })();

        // Check for correct syntax
        if (typeof rawParams === "string") return rawParams;

        const params = Object.fromEntries(rawParams);

        // Check for correct param notation
        if (!params.type) {
            return game.i18n.localize("PF2E.InlineTemplateErrors.TypeMissing");
        } else if (!params.distance) {
            return game.i18n.localize("PF2E.InlineTemplateErrors.DistanceMissing");
        } else if (!objectHasKey(CONFIG.PF2E.areaTypes, params.type)) {
            return game.i18n.format("PF2E.InlineTemplateErrors.TypeUnsupported", { type: params.type });
        } else if (isNaN(+params.distance)) {
            return game.i18n.format("PF2E.InlineTemplateErrors.DistanceNoNumber", { distance: params.distance });
        } else if (params.width && isNaN(+params.width)) {
            return game.i18n.format("PF2E.InlineTemplateErrors.WidthNoNumber", { width: params.width });
        } else {
            // If no traits are entered manually use the traits from rollOptions if available
            if (!params.traits) {
                params.traits = "";

                if (itemData?.traits) {
                    let traits = itemData.traits.value.join(",");
                    if (!(itemData.traits.custom === "")) {
                        traits = traits.concat(`, ${itemData.traits.custom}`);
                    }
                    params.traits = traits;
                }
            }

            // If no button label is entered directly create default label
            if (!label) {
                label = game.i18n.format("PF2E.TemplateLabel", {
                    size: params.distance,
                    unit: game.i18n.localize("PF2E.Foot"),
                    shape: game.i18n.localize(CONFIG.PF2E.areaTypes[params.type]),
                });
            }

            // Add the html elements used for the inline buttons
            const html = document.createElement("span");
            html.innerHTML = label;
            html.setAttribute("data-pf2-effect-area", params.type);
            html.setAttribute("data-pf2-distance", params.distance);
            if (params.traits !== "") html.setAttribute("data-pf2-traits", params.traits);
            if (params.type === "line") html.setAttribute("data-pf2-width", params.width ?? "5");
            return html.outerHTML;
        }
    }

    private static createItemCheck(paramString: string, inlineLabel?: string, item: ItemPF2e | null = null): string {
        const error = (text: string) => {
            return `[${text}]`;
        };

        // Parse the parameter string
        const parts = paramString.split("|");
        const params: { type: string; dc: string } & Record<string, string> = { type: "", dc: "" };
        for (const paramPart of parts) {
            const param = paramPart.trim();
            if (param.startsWith("traits:")) {
                // Special case for "traits" that may be roll options
                params.traits = param.substring(7);
            } else {
                const paramParts = param.split(":");
                if (paramParts.length !== 2) {
                    return error(`Error. Expected "parameter:value" but got: ${param}`);
                }
                params[paramParts[0].trim()] = paramParts[1].trim();
            }
        }
        if (!params.type) return error(game.i18n.localize("PF2E.InlineCheck.Errors.TypeMissing"));

        const traits: string[] = [];

        // Set item traits
        const itemTraits = item?.data.data.traits;
        if (itemTraits && params.overrideTraits !== "true") {
            traits.push(...itemTraits.value);
            if (itemTraits.custom) {
                traits.push(...itemTraits.custom.split(",").map((trait) => trait.trim()));
            }
        }

        // Set action slug as a roll option
        if (item?.slug) {
            const actionName = "action:" + item?.slug;
            traits.push(actionName);
        }

        // Set origin actor traits.
        const actorTraits = item?.actor?.getSelfRollOptions("origin");
        if (actorTraits && params.overrideTraits !== "true") {
            traits.push(...actorTraits);
        }

        // Add traits for basic checks
        if (params.basic === "true") traits.push("damaging-effect");

        // Add param traits
        if (params.traits) traits.push(...params.traits.split(",").map((trait) => trait.trim()));

        // Deduplicate traits
        const allTraits = Array.from(new Set(traits));

        // Build the inline link
        const html = document.createElement("span");
        html.setAttribute("data-pf2-traits", `${allTraits}`);
        const name = params.name ?? item?.name ?? params.type;
        html.setAttribute("data-pf2-label", game.i18n.format("PF2E.InlineCheck.DCWithName", { name }));
        html.setAttribute("data-pf2-repost-flavor", name);
        const role = params.showDC ?? "owner";
        html.setAttribute("data-pf2-show-dc", params.showDC ?? role);
        html.setAttribute("data-pf2-adjustment", params.adjustment ?? "");

        switch (params.type) {
            case "flat":
                html.innerHTML = inlineLabel ?? game.i18n.localize("PF2E.FlatCheck");
                html.setAttribute("data-pf2-check", "flat");
                break;
            case "perception":
                html.innerHTML = inlineLabel ?? game.i18n.localize("PF2E.PerceptionCheck");
                html.setAttribute("data-pf2-check", "perception");
                break;
            case "fortitude":
            case "reflex":
            case "will": {
                const saveName = game.i18n.localize(CONFIG.PF2E.saves[params.type]);
                const saveLabel =
                    params.basic === "true"
                        ? game.i18n.format("PF2E.InlineCheck.BasicWithSave", { save: saveName })
                        : saveName;
                html.innerHTML = inlineLabel ?? saveLabel;
                html.setAttribute("data-pf2-check", params.type);
                break;
            }
            default: {
                // Skill or Lore
                const shortForm = (() => {
                    if (SKILL_EXPANDED[params.type]) {
                        return SKILL_EXPANDED[params.type].shortform;
                    } else if (objectHasKey(SKILL_DICTIONARY, params.type)) {
                        return params.type;
                    }
                    return;
                })();
                const skillLabel = shortForm
                    ? game.i18n.localize(CONFIG.PF2E.skills[shortForm])
                    : params.type
                          .split("-")
                          .map((word) => {
                              return word.slice(0, 1).toUpperCase() + word.slice(1);
                          })
                          .join(" ");
                html.innerHTML = inlineLabel ?? skillLabel;
                html.setAttribute("data-pf2-check", params.type);
            }
        }

        if (params.type && params.dc) {
            // Let the inline roll function handle level base DCs
            const checkDC = params.dc === "@self.level" ? params.dc : getCheckDC(name, params, item);
            html.setAttribute("data-pf2-dc", checkDC);
            const text = html.innerHTML;
            if (checkDC !== "@self.level") {
                html.innerHTML = game.i18n.format("PF2E.DCWithValueAndVisibility", { role, dc: checkDC, text });
            }
        }
        return html.outerHTML;
    }
}

function getCheckDC(
    name: string,
    params: { type: string; dc: string } & Record<string, string | undefined>,
    item: ItemPF2e | null = null
): string {
    const { type } = params;
    const dc = params.dc;
    const base = (() => {
        if (dc.startsWith("resolve") && item) {
            params.immutable ||= "true";
            const resolve = dc.match(/resolve\((.+?)\)$/);
            const value = resolve && resolve?.length > 0 ? resolve[1] : "";
            const saferEval = (resolveString: string): number => {
                try {
                    return Roll.safeEval(Roll.replaceFormulaData(resolveString, { actor: item.actor!, item: item }));
                } catch {
                    return 0;
                }
            };
            return Number(saferEval(value));
        }
        return Number(dc) || undefined;
    })();

    if (base) {
        const getStatisticValue = (selectors: string[]): string => {
            if (item?.isOwned && params.immutable !== "true") {
                const actor = item.actor!;
                const { statisticsModifiers, rollNotes } = actor.synthetics;

                const stat = new Statistic(actor, {
                    slug: type,
                    label: name,
                    notes: extractNotes(rollNotes, selectors),
                    domains: selectors,
                    modifiers: [...extractModifiers(statisticsModifiers, selectors)],
                    dc: {
                        base,
                    },
                });

                return String(stat.dc.value);
            }
            return base.toString();
        };

        const slugName = sluggify(name);

        switch (type) {
            case "flat":
                return params.immutable === "false"
                    ? getStatisticValue(["inline-dc", `${slugName}-inline-dc`])
                    : base.toString();
            case "perception":
                return getStatisticValue(["all", "inline-dc", `${slugName}-inline-dc`]);
            case "fortitude":
            case "reflex":
            case "will": {
                const selectors = ["all", "inline-dc", `${slugName}-inline-dc`];
                return getStatisticValue(selectors);
            }
            default: {
                // Skill or Lore
                const selectors = ["all", "inline-dc", `${slugName}-inline-dc`];
                if (SKILL_EXPANDED[type]) {
                    // Long form
                    selectors.push(...[type, `${SKILL_EXPANDED[type].ability}-based`]);
                } else if (objectHasKey(SKILL_DICTIONARY, type)) {
                    // Short form
                    const longForm = SKILL_DICTIONARY[type];
                    selectors.push(...[longForm, `${SKILL_EXPANDED[longForm].ability}-based`]);
                }
                return getStatisticValue(selectors);
            }
        }
    }
    return "0";
}

interface EnrichHTMLOptionsPF2e extends EnrichHTMLOptions {
    rollData?: {
        actor?: ActorPF2e | null;
        item?: ItemPF2e | null;
        mod?: number;
        [key: string]: unknown;
    };
}

interface ConvertXMLNodeOptions {
    /** The value of the data-visibility attribute to add to the span element */
    visibility?: UserVisibility | null;
    /**
     * Whether this piece of data belongs to the "self" actor or the target: used by UserVisibilityPF2e to
     * determine which actor's ownership to check
     */
    whose?: "self" | "target";
    /** Any additional classes to add to the span element */
    classes?: string[];
}

export { TextEditorPF2e, EnrichHTMLOptionsPF2e };
