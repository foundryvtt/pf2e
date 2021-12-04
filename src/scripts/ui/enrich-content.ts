import { ItemSystemData } from "@item/data/base";
import { isObject } from "@util";

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
        // Get itemData from options if available
        const itemData = (() => {
            if (options?.rollData && isObject(options.rollData)) {
                const rollData = options.rollData as Record<string, unknown>;
                return isObject<ItemSystemData>(rollData.item) ? rollData.item : undefined;
            }
            return undefined;
        })();

        // Enrich @inline commands: Localize, Template
        // Localize calls the function again in order to enrich data contained in there
        const entityTypes: String[] = ["Localize", "Template"];
        const rgx = new RegExp(`@(${entityTypes.join("|")})\\[([^\\]]+)\\](?:{([^}]+)})?`, "g");

        return data.replace(rgx, (match: string, inlineType: string, paramString: string, buttonLabel: string) => {
            switch (inlineType) {
                case "Localize":
                    return EnrichContent.enrichString(game.i18n.localize(paramString), options);
                case "Template":
                    return EnrichContent.createTemplate(paramString, buttonLabel, itemData);
            }
            return match;
        });
    },

    // Create inline template button from @template command
    createTemplate(paramString: string, label?: string, itemData?: DeepPartial<ItemSystemData>): string {
        // Get parameters from data
        const rawParams = EnrichContent.getParams(paramString);

        // Check for correct syntax
        if (typeof rawParams === "string") return rawParams;

        const params = Object.fromEntries(rawParams);

        // Check for correct param notation
        if (!params.type) return "Error in @Template: type parameter is mandatory";
        if (!params.distance) return "Error in @Template: distance parameter is mandatory";
        if (!["cone", "emanation", "burst", "line"].includes(params.type))
            return `Error in @Template: type ${params.type} is not supported`;
        if (isNaN(+params.distance)) return `Error in @Template: dimension ${params.distance} is not a number`;
        if (params.width && isNaN(+params.width)) return `Error in @Template: width ${params.width} is not a number`;

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
                shape: game.i18n.localize(`PF2E.AreaType${params.type.charAt(0).toUpperCase() + params.type.slice(1)}`),
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
    },
};
