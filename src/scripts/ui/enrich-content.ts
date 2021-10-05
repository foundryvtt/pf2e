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

    enrichString: (data: string): string => {
        if (!(typeof data === "string")) return data;
        let replaced = true;
        let replacedData;
        do {
            replacedData = data.replace(/@([\w]*)\[([\w.\-=,"|<>/ ]*)\]/g, (match: string, p1: string, p2: string) => {
                switch (p1) {
                    case "Localize":
                        return EnrichContent.createLocalize(p2);
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
};
