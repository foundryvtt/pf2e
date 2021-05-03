import { MigrationBase } from './base';
import { ItemDataPF2e, MagicSchoolKey } from '@item/data/types';
import { objectHasKey } from '@module/utils';

/** Remove duplicate magic schools localization map */
export class Migration621RemoveConfigSpellSchools extends MigrationBase {
    static version = 0.621;

    private KEY_MAP = {
        abj: 'abjuration',
        con: 'conjuration',
        div: 'divination',
        enc: 'enchantment',
        evo: 'evocation',
        ill: 'illusion',
        nec: 'necromancy',
        trs: 'transmutation',
    } as const;

    private reassignSchool(abbreviation: string) {
        if (objectHasKey(this.KEY_MAP, abbreviation)) {
            return this.KEY_MAP[abbreviation];
        } else if (Object.values(this.KEY_MAP).includes(abbreviation as MagicSchoolKey)) {
            return abbreviation;
        } else {
            return this.KEY_MAP.evo;
        }
    }

    async updateItem(itemData: ItemDataPF2e): Promise<void> {
        if (itemData.type == 'spell') {
            const school: { value: string } = itemData.data.school ?? { value: 'evocation' };
            school.value = this.reassignSchool(school.value);
        } else if (itemData.type === 'consumable' && itemData.data.spell?.data) {
            const spell = itemData.data.spell.data;
            const school: { value: string } = spell.data.school ?? { value: 'evocation' };
            school.value = this.reassignSchool(school.value);
        }
    }
}
