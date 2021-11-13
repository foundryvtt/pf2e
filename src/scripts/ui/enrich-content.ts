//mini type definition for rollData within EnrichHTMLOptions
interface RollOptions extends EnrichHTMLOptions {
    rollData?: RollData;
}

interface RollData {
    item?: {
        name: string;
        traits: {
            value: string[];
            custom: string;
        };
    };
}

export const EnrichContent = {
    //get the different parameters of the @inline command
    getParams: (data: string): Map<string, string> | string => {
        const error = "Wrong notation for params - use [type1:value1|type2:value2|...]";
        const parameters = new Map();

        const paramString = data.trim().split("|");
        if (!Array.isArray(paramString)) return error;

        for (const param of paramString) {
            const paramComponents = param.trim().split(":");
            if (paramComponents.length != 2) return error;

            parameters.set(paramComponents[0].trim(), paramComponents[1].trim());
        }

        return parameters;
    },

    enrichString: (data: string, rollOptions?: RollOptions): string => {
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
                            return EnrichContent.createLocalize(paramString, rollOptions);
                        case "Template":
                            return EnrichContent.createTemplate(paramString, buttonLabel, rollOptions);
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
    createLocalize(paramString: string, rollOptions?: RollOptions): string {
        return EnrichContent.enrichString(game.i18n.localize(paramString), rollOptions);
    },

    //create inline template button from @template command
    createTemplate(paramString: string, label?: string, rollOptions?: RollOptions): string {
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
            if (rollOptions?.rollData?.item) {
                const itemData = rollOptions.rollData.item;
                let traits = itemData.traits.value.join(",");
                if (!(itemData.traits.custom === "")) {
                    traits = traits.concat(`, ${itemData.traits.custom}`);
                }
                params.traits = traits;
            }
        }

        //add extraTraits (added to default traits from rollData or manually set traits)
        if (params.extraTraits) {
            let traits = params.traits;
            const extraTraits = params.extraTraits.split(",");
            extraTraits.forEach((element) => {
                if (traits.search(element) === -1) traits = traits.concat(`,${element}`);
            });
            params.traits = traits.replace(/^,/, "");
        }

        //if no button label is entered directly create default label
        if (!label) {
            let templateSize = game.i18n.format("PF2E.TemplateLabels.FeetDistance", {
                distance: params.distance,
                unit: game.i18n.localize("PF2E.TemplateLabels.InlineButtons.Feet"),
            });
            let templateType = game.i18n.localize(
                `PF2E.TemplateLabels.InlineButtons.TemplateTypeLabels.${
                    params.type.charAt(0).toUpperCase() + params.type.slice(1)
                }`
            );

            label = game.i18n.format("PF2E.TemplateLabels.TemplateLabel", {
                distance: templateSize,
                type: templateType,
            });
        }

        //add the html elements used for the inline buttons
        const html = document.createElement("span");
        html.innerHTML = label;
        html.setAttribute("data-pf2-effect-area", params.type);
        html.setAttribute("data-pf2-distance", params.distance);
        if (params.traits != "") html.setAttribute("data-pf2-traits", params.traits);
        if (params.type === "line") html.setAttribute("data-pf2-width", params.width ?? "5");
        return html.outerHTML;
    },
};
