import { ItemPF2e } from "@item";
import { ItemSystemData } from "@item/data/base";
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
        const types: String[] = ["Localize", "Template"];
        const rgx = new RegExp(`@(${types.join("|")})\\[([^\\]]+)\\](?:{([^}]+)})?`, "g");

        return data.replace(rgx, (match: string, inlineType: string, paramString: string, buttonLabel: string) => {
            switch (inlineType) {
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
};
