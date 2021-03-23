import { ArmorCategory, ArmorData } from './data-definitions';
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

    get isArmor(): boolean {
        return !this.isShield;
    }

    get category(): ArmorCategory {
        return this.data.data.armorType.value;
    }

    get dexCap(): number | null {
        return this.isShield ? null : this.data.data.dex.value;
    }

    get strength(): number | null {
        return this.isShield ? null : this.data.data.strength.value;
    }

    get checkPenalty(): number | null {
        return this.isShield ? null : this.data.data.check.value;
    }

    get speedPenalty(): number {
        return this.data.data.speed.value;
    }

    get acBonus(): number {
        const potencyRune = Number(this.data.data.potencyRune?.value) || 0;
        const baseArmor = Number(this.data.data.armor.value) || 0;
        return baseArmor + potencyRune;
    }

    get hitPoints(): { current: number; max: number } {
        return {
            current: this.data.data.hp.value,
            max: this.data.data.maxHp.value,
        };
    }

    get hardness(): number {
        return this.data.data.hardness.value;
    }

    get brokenThreshold(): number {
        return this.data.data.brokenThreshold.value;
    }

    get isBroken(): boolean {
        return this.hitPoints.current <= this.brokenThreshold;
    }
}
export interface ArmorPF2e {
    data: ArmorData;
    _data: ArmorData;
}
