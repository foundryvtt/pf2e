import { MigrationBase } from './base';

export class Migration412MigrateDyingCondition extends MigrationBase {
    static version = 0.412;
    async updateActor(actor: any) {
        if (actor == 'character') {
            actor.data.attributes.dying = {
                value: 0,
                max: 4,
            };

            actor.data.attributes.wounded = {
                value: 0,
                max: 3,
            };

            actor.data.attributes.doomed = {
                value: 0,
                max: 3,
            };
        }
    }
}
