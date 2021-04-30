import { ValuesList } from '@actor/data-definitions';
import { ItemDataPF2e, SpellDetailsData } from '@item/data-definitions';
import { ConfigPF2e } from '@scripts/config';
import { MigrationBase } from './base';

/**
 * Makes spells use the category for focus/ritual spells instead
 * of traditions and removes focus/ritual from the spell types.
 */
export class Migration626UpdateSpellCategory extends MigrationBase {
    static version = 0.626;

    async updateItem(itemData: ItemDataPF2e) {
        if (itemData.type === 'spell') {
            interface MaybeCategorie extends Partial<SpellDetailsData> {
                traditions: ValuesList<keyof ConfigPF2e['PF2E']['spellTraditions']>;
                spellCategorie?: { value: 'spell' | 'focus' | 'ritual' | '' };
                spellCategory?: { value: 'spell' | 'focus' | 'ritual' | '' };
                '-=spellCategorie'?: unknown;
                '-=spellCategory'?: unknown;
            }
            const systemData: MaybeCategorie = itemData.data;
            const traditions: ValuesList = systemData.traditions;
            const isFocus = traditions.value.includes('focus');
            const isRitual = traditions.value.includes('ritual');

            // Sometimes the traditions is a string instead of an array.
            // Convert those to an empty array.
            if (typeof traditions.value === 'string') {
                traditions.value = [];
            }

            if (systemData.spellCategorie || systemData.spellCategory) {
                const currentCategory = systemData.spellCategorie?.value ?? systemData.spellCategory?.value ?? '';
                itemData.data.category = {
                    value: isFocus ? 'focus' : isRitual ? 'ritual' : currentCategory === '' ? 'spell' : currentCategory,
                };

                delete systemData['spellCategorie'];
                delete systemData['spellCategory'];
                // Foundry entity updates (if foundry is running)
                if ('game' in globalThis) {
                    systemData['-=spellCategorie'] = null;
                    systemData['-=spellCategory'] = null;
                }
            }

            if (['focus', 'ritual'].includes(itemData.data.spellType.value)) {
                itemData.data.spellType.value = 'utility';
            }
            traditions.value = traditions.value.filter((tradition) => !['focus', 'ritual'].includes(tradition));
        } else if (itemData.type === 'consumable') {
            // Also update any nested consumable spell data
            if (itemData.data.spell?.data) {
                await this.updateItem(itemData.data.spell.data);
            }
        }
    }
}
