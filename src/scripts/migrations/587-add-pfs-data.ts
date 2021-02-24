import { MigrationBase } from './base';

export class Migration587AddPFSData extends MigrationBase {
    static version = 0.587;
    async updateActor(actor: any) {
        if (actor == 'character') {
            actor.data.pfs.reputation = { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 };
            actor.data.pfs.currentFaction = 'EA';
            actor.data.pfs.fame = 0;
        }
    }
}
