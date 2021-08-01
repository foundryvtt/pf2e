import { MigrationBase } from '@module/migration/base';
import { ItemSourcePF2e } from '@item/data';
import { ActorSourcePF2e } from '@actor/data';
import { ConfigPF2eHomebrewList } from './index';
import { objectHasKey } from '@module/utils';
import { BaseWeaponProficiencyKey, WeaponGroupProficiencyKey } from '@actor/character/data';

export function prepareCleanup(listKey: ConfigPF2eHomebrewList, deletions: string[]): MigrationBase {
    const Migration = class extends MigrationBase {
        override async updateActor(actorData: ActorSourcePF2e) {
            if (!(actorData.type === 'character' || actorData.type === 'npc')) {
                return;
            }

            switch (listKey) {
                case 'creatureTraits': {
                    const traits = actorData.data.traits.traits;
                    traits.value = traits.value.filter((trait) => !deletions.includes(trait));
                    break;
                }
                case 'languages': {
                    const languages = actorData.data.traits.languages;
                    languages.value = languages.value.filter((language) => !deletions.includes(language));
                    break;
                }
                case 'weaponCategories': {
                    if (actorData.type === 'character') {
                        for (const key of deletions) {
                            if (objectHasKey(actorData.data.martial, key)) {
                                delete actorData.data.martial[key];
                                (actorData.data.martial as unknown as Record<string, unknown>)[`-=${key}`] = null;
                            }
                        }
                    }
                    break;
                }
                case 'weaponGroups': {
                    if (actorData.type === 'character') {
                        const proficiencyKeys = deletions.map(
                            (deletion) => `weapon-group-${deletion}`,
                        ) as WeaponGroupProficiencyKey[];
                        for (const key of proficiencyKeys) {
                            delete actorData.data.martial[key];
                            (actorData.data.martial as unknown as Record<string, unknown>)[`-=${key}`] = null;
                        }
                    }
                    break;
                }
                case 'baseWeapons': {
                    if (actorData.type === 'character') {
                        const proficiencyKeys = deletions.map(
                            (deletion) => `weapon-base-${deletion}`,
                        ) as BaseWeaponProficiencyKey[];
                        for (const key of proficiencyKeys) {
                            delete actorData.data.martial[key];
                            (actorData.data.martial as unknown as Record<string, unknown>)[`-=${key}`] = null;
                        }
                    }
                    break;
                }
            }
        }

        override async updateItem(itemData: ItemSourcePF2e) {
            switch (listKey) {
                // Creature traits can be on many item
                case 'creatureTraits': {
                    const traits = itemData.data.traits;
                    traits.value = traits.value.filter((trait) => !deletions.includes(trait));
                    break;
                }
                case 'featTraits': {
                    if (itemData.type === 'feat') {
                        const traits = itemData.data.traits;
                        traits.value = traits.value.filter((trait) => !deletions.includes(trait));
                    }
                    break;
                }
                case 'magicSchools': {
                    if (itemData.type === 'spell') {
                        const school = itemData.data.school;
                        school.value = deletions.includes(school.value ?? '') ? 'evocation' : school.value;
                    }
                    break;
                }
                case 'spellTraits': {
                    if (itemData.type === 'spell') {
                        const traits = itemData.data.traits;
                        traits.value = traits.value.filter((trait) => !deletions.includes(trait));
                    }
                    break;
                }
                case 'weaponCategories': {
                    if (itemData.type === 'weapon') {
                        const category = itemData.data.weaponType;
                        category.value = deletions.includes(category.value ?? '') ? 'simple' : category.value;
                    }
                    break;
                }
                case 'weaponGroups': {
                    if (itemData.type === 'weapon') {
                        const group: { value: string | null } = itemData.data.group;
                        group.value = deletions.includes(group.value ?? '') ? null : group.value;
                    }
                    break;
                }
                case 'baseWeapons': {
                    if (itemData.type === 'weapon') {
                        const base = itemData.data.baseItem;
                        itemData.data.baseItem = deletions.includes(base ?? '') ? null : base;
                    }
                    break;
                }
            }
        }
    };

    return new Migration();
}
