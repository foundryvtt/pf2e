import { ArmorData } from './data-definitions';
import { PhysicalItemPF2e } from './physical';

export class ArmorPF2e extends PhysicalItemPF2e {
    get traits(): Set<string> {
        const traits = super.traits;
        const traditionTraits = ['arcane', 'primal', 'divine', 'occult'];
        const fundamentalRunes = [this.data.data.potencyRune, this.data.data.resiliencyRune];
        if (fundamentalRunes.some((rune) => rune.value)) {
            traits.add('invested').add('abjuration');
            if (!traditionTraits.some((trait) => traits.has(trait))) {
                traits.add('magical');
            }
        }

        return traits;
    }

    get isShield(): boolean {
        return this.data.data.armorType.value === 'shield';
    }
}
export interface ArmorPF2e {
    data: ArmorData;
    _data: ArmorData;
}
