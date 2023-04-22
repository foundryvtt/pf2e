import { MigrationBase } from "../base.ts";

/** Retire system token-hover settings in favor of Foundry's "Default Token Configuration" */
export class Migration694RetireSystemTokenSettings extends MigrationBase {
    static override version = 0.694;

    override async migrate(): Promise<void> {
        const systemNameHover =
            (Number(game.settings.storage.get("world").getItem("pf2e.defaultTokenSettingsName")) as TokenDisplayMode) ||
            CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
        const systemBarHover =
            (Number(game.settings.storage.get("world").getItem("pf2e.defaultTokenSettingsBar")) as TokenDisplayMode) ||
            CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
        const coreTokenDefaults = game.settings.get("core", "defaultToken");
        coreTokenDefaults.displayName = systemNameHover;
        coreTokenDefaults.displayBars = systemBarHover;
    }
}
