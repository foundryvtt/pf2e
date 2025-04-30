import { SetGamePF2e } from "@scripts/set-game-pf2e.ts";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links.ts";
import { DestroyableManager } from "@util/destroyables.ts";
import { registerSheets } from "../register-sheets.ts";

/** This runs after game data has been requested and loaded from the servers, so entities exist */
export const Setup = {
    listen: (): void => {
        Hooks.once("setup", () => {
            InlineRollLinks.activatePF2eListeners();

            // Have the destroyable manager start observing the document body
            DestroyableManager.initialize();

            // Register actor and item sheets
            registerSheets();

            // Some of game.pf2e must wait until the setup phase
            SetGamePF2e.onSetup();

            // Forced panning is intrinsically annoying: change default to false
            game.settings.settings.get("core.chatBubblesPan").default = false;
            // Skipping defeated combatants is broadly desirable
            game.settings.settings.get("core.combatTrackerConfig").default.skipDefeated = true;
            // Bronze ring is more pf2e-y
            game.settings.settings.get("core.dynamicTokenRing").default = "coreBronze";
            // Use grid fit mode to allow for informative small-size scaling
            game.settings.settings.get("core.dynamicTokenRingFitMode").default = "grid";
            // PF2E has no directional facing rules, and top-down tokens are rare
            game.settings.settings.get("core.tokenAutoRotate").default = false;
        });
    },
};
