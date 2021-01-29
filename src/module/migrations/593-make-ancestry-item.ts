import { MigrationBase } from './base';

export class Migration593AddAncestryItem extends MigrationBase {
    static version = 0.593;
    requiresFlush = true;

    async updateActor(actor: any) {
        if (actor.type !== 'character') return;

        const ancestryItem = actor.items.find((x: any) => x.type === 'ancestry');
        if (ancestryItem) return; // no need to do anything since it's already there

        const name = actor.data.details.ancestry?.value ?? '';
        actor.items.push({
            type: 'ancestry',
            name: name !== '' ? name : 'unknown',
            data: {
                hp: actor.data.attributes?.ancestryhp ?? 8,
                speed: parseInt(actor.data.attributes.speed?.value, 10) ?? 25,
                size: actor.data.traits.size?.value ?? 'med',
                boosts: {
                    0: { value: [] },
                    1: { value: [] },
                    2: { value: [] },
                },
                flaws: {
                    0: { value: [] },
                },
                languages: {
                    value: ['common'],
                    custom: '',
                },
                additionalLanguages: {
                    count: 0,
                    value: [],
                    custom: '',
                },
                items: [],
                traits: {
                    rarity: {
                        value: 'common',
                    },
                    value: [],
                },
                vision: 'normal',
            },
        });

        delete actor.data.details.ancestry;
        delete actor.data.attributes.ancestryhp;
        delete actor.data.attributes.speed.value;
        delete actor.data.traits.size;
    }
}
