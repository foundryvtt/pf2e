import { MigrationBase } from './base';

export class Migration561MigrateHitpointData extends MigrationBase {
    static version = 0.561;
    async updateActor(actor: any) {
        if (actor == 'character') {
            actor.data.attributes.flatbonushp = parseInt((actor.data.attributes.flatbonushp || {}).value, 10) || 0;
            actor.data.attributes.levelbonushp = parseInt((actor.data.attributes.levelbonushp || {}).value, 10) || 0;
            actor.data.attributes.flatbonussp = parseInt((actor.data.attributes.flatbonussp || {}).value, 10) || 0;
            actor.data.attributes.levelbonussp = parseInt((actor.data.attributes.levelbonussp || {}).value, 10) || 0;
            actor.data.attributes.ancestryhp = parseInt((actor.data.attributes.ancestryhp || {}).value, 10) || 0;
            actor.data.attributes.classhp = parseInt((actor.data.attributes.classhp || {}).value, 10) || 0;
        }
    }
}
