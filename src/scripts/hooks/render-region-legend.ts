import { htmlQuery } from "@util";

export const RenderRegionLegend = {
    listen: (): void => {
        Hooks.on("renderRegionLegend", async (_app, html) => {
            const environmentTypes = canvas.scene?.flags.pf2e.environmentTypes;
            if (!environmentTypes || environmentTypes.length === 0) return;

            const template = await (async () => {
                const markup = await fa.handlebars.renderTemplate(
                    `${SYSTEM_ROOT}/templates/scene/region-legend-partial.hbs`,
                    {
                        environmentTypes: environmentTypes.map((t) =>
                            game.i18n.localize(CONFIG.PF2E.environmentTypes[t]),
                        ),
                    },
                );
                const tempElem = document.createElement("div");
                tempElem.innerHTML = markup;
                return tempElem.firstElementChild instanceof HTMLTemplateElement ? tempElem.firstElementChild : null;
            })();
            htmlQuery(html, "div.region-filters")?.before(...(template?.content.children ?? []));
        });
    },
};
