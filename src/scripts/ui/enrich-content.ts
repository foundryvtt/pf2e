export const EnrichContent = {
    getParams: (data: string): Map<string, string> | string => {
        const error = "Wrong notation for params - use [type1:value1|type2:value2|...]";
        const parameters = new Map();

        const params = data.trim().split("|");
        if (!Array.isArray(params)) return error;

        for (const arr of params) {
            const a = arr.trim().split(":");
            if (!(a.length === 2)) return error;

            parameters.set(a[0].trim(), a[1].trim());
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
            replacedData = data.replace(rgx, (match: string, p1: string, p2: string, p3: string) => {
                switch (p1) {
                    case "Localize":
                        return EnrichContent.createLocalize(p2, options);
                    case "Template":
                        return EnrichContent.createTemplate(p2, p3, options);
                }
                return match;
            });
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
        data = data.replace(rgx, (match: string, p1: string, p2: string, p3: string, p4: string) => {
            //check for and correct syntax to persistent damage
            const rgx = new RegExp(`\\[(\\w+),persistent\\]`, "g");
            p2 = p2.replace(rgx, (match: string, p1: string) => {
                match = `[persistent,${p1}]`;
                return match;
            });

            //if no chat label is entered directly use the item name from rollOptions if available
            if (!(typeof p3 === "string")) {
                if (options?.rollData) {
                    for (const [k, v] of Object.entries(options.rollData)) {
                        if (k === "item") {
                            p3 = v.name;
                        }
                    }
                } else p3 = "Roll";
            }

            //if no button label is entered directly use the roll's damage components to create a default label
            if (!(typeof p4 === "string")) {
                const rollComps = p2.split("+");

                //loop through the damage components
                for (const arr of rollComps) {
                    let dType = "";
                    let translated = true;
                    let persistent = false;

                    const a = arr.replace(/\{/g, "").replace(/\]/g, "").split("}[");

                    //get localized damage die
                    const rgx = new RegExp(`(${Object.keys(CONFIG.PF2E.damageDie).join("|")})`, "g");

                    a[0] = a[0].replace(rgx, (match: string) => {
                        return game.i18n.localize(CONFIG.PF2E.damageDie[match as keyof typeof CONFIG.PF2E.damageDie]);
                    });

                    //check for persistent damge
                    if (a[1].search("persistent") > -1) {
                        persistent = true;
                        dType = a[1].replace("persistent", "").replace(",", "");
                    } else dType = a[1];

                    //get localized damage or healing type
                    if (Object.keys(CONFIG.PF2E.damageTypes).includes(dType))
                        dType = game.i18n.localize(
                            CONFIG.PF2E.damageTypes[dType as keyof typeof CONFIG.PF2E.damageTypes]
                        );
                    else if (Object.keys(CONFIG.PF2E.healingTypes).includes(dType))
                        dType = game.i18n.localize(
                            CONFIG.PF2E.healingTypes[dType as keyof typeof CONFIG.PF2E.healingTypes]
                        );
                    else translated = false;

                    if (translated) {
                        a[1] = dType;
                        if (persistent)
                            a[1] = a[1].concat(
                                ` (${game.i18n.localize(CONFIG.PF2E.conditionTypes["persistent-damage"])})`
                            );
                    }

                    if (!(typeof p4 === "string")) p4 = `${a[0]} ${a[1]}`;
                    else p4 = p4.concat(` and ${a[0]} ${a[1]}`);
                }
            }

            match = `[[${p1} ${p2} #${p3}]]{${p4}}`;

            return match;
        });
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
                        const t = v.traits.value.join(",");
                        if (!(v.traits.custom === "")) t.append(`, ${v.traits.custom}`);
                        params.set("traits", t);
                    } else params.set("traits", "");
                }
            } else params.set("traits", "");
        }

        //add damaging-effect if param damaging = true and not already included
        if (params.get("damaging") === "true") {
            const traits = params.get("traits") ?? "";
            if (traits.search("damaging-effect") === -1)
                params.set("traits", traits.concat(",damaging-effect").replace(/^,/, ""));
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
