export const EnrichContent = {
    getParams: (data: string): Map<string, string> | string => {
        const error = "Wrong notation for params - use [type1:value1|type2:value2|...]";
        const parameters = new Map();

        const paramString = data.trim().split("|");
        if (!Array.isArray(paramString)) return error;

        for (const param of paramString) {
            const paramComponents = param.trim().split(":");
            if (!(paramComponents.length === 2)) return error;

            parameters.set(paramComponents[0].trim(), paramComponents[1].trim());
        }

        return parameters;
    },

    enrichString: (data: string, options?: EnrichHTMLOptions): string => {
        //enrich inline damage buttons with default chat labels and default button labels
        data = EnrichContent.enrichInlineRolls(data, options);

        //enrich @ inline commands: Localize, Template, Check, Recharge
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
                            return EnrichContent.createLocalize(paramString, options);
                        case "Template":
                            return EnrichContent.createTemplate(paramString, buttonLabel, options);
                    }
                    return match;
                }
            );
            if (replacedData === data) replaced = false;
            data = replacedData;
        } while (replaced);
        return data;
    },

    //enrich inline damage buttons with default chat labels and default button labels
    enrichInlineRolls(data: string, options?: EnrichHTMLOptions): string {
        const rgx = new RegExp(
            `\\[\\[(\\/r|\\/br) ((?:{[^}]+}\\[[^\\]]+\\][\\+]*)+)(?: #([^\\]]+))?\\]\\](?:{([^}]+)})?`,
            "g"
        );
        data = data.replace(
            rgx,
            (match: string, rollType: string, rolls: string, chatLabel: string, buttonLabel: string) => {
                //if no chat label is entered directly use the item name from rollOptions if available
                if (!(typeof chatLabel === "string")) {
                    if (options?.rollData) {
                        for (const [k, v] of Object.entries(options.rollData)) {
                            if (k === "item") {
                                chatLabel = v.name;
                            }
                        }
                    } else chatLabel = game.i18n.localize("PF2E.InlineButtons.DamageRollDefaultLabel");
                }

                //if no button label is entered directly use the roll's roll parts to create a default label
                if (!(typeof buttonLabel === "string")) {
                    buttonLabel = "";
                    const rollParts = rolls.match(/{[^}]+}\[[^\]]+\]/g) ?? [];

                    //loop through the different roll parts
                    for (const rollPart of rollParts) {
                        const rollComponent = rollPart.replace(/\{/g, "").replace(/\]/g, "").split("}[");

                        //get localized damage die
                        const rgx = new RegExp(`(${Object.keys(CONFIG.PF2E.damageDie).join("|")})`, "g");

                        buttonLabel = buttonLabel.concat(
                            " + ",
                            rollComponent[0].replace(rgx, (match: string) => {
                                return game.i18n.localize(
                                    CONFIG.PF2E.damageDie[match as keyof typeof CONFIG.PF2E.damageDie]
                                );
                            }),
                            " "
                        );

                        //get localized damage categories, types and subtypes
                        const damageCategories: String[] = [];
                        const damageSubtypes: String[] = [];
                        const damageTypes: String[] = [];
                        const healingTypes: String[] = [];
                        const customTypes: String[] = [];

                        rollComponent[1].split(",").forEach((element) => {
                            if (Object.keys(CONFIG.PF2E.damageCategories).includes(element))
                                damageCategories.push(
                                    game.i18n.localize(
                                        CONFIG.PF2E.damageCategories[
                                            element as keyof typeof CONFIG.PF2E.damageCategories
                                        ]
                                    )
                                );
                            else if (Object.keys(CONFIG.PF2E.damageSubtypes).includes(element))
                                damageSubtypes.push(
                                    game.i18n.localize(
                                        CONFIG.PF2E.damageSubtypes[element as keyof typeof CONFIG.PF2E.damageSubtypes]
                                    )
                                );
                            else if (Object.keys(CONFIG.PF2E.damageTypes).includes(element))
                                damageTypes.push(
                                    game.i18n.localize(
                                        CONFIG.PF2E.damageTypes[element as keyof typeof CONFIG.PF2E.damageTypes]
                                    )
                                );
                            else if (Object.keys(CONFIG.PF2E.healingTypes).includes(element))
                                healingTypes.push(
                                    game.i18n.localize(
                                        CONFIG.PF2E.healingTypes[element as keyof typeof CONFIG.PF2E.healingTypes]
                                    )
                                );
                            else customTypes.push(element);
                        });
                        buttonLabel = buttonLabel.concat(damageTypes.concat(healingTypes, customTypes).join(", "));

                        if (damageCategories.concat(damageSubtypes).join(", ").length)
                            buttonLabel = buttonLabel.concat(
                                " (",
                                damageCategories.concat(damageSubtypes).join(", "),
                                ")"
                            );
                    }
                }
                match = `[[${rollType} ${rolls} #${chatLabel}]]{${buttonLabel.replace(/^ \+ /g, "")}}`;

                return match;
            }
        );
        return data;
    },

    createLocalize(data: string, options?: EnrichHTMLOptions): string {
        return EnrichContent.enrichString(game.i18n.localize(data), options);
    },

    createTemplate(data: string, label?: string, options?: EnrichHTMLOptions): string {
        //get parameters from data
        const params = EnrichContent.getParams(data);

        //check for correct notation
        if (typeof params === "string") return params;
        if (!params.has("type")) return "Error in @Template: type parameter is mandatory";
        if (!params.has("distance")) return "Error in @Template: distance parameter is mandatory";

        if (!["cone", "emanation", "burst", "line"].includes(params.get("type") ?? ""))
            return `Error in @Template: type ${params.get("type")} is not supported`;
        if (isNaN(+(params.get("distance") ?? "")))
            return `Error in @Template: dimension ${params.get("distance")} is not a number`;

        if (params.has("width")) {
            if (isNaN(+(params.get("width") ?? "")))
                return `Error in @Template: width ${params.get("width")} is not a number`;
        }

        //if no traits are entered directly use the traits from rollOptions if available
        if (!params.has("traits")) {
            if (options?.rollData) {
                for (const [k, v] of Object.entries(options.rollData)) {
                    if (k === "item") {
                        const traits = v.traits.value.join(",");
                        if (!(v.traits.custom === "")) traits.append(`, ${v.traits.custom}`);
                        params.set("traits", traits);
                    } else params.set("traits", "");
                }
            } else params.set("traits", "");
        }

        //add extraTraits (added to e.g. default traits from rollData)
        if (params.has("extraTraits")) {
            let traits = params.get("traits") ?? "";
            const extraTraits = params.get("extraTraits")?.split(",") ?? [];
            extraTraits.forEach((element) => {
                if (traits.search(element) === -1) traits = traits.concat(`,${element}`);
            });
            params.set("traits", traits.replace(/^,/, ""));
        }

        //if no button label is entered directly create default label
        let tSize = `${params.get("distance") ?? ""} ${game.i18n.localize("PF2E.Feet")}`;
        let tType = params.get("type") ?? "";

        if (!label) {
            if (Object.keys(CONFIG.PF2E.areaSizes).includes(params.get("distance") ?? "0"))
                tSize = game.i18n.localize(
                    CONFIG.PF2E.areaSizes[
                        parseInt(params.get("distance") ?? "0", 10) as keyof typeof CONFIG.PF2E.areaSizes
                    ]
                );
            if (Object.keys(CONFIG.PF2E.areaTypes).includes(params.get("type") ?? ""))
                tType = game.i18n.localize(
                    CONFIG.PF2E.areaTypes[params.get("type") as keyof typeof CONFIG.PF2E.areaTypes]
                );
        }

        //add the html elements used for the inline buttons
        const html = document.createElement("span");
        html.setAttribute("data-pf2-effect-area", params.get("type") ?? "");
        html.setAttribute("data-pf2-distance", params.get("distance") ?? "");
        if (!(params.get("traits") === "")) html.setAttribute("data-pf2-traits", params.get("traits") ?? "");
        html.innerHTML =
            label ??
            game.i18n.format("PF2E.InlineButtons.TemplateLabel", {
                type: tType,
                size: tSize,
            });
        if (params.get("type") === "line") html.setAttribute("data-pf2-width", params.get("width") ?? "5");
        return html.outerHTML;
    },
};
