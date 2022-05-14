import { isObject } from "@util";
import { MigrationBase } from "../base";

export class Migration617FixUserFlags extends MigrationBase {
    static override version = 0.617;

    override async updateUser(userData: foundry.data.UserSource): Promise<void> {
        const flags: Record<string, Record<string, unknown>> & { "-=PF2e"?: null } = userData.flags;
        const settings = flags.PF2e?.settings;
        if (isObject<Record<string, unknown>>(settings) && typeof settings.color === "string") {
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
