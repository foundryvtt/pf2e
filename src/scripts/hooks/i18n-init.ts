import { HomebrewElements } from "@system/settings/homebrew/menu.ts";
import { WorldClockSettings } from "@system/settings/world-clock.ts";

export const I18nInit = {
    listen: (): void => {
        Hooks.once("i18nInit", () => {
            game.pf2e.ConditionManager.initialize();
            new HomebrewElements().onInit();
            WorldClockSettings.localizeSchema();
        });
    },
};
