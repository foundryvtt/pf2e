import { MigrationBase } from './base';

export class Migration617FixUserFlags extends MigrationBase {
    static version = 0.617;

    async updateUser(userData: UserData): Promise<void> {
        const settings = userData.flags.PF2e?.settings;
        if (settings) {
            const uiTheme = settings.color ?? 'blue';
            const showRollDialogs = !settings.quickD20roll;
            userData.flags.pf2e.settings = {
                uiTheme,
                showEffectPanel: userData.flags.showEffectPanel ?? true,
                showRollDialogs,
            };
            delete userData.flags.PF2e;
            userData.flags['-=PF2e'] = null;
        }
    }
}
