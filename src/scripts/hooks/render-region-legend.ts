import { htmlQuery } from "@util";

export const RenderRegionLegend = {
    listen: (): void => {
        Hooks.on("renderRegionLegend", async (_app, html) => {
            const terrainTypes = canvas.scene?.flags.pf2e.terrainTypes;
            if (!terrainTypes || terrainTypes.length === 0) return;

            const template = await (async () => {
                const markup = await renderTemplate("systems/pf2e/templates/scene/region-legend-partial.hbs", {
                    terrainTypes: terrainTypes.map((t) => game.i18n.localize(CONFIG.PF2E.terrainTypes[t])),
                });
                const tempElem = document.createElement("div");
                tempElem.innerHTML = markup;
                return tempElem.firstElementChild instanceof HTMLTemplateElement ? tempElem.firstElementChild : null;
            })();
            htmlQuery(html, "div.region-filters")?.before(...(template?.content.children ?? []));
        });
    },
};
