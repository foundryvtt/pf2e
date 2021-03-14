import { PhysicalItemPF2e } from './physical';
import { WeaponData } from './data-definitions';

export class WeaponPF2e extends PhysicalItemPF2e {
    get traits(): Set<string> {
        const traits = super.traits;
        const traditionTraits = ['arcane', 'primal', 'divine', 'occult'];
        const fundamentalRunes = [this.data.data.potencyRune, this.data.data.strikingRune];
        if (fundamentalRunes.some((rune) => rune.value)) {
            traits.add('evocation');
            if (!traditionTraits.some((trait) => traits.has(trait))) {
                traits.add('magical');
            }
        }

        return traits;
    }
}

export interface WeaponPF2e {
    data: WeaponData;
    _data: WeaponData;
}
