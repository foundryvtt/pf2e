import { DamageCategory, DamageDieSize } from './damage';

export class DamageEntry {
    /** If true then this is damage of base weapon */
    base: boolean;
    /** Type of damage this entry does */
    damageType: string;
    /** Damage category this entry does */
    category: string;
    /** Multiplier that modifier and all dice are multiplied by */
    multiplier: number;
    /** Numeric modifier that is added to total damage */
    modifier: number;
    /** The number of dice to add. */
    diceNumber: number;
    /** The size of the dice to add. */
    dieSize?: DamageDieSize;

    constructor(params: Partial<DamageEntry> & Pick<DamageEntry, 'damageType'>) {
        this.base = params.base ?? false;
        this.damageType = params.damageType;
        this.category = params.category ?? DamageCategory.fromDamageType(this.damageType);
        this.multiplier = params.multiplier ?? 1;
        this.modifier = params.modifier ?? 0;
        this.diceNumber = params.diceNumber ?? 0;
        this.dieSize = params.dieSize;
    }
}
