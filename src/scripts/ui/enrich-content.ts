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
        const entityTypes: String[] = ["Localize", "Template"];
        const rgx = new RegExp(`@(${entityTypes.join("|")})\\[([^\\]]+)\\](?:{([^}]+)})?`, "g");
        if (!(typeof data === "string")) return data;
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

        const html = document.createElement("span");
        html.setAttribute("data-pf2-effect-area", params.get("type") ?? "");
        html.setAttribute("data-pf2-distance", params.get("distance") ?? "");
        if (!(params.get("traits") === "")) html.setAttribute("data-pf2-traits", params.get("traits") ?? "");
        html.innerHTML =
            label ??
            game.i18n.format("PF2E.InlineButtons.TemplateLabel", {
                type: params.get("type") ?? "",
                unit: params.get("distance") ?? "",
            });
        if (params.get("type") === "line") html.setAttribute("data-pf2-width", params.get("width") ?? "5");
        return html.outerHTML;
    },
};
