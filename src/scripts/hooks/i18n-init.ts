import { HomebrewElements } from "@system/settings/homebrew/menu.ts";

export const I18nInit = {
    listen: (): void => {
        Hooks.once("i18nInit", () => {
            // Assign the homebrew elements to their respective `CONFIG.PF2E` objects
            new HomebrewElements().onInit();
        });
    },
};
