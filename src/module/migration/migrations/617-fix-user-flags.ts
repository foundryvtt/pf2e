import { MigrationBase } from "../base";

export class Migration617FixUserFlags extends MigrationBase {
    static override version = 0.617;

    override async updateUser(userData: foundry.data.UserSource): Promise<void> {
        const flags = userData.flags as Record<string, any>;
        const settings = flags.PF2e?.settings;
        if (settings) {
            const uiTheme = settings.color ?? "blue";
            const showRollDialogs = !settings.quickD20roll;
            flags.pf2e ??= {};
            flags.pf2e.settings = {
                uiTheme,
                showEffectPanel: flags.pf2e?.showEffectPanel ?? true,
                showRollDialogs,
            };
            delete flags.PF2e;
            flags["-=PF2e"] = null;
        }
    }
}
