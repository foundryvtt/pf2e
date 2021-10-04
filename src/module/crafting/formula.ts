import { PhysicalItemPF2e } from "@item";
import { Rarity } from "@module/data";
import { calculateDC } from "@module/dc";

export class CraftingFormula implements CraftingFormulaData {
    /** The difficulty class to craft this item */
    dc: number;

    constructor(private item: PhysicalItemPF2e, dc?: number) {
        this.dc = dc ?? calculateDC(item.level, { rarity: item.rarity });
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
}
