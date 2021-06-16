import { MigrationBase } from '../base';

export class Migration603ResetQuickRollDefault extends MigrationBase {
    static override version = 0.603;

    override async updateUser(userData: foundry.data.UserSource): Promise<void> {
        const flags = userData.flags as Record<string, any>;
        if (typeof flags.PF2e?.settings?.quickD20roll === 'boolean') {
            flags.PF2e.settings.quickD20roll = false;
        }
    }
}
