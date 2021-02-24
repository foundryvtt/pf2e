import { MigrationBase } from './base';
export class Migration544MigrateStamina extends MigrationBase {
    static version = 0.544;
    async updateActor(actor: any) {
        actor.data.attributes.sp = {
            min: 0,
            max: 0,
            value: 0,
        };

        actor.data.attributes.resolve = {
            value: 0,
        };

        actor.data.details.keyability = {
            value: 'str',
        };
    }
}
