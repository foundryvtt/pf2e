import { MigrationBase } from './base';
import { ActorDataPF2e } from '@actor/data-definitions';
import { FeatPF2e } from '@item/feat';
import { FeatData } from '@item/data-definitions';

export class Migration610UpdateToughnessMountainsStoutness extends MigrationBase {
    static version = 0.602;
    requiresFlush = true;

    private featSlugs = ['mountains-stoutness', 'mountain-s-stoutness', 'toughness'];
    private featPromises: Promise<[CompendiumEntity | null, CompendiumEntity | null]>;

    constructor() {
        super();
        this.featPromises = Promise.all([
            fromUuid('Compendium.pf2e.feats-srd.AmP0qu7c5dlBSath'),
            fromUuid('Compendium.pf2e.feats-srd.COP89tjrNhEucuRW'),
        ]);
    }

    async updateActor(actorData: ActorDataPF2e) {
        if (actorData.type !== 'character') return;

        const oldFeatsData = actorData.items.filter(
            (itemData): itemData is FeatData =>
                this.featSlugs.includes(itemData.data.slug ?? '') && itemData.type === 'feat',
        );
        const newFeats = await this.featPromises;

        for await (const oldFeatData of oldFeatsData) {
            if (oldFeatData.data.slug === 'mountain-s-stoutness') {
                oldFeatData.data.slug = 'mountains-stoutness';
            }
            const newFeat = newFeats.find(
                (feat): feat is FeatPF2e => feat instanceof FeatPF2e && feat.slug === oldFeatData.data.slug,
            );
            if (!(newFeat instanceof FeatPF2e)) {
                throw Error('PF2E System | Expected item not found in Compendium');
            }
            newFeat.data.data.location = oldFeatData.data.location;
            const oldFeatIndex = actorData.items.indexOf(oldFeatData);
            actorData.items.splice(oldFeatIndex, 1, newFeat.data);
        }
    }
}
