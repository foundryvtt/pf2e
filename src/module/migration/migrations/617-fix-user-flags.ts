import { UserSourcePF2e } from "@module/user/data.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration617FixUserFlags extends MigrationBase {
    static override version = 0.617;

    override async updateUser(source: UserSourcePF2e): Promise<void> {
        const flags: DocumentFlags & { "-=PF2e"?: null } = source.flags;
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
