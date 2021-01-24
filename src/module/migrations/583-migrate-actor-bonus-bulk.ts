import { MigrationBase } from './base';

export class Migration583MigrateActorBonusBulk extends MigrationBase {
    static version = 0.583;
    async updateActor(actor: any) {
        if (actor == 'character') {
            actor.data.attributes.bonusLimitBulk = actor.data.attributes.bonusbulk || 0;
            actor.data.attributes.bonusEncumbranceBulk = actor.data.attributes.bonusbulk || 0;
        }
    }
}
