import { MigrationBase } from './base';

export class Migration598AddClassItem extends MigrationBase {
    static version = 0.598;
    requiresFlush = true;

    async updateActor(actor: any) {
        if (actor.type !== 'character') return;

        const classItem = actor.items.find((x: any) => x.type === 'class');
        if (classItem) return; // no need to do anything since it's already there

        const name = actor.data.details.class?.value ?? '';
        actor.items.push({
            type: 'class',
            name: name !== '' ? name : 'unknown',
            data: {
                keyAbility: { value: [actor.data.details?.keyability ?? 'str'] },
                items: [],
                traits: {
                    rarity: {
                        value: 'common',
                    },
                    value: [],
                },
                hp: actor.data.attributes?.classhp ?? 0,
                perception: 0,
                savingThrows: {
                    fortitude: 0,
                    reflex: 0,
                    will: 0,
                },
                attacks: {
                    simple: 0,
                    martial: 0,
                    advanced: 0,
                    unarmed: 0,
                    other: { name: '', rank: 0 },
                },
                defenses: {
                    unarmored: 0,
                    light: 0,
                    medium: 0,
                    heavy: 0,
                },
                trainedSkills: {
                    value: [],
                    additional: 0,
                },
                classDC: 0,
                ancestryFeatLevels: [1, 5, 9, 13, 17],
                classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
                generalFeatLevels: [3, 7, 11, 15, 19],
                skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
                skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
                abilityBoostLevels: [5, 10, 15, 20],
            },
        });

        delete actor.data.details.class;
        delete actor.data.attributes.ancestryhp;
    }
}
