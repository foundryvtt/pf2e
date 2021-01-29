import { MigrationBase } from './base';

export class Migration584AddEthnicityNationality extends MigrationBase {
    static version = 0.584;
    async updateActor(actor: any) {
        if (actor == 'character') {
            actor.data.details.ethnicity = { value: '' };
            actor.data.details.nationality = { value: '' };
        }
    }
}
