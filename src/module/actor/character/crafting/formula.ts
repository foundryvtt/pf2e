import { PhysicalItemPF2e } from "@item";
import { Coins, Price } from "@item/physical/data.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { Rarity } from "@module/data.ts";
import { calculateDC } from "@module/dc.ts";

class CraftingFormula implements CraftingFormulaData {
    /** The item to craft */
    item: PhysicalItemPF2e;

    /** The difficulty class to craft this item */
    dc: number;

    /** Some items can be created in multiples with a single crafting check */
    batchSize: number;

    /** Whether or not this formula is saved directly on the actor and can be deleted */
    deletable: boolean;

    /** The set of roll options form this formula's item */
    #options: Set<string> | null = null;

    constructor(
        item: PhysicalItemPF2e,
        { dc, batchSize, deletable = false }: { dc?: number; batchSize?: number; deletable?: boolean } = {},
    ) {
        this.item = item;
        this.dc =
            dc ??
            calculateDC(item.level, {
                rarity: item.rarity,
                pwol: game.pf2e.settings.variants.pwol.enabled,
            });

        /** Use the passed batch size if provided or otherwise according to the following */
        this.batchSize = Math.max(batchSize ?? 1, this.defaultBatchSize);

        /** Is the formula on the actor and therefore deletable? */
        this.deletable = deletable;
    }

    get options(): Set<string> {
        return (this.#options ??= new Set(this.item.getRollOptions("item")));
    }

    get uuid(): ItemUUID {
        return this.item.uuid;
    }

    get img(): ImageFilePath {
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

    get price(): Price {
        return this.item.price;
    }

    get cost(): Coins {
        return CoinsPF2e.fromPrice(this.price, this.batchSize);
    }

    get minimumBatchSize(): number {
        return this.item.system.price.per;
    }

    get defaultBatchSize(): number {
        const item = this.item;
        const isAmmo = item.isOfType("consumable") && item.isAmmo;
        const isMundaneAmmo = isAmmo && !item.isMagical;
        const isConsumable =
            (item.isOfType("consumable") && item.category !== "wand") ||
            (item.isOfType("weapon") && item.baseType === "alchemical-bomb");

        return Math.max(
            this.minimumBatchSize,
            isMundaneAmmo ? Math.clamp(item.system.price.per, 1, 10) : isConsumable && !isAmmo ? 4 : 1,
        );
    }

    get description(): string {
        return this.item.description;
    }
}

interface CraftingFormulaData {
    uuid: ItemUUID;
    sort?: number;
    dc?: number;
    batchSize?: number;
    deletable?: boolean;
}

export { CraftingFormula, type CraftingFormulaData };
