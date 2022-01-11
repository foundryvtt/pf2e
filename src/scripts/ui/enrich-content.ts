import { SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/data/values";
import { ItemPF2e } from "@item";
import { ItemSystemData } from "@item/data/base";
import { extractNotes, extractModifiers } from "@module/rules/util";
import { Statistic } from "@system/statistic";
import { objectHasKey } from "@util";

export const EnrichContent = {
    // Get the different parameters of the @inline command
    getParams: (data: string): Map<string, string> | string => {
        const error = "Wrong notation for params - use [type1:value1|type2:value2|...]";
        const parameters = new Map();

        const paramStrings = data.trim().split("|");
        if (!Array.isArray(paramStrings)) return error;

        for (const param of paramStrings) {
            const paramComponents = param.trim().split(":");
            if (paramComponents.length !== 2) return error;

            parameters.set(paramComponents[0].trim(), paramComponents[1].trim());
        }

        return parameters;
    },

    enrichString: (data: string, options?: EnrichHTMLOptions): string => {
        const item = options?.rollData?.item instanceof ItemPF2e ? options.rollData.item : undefined;

        // Enrich @inline commands: Localize, Template
        // Localize calls the function again in order to enrich data contained in there
        const types = ["Check", "Localize", "Template"];
        const rgx = new RegExp(`@(${types.join("|")})\\[([^\\]]+)\\](?:{([^}]+)})?`, "g");

        return data.replace(rgx, (match: string, inlineType: string, paramString: string, buttonLabel: string) => {
            switch (inlineType) {
                case "Check":
                    return EnrichContent.createItemCheck(paramString, buttonLabel, item);
                case "Localize":
                    return EnrichContent.enrichString(game.i18n.localize(paramString), options);
                case "Template":
                    return EnrichContent.createTemplate(paramString, buttonLabel, item?.data.data);
            }
            return match;
        });
    },

    // Create inline template button from @template command
    createTemplate(paramString: string, label?: string, itemData?: ItemSystemData): string {
        // Get parameters from data
        const rawParams = EnrichContent.getParams(paramString);

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
    },

    createItemCheck(paramString: string, inlineLabel?: string, item?: ItemPF2e): string {
        const error = (text: string) => {
            return `[${text}]`;
        };

        // Extract the first parameter
        const parts = paramString.split("|");
        const type = parts[0]?.trim();
        // Handle the rest of paramString
        let params: Record<string, string> = {};
        if (parts.length > 1) {
            parts.shift();
            paramString = parts.join("|");
            const rawParams = EnrichContent.getParams(paramString);
            // Check for correct syntax
            if (typeof rawParams === "string") return error(rawParams);
            params = Object.fromEntries(rawParams);
        }
        if (!type) return error(game.i18n.localize("PF2E.InlineCheck.Errors.TypeMissing"));

        // Handle type:check and check as first parameter
        params.type = type.includes(":") ? type.split(":")[1] : type;

        const traits: string[] = [];
        const itemTraits = item?.data.data.traits;
        if (itemTraits && params.overrideTraits !== "true") {
            traits.push(...itemTraits.value);
            if (itemTraits.custom) {
                traits.push(...itemTraits.custom.split(",").map((trait) => trait.trim()));
            }
        }
        // Add param traits
        if (params.traits) traits.push(...params.traits.split(",").map((trait) => trait.trim()));

        // Deduplicate traits
        const allTraits = Array.from(new Set(traits));

        // Let the inline roll function handle level base DCs
        const checkDC = params.dc === "@self.level" ? params.dc : getCheckDc(params, item);

        // Build the inline link
        const html = document.createElement("span");
        html.setAttribute("data-pf2-dc", checkDC);
        html.setAttribute("data-pf2-traits", `${allTraits}`);
        html.setAttribute(
            "data-pf2-label",
            game.i18n.format("PF2E.InlineCheck.DCWithName", { name: item?.name ?? params.name ?? params.type })
        );
        html.setAttribute("data-pf2-show-dc", "gm");

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
                const skillLabel = shortForm ? game.i18n.localize(CONFIG.PF2E.skills[shortForm]) : params.type;
                html.innerHTML = inlineLabel ?? skillLabel;
                html.setAttribute("data-pf2-check", params.type);
            }
        }
        return html.outerHTML;
    },
};

const getCheckDc = (params: Record<string, string | undefined>, item?: ItemPF2e): string => {
    const type = params.type!;
    const dc = params.dc ?? "0";
    const base = (() => {
        if (dc.startsWith("resolve") && item) {
            const resolve = dc.match(/resolve\((.+?)\)$/);
            const value = resolve && resolve?.length > 0 ? resolve[1] : "";
            if (value.startsWith("max")) {
                const match = [...value.matchAll(/max\((.+?)\)/g)].map((matches) => matches[1]);
                if (match.length === 1) {
                    const values = match[0]
                        .split(",")
                        .map((val) =>
                            Number.isInteger(Number(val)) ? Number(val) : resolveItemValue(item, val.trim()) ?? 0
                        );
                    return Math.max(...values);
                }
            }
            // Handle standard resolve
            return resolveItemValue(item, value);
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
                    notes: extractNotes(rollNotes, selectors),
                    domains: selectors,
                    modifiers: [...extractModifiers(statisticsModifiers, selectors)],
                    dc: {
                        base,
                    },
                });
                return stat.dc()!.value.toString();
            }
            return base.toString();
        };

        switch (type) {
            case "flat":
                return base.toString();
            case "perception":
                return getStatisticValue(["perception", "wis-based", "all"]);
            case "fortitude":
            case "reflex":
            case "will": {
                const ability = CONFIG.PF2E.savingThrowDefaultAbilities[type];
                const selectors = [type, `${ability}-based`, "all"];
                return getStatisticValue(selectors);
            }
            default: {
                // Skill or Lore
                const selectors = ["skill-check", "all"];
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
};

const resolveItemValue = (item: ItemPF2e, formula: string): number | undefined => {
    // Return 0 for unowned items that reference an actor value
    if (formula.startsWith("@actor") && !item.isOwned) return 0;

    const result = Roll.replaceFormulaData(
        formula,
        { item, actor: item.actor },
        {
            missing: "0",
            warn: true,
        }
    );
    return Number(result) || undefined;
};
