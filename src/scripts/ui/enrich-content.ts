import { ItemSystemData } from "@item/data/base";
import { isItemSystemData } from "@item/data/helpers";
import { isObject } from "@util";

export const EnrichContent = {
    //get the different parameters of the @inline command
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
        //get itemData from options if available
        let itemData: ItemSystemData | undefined = undefined;
        if (options?.rollData && typeof options.rollData === "object") {
            const rollData = options.rollData as Record<string, unknown>;
            if (rollData.item && isObject(rollData.item) && isItemSystemData(rollData.item)) {
                itemData = rollData.item;
            }
        }

        /*
        enrich @inline commands: Localize, Template
        replacement is repeated until nothing gets changed in order to also enrich data coming from @Localize
        */
        const entityTypes: String[] = ["Localize", "Template"];
        const rgx = new RegExp(`@(${entityTypes.join("|")})\\[([^\\]]+)\\](?:{([^}]+)})?`, "g");
        let replaced = true;
        let replacedData;
        do {
            replacedData = data.replace(
                rgx,
                (match: string, inlineType: string, paramString: string, buttonLabel: string) => {
                    switch (inlineType) {
                        case "Localize":
                            return EnrichContent.createLocalize(paramString);
                        case "Template":
                            return EnrichContent.createTemplate(paramString, buttonLabel, itemData);
                    }
                    return match;
                }
            );
            if (replacedData === data) replaced = false;
            data = replacedData;
        } while (replaced);
        return data;
    },

    //get localized description from @Localize command
    createLocalize(paramString: string): string {
        return game.i18n.localize(paramString);
    },

    //create inline template button from @template command
    createTemplate(paramString: string, label?: string, itemData?: ItemSystemData): string {
        //get parameters from data
        const rawParams = EnrichContent.getParams(paramString);

        //check for correct syntax
        if (typeof rawParams === "string") return rawParams;

        const params = Object.fromEntries(rawParams);

        //check for correct param notation
        if (!params.type) return "Error in @Template: type parameter is mandatory";
        if (!params.distance) return "Error in @Template: distance parameter is mandatory";
        if (!["cone", "emanation", "burst", "line"].includes(params.type))
            return `Error in @Template: type ${params.type} is not supported`;
        if (isNaN(+params.distance)) return `Error in @Template: dimension ${params.distance} is not a number`;
        if (params.width && isNaN(+params.width)) return `Error in @Template: width ${params.width} is not a number`;

        //if no traits are entered manually use the traits from rollOptions if available
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

        //add damaging-effect if param damaging = true and not already included
        if (params.damaging && params.damaging === "true") {
            if (params.traits.search("damaging-effect") === -1)
                params.traits = params.traits.concat(",damaging-effect").replace(/^,/, "");
        }

        //add the html elements used for the inline buttons
        const html = document.createElement("span");
        html.innerHTML =
            label ??
            game.i18n.format("PF2E.InlineButtons.TemplateLabel", {
                type: params.type,
                unit: params.distance,
            });
        html.setAttribute("data-pf2-effect-area", params.type);
        html.setAttribute("data-pf2-distance", params.distance);
        if (params.traits !== "") html.setAttribute("data-pf2-traits", params.traits);
        if (params.type === "line") html.setAttribute("data-pf2-width", params.width ?? "5");
        return html.outerHTML;
    },
};
