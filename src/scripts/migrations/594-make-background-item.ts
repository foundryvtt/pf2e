import { MigrationBase } from './base';

export class Migration594AddBackgroundItem extends MigrationBase {
    static version = 0.594;
    requiresFlush = true;

    async updateActor(actor: any) {
        if (actor.type !== 'character') return;

        const backgroundItem = actor.items.find((x: any) => x.type === 'background');
        if (backgroundItem) return; // no need to do anything since it's already there

        const name = actor.data.details.background?.value ?? '';
        actor.items.push({
            type: 'background',
            name: name !== '' ? name : 'unknown',
            data: {
                boosts: {
                    0: { value: [] },
                    1: { value: [] },
                },
                items: [],
                traits: {
                    rarity: {
                        value: 'common',
                    },
                    value: [],
                },
                trainedLore: '',
                trainedSkills: {
                    value: [],
                },
            },
        });

        delete actor.data.details.background;
    }
}
