import { MigrationBase } from './base';
import { ActorDataPF2e } from '@actor/data-definitions';
import { Rarity } from '@item/data-definitions';

export class Migration612NormalizeRarities extends MigrationBase {
    static version = 0.612;
    requiresFlush = true;

    async updateActor(actorData: ActorDataPF2e) {
        const traits = actorData.data.traits;
        if (!(('rarity' in traits) as { rarity?: Rarity })) {
            traits.rarity = { value: 'common' };
        }

        // Remove rarities from standard traits list
        const rarities = ['common', 'uncommon', 'rare', 'unique'] as const;
        for (const rarity of rarities) {
            if (traits.traits.value.includes(rarity)) {
                const index = traits.traits.value.indexOf(rarity);
                traits.traits.value.splice(index, 1);
                traits.rarity = { value: rarity };
            }
        }
    }
}
