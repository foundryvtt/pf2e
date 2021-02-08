import { MigrationBase } from './base';
import { ActorDataPF2e } from '@actor/actorDataDefinitions';
import { PF2EFeat } from '@item/others';
import { PF2ECharacter } from '@actor/character';
import { FeatData } from '@item/dataDefinitions';

export class Migration602UpdateDiehardFeat extends MigrationBase {
    static version = 0.602;

    private diehardPromise: Promise<PF2EFeat>;

    constructor() {
        super();
        this.diehardPromise = fromUuid('Compendium.pf2e.feats-srd.I0BhPWqYf1bbzEYg') as Promise<PF2EFeat>;
    }

    async updateActor(actorData: ActorDataPF2e) {
        if (actorData.type !== 'character') return;

        const character = new PF2ECharacter(actorData);
        const feat = character.items.find((item) => item.slug === 'diehard');
        if (feat instanceof PF2EFeat) {
            await character.deleteOwnedItem(feat.id);
            await character.update({ 'data.attributes.dying.max': 4 });

            const diehardFeat = await this.diehardPromise;
            const featData: Partial<FeatData> = duplicate(diehardFeat.data);
            delete featData._id;

            await character.createOwnedItem(featData);
        }
    }
}
