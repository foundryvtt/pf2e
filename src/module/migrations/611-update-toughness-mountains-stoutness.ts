import { MigrationBase } from './base';
import { ActorDataPF2e } from '@actor/data-definitions';
import { FeatPF2e } from '@item/feat';
import { FeatData } from '@item/data-definitions';

export class Migration611UpdateToughnessMountainsStoutness extends MigrationBase {
    static version = 0.611;
    requiresFlush = true;

    private featSlugs = ['mountains-stoutness', 'mountain-s-stoutness', 'toughness'];
    private pack: Compendium<FeatPF2e>;

    constructor() {
        super();
        this.pack = game.packs.get('pf2e.feats-srd')!;
    }

    async updateActor(actorData: ActorDataPF2e) {
        if (actorData.type !== 'character') return;

        const oldFeatsData = actorData.items.filter(
            (itemData): itemData is FeatData =>
                this.featSlugs.includes(itemData.data.slug ?? '') && itemData.type === 'feat',
        );
        for await (const oldFeatData of oldFeatsData) {
            if (oldFeatData.data.slug === 'mountain-s-stoutness') {
                oldFeatData.data.slug = 'mountains-stoutness';
            }
            const slug = oldFeatData.data.slug;
            const newFeat =
                slug === 'toughness'
                    ? await this.pack.getEntity('AmP0qu7c5dlBSath')
                    : await this.pack.getEntity('COP89tjrNhEucuRW');
            if (!(newFeat instanceof FeatPF2e)) {
                throw Error('PF2E System | Expected item not found in Compendium');
            }
            newFeat.data.data.location = oldFeatData.data.location;
            const oldFeatIndex = actorData.items.indexOf(oldFeatData);
            actorData.items.splice(oldFeatIndex, 1, newFeat.data);
        }
    }
}
