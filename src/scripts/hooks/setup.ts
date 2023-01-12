import { LocalizePF2e } from "@system/localize";
import { registerSheets } from "../register-sheets";
import { HomebrewElements } from "@system/settings/homebrew";
import { SetGamePF2e } from "@scripts/set-game-pf2e";

/** This runs after game data has been requested and loaded from the servers, so entities exist */
export const Setup = {
    listen: (): void => {
        Hooks.once("setup", () => {
            LocalizePF2e.ready = true;

            // Register actor and item sheets
            registerSheets();

            CONFIG.controlIcons.defeated = game.settings.get("pf2e", "deathIcon");
            game.pf2e.StatusEffects.initialize();

            // Assign the homebrew elements to their respective `CONFIG.PF2E` objects
            const homebrew = new HomebrewElements();
            homebrew.onSetup();

            // Some of game.pf2e must wait until the setup phase
            SetGamePF2e.onSetup();

            // Forced panning is intrinsically annoying: change default to false
            game.settings.settings.get("core.chatBubblesPan").default = false;
            // Improve discoverability of map notes
            game.settings.settings.get("core.notesDisplayToggle").default = true;

            // Set Hover by Owner as defaults for Default Token Configuration
            const defaultTokenSettingsDefaults = game.settings.settings.get("core.defaultToken").default;
            defaultTokenSettingsDefaults.displayName = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
            defaultTokenSettingsDefaults.displayBars = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
        });
    },
};
