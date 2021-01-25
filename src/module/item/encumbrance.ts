import { Bulk } from './bulk';
import { Sizes } from './dataDefinitions';

/**
 * @category Other
 */
export class InventoryWeight {
    combinedBulk: Bulk;

    encumberedAt: number;

    limit: number;

    constructor(combinedBulk: Bulk, encumberedAt: number, limit: number) {
        this.combinedBulk = combinedBulk;
        this.encumberedAt = encumberedAt;
        this.limit = limit;
    }

    get encumberedPercentage(): number {
        const totalTimes10 = this.combinedBulk.toLightBulk();
        const encumberedAtTimes10 = this.encumberedAt * 10 + 10;
        return Math.floor((totalTimes10 / encumberedAtTimes10) * 100);
    }

    get limitPercentage(): number {
        const totalTimes10 = this.combinedBulk.toLightBulk();
        const limitTimes10 = this.limit * 10 + 10;
        return Math.floor((totalTimes10 / limitTimes10) * 100);
    }

    get limitPercentageMax100(): number {
        if (this.limitPercentage > 100) {
            return 100;
        }
        return this.limitPercentage;
    }

    get isEncumbered(): boolean {
        return this.combinedBulk.normal > this.encumberedAt;
    }

    get isOverLimit(): boolean {
        return this.combinedBulk.normal > this.limit;
    }

    get bulk(): number {
        return this.combinedBulk.normal;
    }
}

/**
 * @param strengthModifier
 * @param bonusBulkLimit increased maximum bulk
 * @param bonusBulkEncumbrance increased bulk until you are encumbered
 * @param combinedBulk
 * @param actorSize
 */
export function calculateEncumbrance(
    strengthModifier: number,
    bonusBulkEncumbrance: number,
    bonusBulkLimit: number,
    combinedBulk: Bulk,
    actorSize: Sizes = 'med',
): InventoryWeight {
    const encumberedAt = Math.floor(strengthModifier + bonusBulkEncumbrance + 5);
    const limit = Math.floor(strengthModifier + bonusBulkLimit + 10);
    return new InventoryWeight(combinedBulk, encumberedAt, limit);
}
