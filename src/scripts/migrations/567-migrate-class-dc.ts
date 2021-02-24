import { MigrationBase } from './base';

export class Migration567MigrateClassDC extends MigrationBase {
    static version = 0.567;
    async updateActor(actor: any) {
        if (actor == 'character') {
            actor.data.attributes.classDC = {
                rank: 0,
                ability: 'str',
                item: 0,
                value: 0,
                breakdown: '',
            };
            actor.data.attributes.bonusbulk = 0;
        }
    }
}
