import { MigrationBase } from './base';

export class Migration603ResetQuickRollDefault extends MigrationBase {
    static version = 0.603;

    async updateUser(userData: UserData): Promise<void> {
        if (typeof userData.flags.PF2e?.settings?.quickD20roll === 'boolean') {
            userData.flags.PF2e.settings.quickD20roll = false;
        }
    }
}
