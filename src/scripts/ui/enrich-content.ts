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

    enrichSkillVariants: (
        data: Record<string, { label: string; options: string }> | undefined
    ): Record<string, { label: string; options: string }> | undefined => {
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
            let itemName;
            if (link.className === "action-description")
                itemName = link.closest(".item.action")?.getAttribute("data-item-name") ?? undefined;
            else if (link.className === "editor-content")
                itemName = link.closest(".sheet.pf2e.item")?.getElementsByClassName("window-title")[0].innerHTML;
            link.innerHTML = TextEditor.enrichHTML(EnrichContent.enrichString(link.innerHTML, itemName));
        });
    },

    enrichString: (data: string, itemName: string | undefined = undefined): string => {
        if (!(typeof data === "string")) return data;
        let replaced = true;
        let replacedData;
        do {
            replacedData = data.replace(/@([\w]*)\[([\w.\-=,"|<>/ ]*)\]/g, (match: string, p1: string, p2: string) => {
                switch (p1) {
                    case "Localize":
                        return EnrichContent.createLocalize(p2);
                    case "Save":
                        return EnrichContent.createSave(p2, itemName);
                    case "Check":
                        return EnrichContent.createCheck(p2);
                    case "Template":
                        return EnrichContent.createTemplate(p2);
                }
                return match;
            });
            if (replacedData === data) replaced = false;
            data = replacedData;
        } while (replaced);

        return data;
    },

    createLocalize(data: string): string {
        return EnrichContent.enrichString(game.i18n.localize(data));
    },

    createSave(data: string, itemName: string | undefined): string {
        const strParams = data.split("|");

        //data validations
        if (strParams.length < 2) return "Wrong number of parameters in @Save params ".concat(data);
        if (!["fortitude", "basicFortitude", "reflex", "basicReflex", "will", "basicWill"].includes(strParams[0]))
            return "Save type undefined in @Save params ".concat(data);
        if (isNaN(+strParams[1])) return "DC is not a number in @Save params ".concat(data);
        if (strParams.length == 4 && !["gm", "owner", "all"].includes(strParams[strParams.length - 1]))
            return "Wrong visibility type in @Save params ".concat(data);

        //create default values for save label and visibility
        if (!(typeof itemName === "string")) itemName = game.i18n.localize("PF2E.SavingThrow");
        if (strParams.length === 2) strParams.push(itemName);
        if (strParams.length > 2 && strParams[2] === "") strParams[2] = itemName;
        strParams[2] = strParams[2].concat(" ").concat(game.i18n.localize("PF2E.NPC.Spells.DCLabel"));
        if (strParams.length === 3) strParams.push("gm");

        //create saveType and save button label
        let saveType = strParams[0];
        if (saveType.slice(0, 5) == "basic") saveType = saveType.slice(5, saveType.length).toLocaleLowerCase();
        strParams[0] = strParams[0].charAt(0).toUpperCase().concat(strParams[0].slice(1));

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
        const strParams = data.split("|");

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
