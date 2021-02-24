import { MigrationBase } from './base';
import { ActorDataPF2e } from '@actor/actor-data-definitions';
import { PF2EFeat } from '@item/others';

export class Migration602UpdateDiehardFeat extends MigrationBase {
    static version = 0.602;
    requiresFlush = true;

    private diehardPromise: Promise<Entity | null>;

    constructor() {
        super();
        this.diehardPromise = fromUuid('Compendium.pf2e.feats-srd.I0BhPWqYf1bbzEYg');
    }

    async updateActor(actorData: ActorDataPF2e) {
        const diehard = actorData.items.find(
            (itemData) => itemData.data.slug === 'diehard' && itemData.type === 'feat',
        );

        if (actorData.type === 'character' && diehard !== undefined) {
            actorData.data.attributes.dying.max = 4;
            const diehardIndex = actorData.items.indexOf(diehard);
            const newDiehard = await this.diehardPromise;
            if (!(newDiehard instanceof PF2EFeat)) {
                throw Error('PF2E System | Expected item not found in Compendium');
            }
            actorData.items.splice(diehardIndex, 1, newDiehard.data);
        }
    }
}
