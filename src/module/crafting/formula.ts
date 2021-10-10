import { ConsumablePF2e, PhysicalItemPF2e, WeaponPF2e } from "@item";
import { Rarity } from "@module/data";
import { calculateDC } from "@module/dc";

export class CraftingFormula implements CraftingFormulaData {
    /** The difficulty class to craft this item */
    dc: number;

    /** Some items can be created in multiples with a single crafting check */
    batchSize: number;

    constructor(private item: PhysicalItemPF2e, { dc, batchSize }: { dc?: number; batchSize?: number } = {}) {
        this.dc = dc ?? calculateDC(item.level, { rarity: item.rarity });

        /** Use the passed batch size if provided or otherwise according to the following */
        this.batchSize =
            batchSize ??
            (() => {
                const isMundaneAmmo = item instanceof ConsumablePF2e && item.isAmmunition && !item.isMagical;
                const isConsumable =
                    (item instanceof ConsumablePF2e && item.consumableType !== "wand") ||
                    (item instanceof WeaponPF2e && item.baseType === "alchemical-bomb");
                return isMundaneAmmo ? 10 : item.slug === "rations" ? 28 : isConsumable ? 4 : 1;
            })();
    }

    get uuid(): ItemUUID {
        return this.item.uuid;
    }

    get img(): ImagePath {
        return this.item.img;
    }

    get name(): string {
        return this.item.name;
    }

    get level(): number {
        return this.item.level;
    }

    get rarity(): Rarity {
        return this.item.rarity;
    }

    get price(): string {
        return this.item.price;
    }

    get description(): string {
        return this.item.description;
    }
}

export interface CraftingFormulaData {
    uuid: ItemUUID;
    dc?: number;
    batchSize?: number;
}
