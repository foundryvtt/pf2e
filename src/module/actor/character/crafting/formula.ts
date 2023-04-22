import { ConsumablePF2e, PhysicalItemPF2e, WeaponPF2e } from "@item";
import { stackDefinitions } from "@item/physical/bulk.ts";
import { Coins, Price } from "@item/physical/data.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { Rarity } from "@module/data.ts";
import { calculateDC } from "@module/dc.ts";

export class CraftingFormula implements CraftingFormulaData {
    /** The difficulty class to craft this item */
    dc: number;

    /** Some items can be created in multiples with a single crafting check */
    batchSize: number;

    /** Whether or not this formula is saved directly on the actor and can be deleted */
    deletable: boolean;

    constructor(
        public item: PhysicalItemPF2e,
        { dc, batchSize, deletable = false }: { dc?: number; batchSize?: number; deletable?: boolean } = {}
    ) {
        this.dc =
            dc ??
            calculateDC(item.level, {
                rarity: item.rarity,
                proficiencyWithoutLevel: game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel",
            });

        /** Use the passed batch size if provided or otherwise according to the following */
        this.batchSize = Math.max(batchSize ?? 1, this.defaultBatchSize);

        /** Is the formula on the actor and therefore deletable? */
        this.deletable = deletable;
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
        return stackDefinitions[this.item.system.stackGroup ?? ""]?.size ?? 1;
    }

    get defaultBatchSize(): number {
        const { item } = this;
        const isMundaneAmmo = item instanceof ConsumablePF2e && item.isAmmunition && !item.isMagical;
        const isConsumable =
            (item instanceof ConsumablePF2e && item.category !== "wand") ||
            (item instanceof WeaponPF2e && item.baseType === "alchemical-bomb");

        return Math.max(this.minimumBatchSize, isMundaneAmmo ? 10 : isConsumable ? 4 : 1);
    }

    get description(): string {
        return this.item.description;
    }
}

export interface CraftingFormulaData {
    uuid: ItemUUID;
    sort?: number;
    dc?: number;
    batchSize?: number;
    deletable?: boolean;
}
