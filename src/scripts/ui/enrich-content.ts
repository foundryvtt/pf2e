import { RuleElementPF2e } from "@module/rules/rule-element";

export const EnrichContent = {
    enrichRuleElements: (data: RuleElementPF2e[]): RuleElementPF2e[] => {
        if (Array.isArray(data)) {
            data.forEach((entry, index, arr) => {
                if (arr[index].data.label) arr[index].data.label = EnrichContent.enrichString(entry.data.label);
            });
        }
        return data;
    },

    enrichSkillVariants: (data: any): any => {
        if (data) {
            for (const [key] of Object.entries(data)) {
                data[key].label = EnrichContent.enrichString(data[key].label);
            }
        }
        return data;
    },

    enrichHTML: (data: JQuery): void => {
        const $links = data.find(".action-description, .editor-content");
        $links.each((_idx, link) => {
            console.warn(link);
            link.innerHTML = TextEditor.enrichHTML(EnrichContent.enrichString(link.innerHTML));
        });
    },

    enrichString: (data: string): string => {
        if (!(typeof data === "string")) return data;
        let replaced = true;
        let replacedData;
        do {
            replacedData = data.replace(
                /@([\w]*)\[([\w.\-=,"|\<\>\/ ]*)\]/g,
                (match: string, p1: string, p2: string) => {
                    switch (p1) {
                        case "Const":
                            return EnrichContent.createConst(p2);
                        case "Save":
                            return EnrichContent.createSave(p2);
                        case "Check":
                            return EnrichContent.createCheck(p2);
                        case "Template":
                            return EnrichContent.createTemplate(p2);
                    }
                    return match;
                }
            );
            if (replacedData === data) replaced = false;
            data = replacedData;
        } while (replaced);

        return data;
    },

    createConst(data: string): string {
        return EnrichContent.enrichString(game.i18n.localize(data));
    },

    createSave(data: string): string {
        let strParams = data.split("|");

        let saveType = strParams[0];
        if (saveType.slice(0, 4) == "basic") {
            strParams[0] = saveType.slice(5, saveType.length - 1);
            saveType = strParams[0].toLowerCase();
        } else strParams[0] = strParams[0].charAt(0).toUpperCase().concat(strParams[0].slice(1));

        if (strParams.length == 3) strParams.push("gm");

        const html = document.createElement("span");

        html.setAttribute("data-pf2-check", saveType);
        html.setAttribute("data-pf2-dc", strParams[1]);
        html.innerHTML = game.i18n.localize("PF2E.Saves".concat(strParams[0]));
        html.setAttribute("data-pf2-label", strParams[2]);
        html.setAttribute("data-pf2-show-dc", strParams[3]);

        return html.outerHTML;
    },

    createCheck(data: string): string {
        return data;
    },

    createTemplate(data: string): string {
        let strParams = data.split("|");

        if (!(strParams.length == 3)) return "Wrong number of parameters in @Template params ".concat(data);
        if (!["cone", "emanation", "burst", "line", "rectangle"].includes(strParams[0]))
            return "Area type undefined in @Template params ".concat(data);
        if (isNaN(+strParams[1])) return "Dimension is not a number in @Template params ".concat(data);

        const html = document.createElement("span");

        html.setAttribute("data-pf2-effect-area", strParams[0]);
        html.setAttribute("data-pf2-distance", strParams[1]);
        html.innerHTML = strParams[2];
        return html.outerHTML;
    },
};
