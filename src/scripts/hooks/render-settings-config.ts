import { createHTMLElement, htmlQuery } from "@util";

/**
 * Remove certain core grid settings to manage it ourselves.
 * Implementation was suggested by https://github.com/foundryvtt/foundryvtt/issues/10683
 */
export const RenderSettingsConfig = {
    listen: (): void => {
        Hooks.on("renderSettingsConfig", (_app, $html) => {
            const html = $html[0];
            const lockedSettings = ["core.gridTemplates", "core.coneTemplateType"];
            for (const locked of lockedSettings) {
                const element = htmlQuery(html, `div[data-setting-id="${locked}"]`);
                if (!element) continue;

                const controlElement = htmlQuery<HTMLInputElement | HTMLSelectElement>(element, "select, input");
                if (controlElement) {
                    controlElement.disabled = true;
                    controlElement.dataset.tooltip = "PF2E.SETTINGS.Core.ManagedBySystem";
                }

                const label = htmlQuery(element, "label");
                const lock = createHTMLElement("i", { classes: ["fa-solid", "fa-lock", "fa-fw"] });
                lock.dataset.tooltip = "PF2E.SETTINGS.Core.ManagedBySystem";
                label?.append(" ", lock);
            }
        });
    },
};
