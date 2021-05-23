// @ts-nocheck

import { MigrationBase } from './base';
import { ActorDataPF2e } from '@actor/data-definitions';
import { FeatPF2e } from '@item/feat';

export class Migration602UpdateDiehardFeat extends MigrationBase {
    static version = 0.602;
    requiresFlush = true;

    private diehardPromise: Promise<CompendiumEntity | null>;

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
            if (!(newDiehard instanceof FeatPF2e)) {
                throw Error('PF2E System | Expected item not found in Compendium');
            }
            actorData.items.splice(diehardIndex, 1, newDiehard.data);
        }
    }
}
