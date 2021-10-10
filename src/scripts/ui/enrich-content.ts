export const EnrichContent = {
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
