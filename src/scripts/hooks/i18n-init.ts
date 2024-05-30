import { HomebrewElements } from "@system/settings/homebrew/menu.ts";

export const I18nInit = {
    listen: (): void => {
        Hooks.once("i18nInit", () => {
            game.pf2e.ConditionManager.initialize();
            // Assign the homebrew elements to their respective `CONFIG.PF2E` objects
            new HomebrewElements().onInit();

            // Document.defaultName only checks `TYPES` for documents with a `TypeDataModel`
            // todo: Remove once https://github.com/foundryvtt/foundryvtt/issues/11029 is fixed
            fu.mergeObject(game.i18n.translations, {
                "TYPES.RegionBehavior.environment": game.i18n.localize("PF2E.Region.Environment.Label"),
            });
        });
    },
};
