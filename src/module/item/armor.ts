import { ArmorData } from './data-definitions';
import { PhysicalItemPF2e } from './physical';

export class ArmorPF2e extends PhysicalItemPF2e {
    get isShield(): boolean {
        return this.data.data.armorType.value === 'shield';
    }
}
export interface ArmorPF2e {
    data: ArmorData;
    _data: ArmorData;
}
